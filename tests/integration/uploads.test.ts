import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDocument } from "@/app/api/documents/[id]/route";
import { GET as getDriverPhoto } from "@/app/api/drivers/[id]/photo/route";
import { GET as getVehiclePhoto } from "@/app/api/vehicles/[id]/photo/route";
import { db } from "@/db/client";
import { documents, drivers, vehicles } from "@/db/schema";
import type { UploadPurpose } from "@/domain/uploads";
import { reportError } from "@/observability";
import { deleteDocument, prepareUpload, saveUpload } from "@/server/actions/uploads";
import { getVehicleProfile } from "@/server/queries/people";
import { storage } from "@/server/storage";
import { insertDriver, insertVehicle } from "./database";
import { signInAsDemoUser, signOut } from "./session";

vi.mock(import("@/observability"), async (original) => ({ ...(await original()), reportError: vi.fn() }));
vi.mock(import("next/server"), async (original) => ({ ...(await original()), connection: () => Promise.resolve() }));

beforeEach(async () => {
  await signInAsDemoUser();
  vi.mocked(reportError).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function beforeEachStorageDelete(look: () => Promise<void>) {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const method = input instanceof Request ? input.method : init?.method;
    if (method === "DELETE") await look();
    return realFetch(input, init);
  });
}

function storageRefusesDeletes() {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const method = input instanceof Request ? input.method : init?.method;
    return method === "DELETE" ? Promise.resolve(new Response(null, { status: 503 })) : realFetch(input, init);
  });
}

const pdf = Buffer.from("%PDF-1.4 test license");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const html = Buffer.from("<html><body><script>document.title = 'owned'</script></body></html>");
const notWhatItSays = "That file is not the PDF or image it says it is. Upload the original file.";

type Upload = { purpose: UploadPurpose; ownerId: string; fileName: string; contentType: string; body: Buffer; declaredSize?: number };

async function put(upload: Upload) {
  const request = {
    purpose: upload.purpose,
    ownerId: upload.ownerId,
    fileName: upload.fileName,
    contentType: upload.contentType,
    sizeBytes: upload.declaredSize ?? upload.body.length,
  };
  const prepared = await prepareUpload(request);
  if (!prepared.ok) throw new Error(prepared.message);
  await fetch(prepared.data.url, { method: "PUT", body: new Uint8Array(upload.body), headers: { "content-type": upload.contentType } });
  return { ...request, key: prepared.data.key };
}

async function upload(details: Upload) {
  const request = await put(details);
  return { request, key: request.key, saved: await saveUpload(request) };
}

function license(ownerId: string, body: Buffer = pdf) {
  return upload({ purpose: "driver_license", ownerId, fileName: "license.pdf", contentType: "application/pdf", body, declaredSize: pdf.length });
}

function photo(ownerId: string, body: Buffer = png) {
  return upload({ purpose: "driver_photo", ownerId, fileName: "me.png", contentType: "image/png", body });
}

function vehiclePhoto(ownerId: string, body: Buffer = png) {
  return upload({ purpose: "vehicle_photo", ownerId, fileName: "car.png", contentType: "image/png", body });
}

async function vehiclePhotoKey(vehicleId: string) {
  const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId), columns: { photoKey: true } });
  return vehicle?.photoKey ?? null;
}

describe("uploads", () => {
  it("stores a license and records it", async () => {
    const driverId = await insertDriver();
    const { saved, key } = await license(driverId);
    expect(saved.ok).toBe(true);
    const row = await db.query.documents.findFirst({ where: eq(documents.storageKey, key) });
    expect(row).toMatchObject({ kind: "driver_license", driverId, vehicleId: null, sizeBytes: pdf.length });
    expect(await storage.describe(key)).toMatchObject({ sizeBytes: pdf.length });
  });

  it("refuses files over 10 MB before signing anything", async () => {
    const driverId = await insertDriver();
    const result = await prepareUpload({
      purpose: "driver_license",
      ownerId: driverId,
      fileName: "big.pdf",
      contentType: "application/pdf",
      sizeBytes: 10 * 1024 * 1024 + 1,
    });
    expect(result).toMatchObject({ ok: false, fieldErrors: { sizeBytes: ["Files must be 10 MB or smaller."] } });
  });

  it("rejects a file whose stored size differs from what was declared, and removes it", async () => {
    const driverId = await insertDriver();
    const { saved, key } = await license(driverId, Buffer.concat([pdf, Buffer.from("extra")]));
    expect(saved).toMatchObject({ ok: false, message: "The file changed while uploading. Try again." });
    expect(await storage.describe(key)).toBeNull();
  });

  it("refuses to record someone else's upload", async () => {
    const owner = await insertDriver();
    const other = await insertDriver();
    const { request, key } = await license(owner);
    const result = await saveUpload({ ...request, ownerId: other, key });
    expect(result).toMatchObject({ ok: false, message: "That upload does not belong here." });
  });

  it("reports an upload that never arrived", async () => {
    const driverId = await insertDriver();
    const request = { purpose: "driver_license" as const, ownerId: driverId, fileName: "x.pdf", contentType: "application/pdf", sizeBytes: 10 };
    const prepared = await prepareUpload(request);
    if (!prepared.ok) throw new Error(prepared.message);
    expect(await saveUpload({ ...request, key: prepared.data.key })).toMatchObject({
      ok: false,
      message: "The upload did not finish. Try again.",
    });
  });

  it("deletes the row and the stored file", async () => {
    const driverId = await insertDriver();
    const { key } = await license(driverId);
    const row = await db.query.documents.findFirst({ where: eq(documents.storageKey, key) });
    expect(await deleteDocument({ documentId: row?.id ?? "" })).toEqual({ ok: true, data: { fileName: "license.pdf" } });
    expect(await storage.describe(key)).toBeNull();
    expect(await deleteDocument({ documentId: row?.id ?? "" })).toMatchObject({ ok: false, message: "That document was already deleted." });
  });
});

describe("vehicle photos", () => {
  it("puts the photo on the vehicle and shows it on the vehicle page", async () => {
    const vehicleId = await insertVehicle();
    const { saved, key } = await vehiclePhoto(vehicleId);
    expect(saved).toEqual({ ok: true, data: { id: vehicleId } });
    expect(await vehiclePhotoKey(vehicleId)).toBe(key);
    expect(await db.query.documents.findFirst({ where: eq(documents.storageKey, key) })).toBeUndefined();
    expect((await getVehicleProfile(vehicleId))?.photoVersion).toBe(key.split("/")[2]);
  });

  it("refuses a photo for a vehicle that does not exist", async () => {
    const result = await prepareUpload({
      purpose: "vehicle_photo",
      ownerId: crypto.randomUUID(),
      fileName: "car.png",
      contentType: "image/png",
      sizeBytes: png.length,
    });
    expect(result).toMatchObject({ ok: false, message: "That vehicle no longer exists." });
  });

  it("refuses a PDF as a vehicle photo before signing anything", async () => {
    const vehicleId = await insertVehicle();
    const result = await prepareUpload({ purpose: "vehicle_photo", ownerId: vehicleId, fileName: "car.pdf", contentType: "application/pdf", sizeBytes: 10 });
    expect(result).toMatchObject({ ok: false, fieldErrors: { contentType: ["Use a JPEG, PNG or WebP photo."] } });
  });

  it("refuses a web page labelled as a vehicle photo and keeps the old photo", async () => {
    const vehicleId = await insertVehicle();
    const first = await vehiclePhoto(vehicleId);
    const { saved, key } = await upload({ purpose: "vehicle_photo", ownerId: vehicleId, fileName: "car.jpg", contentType: "image/jpeg", body: html });
    expect(saved).toMatchObject({ ok: false, message: notWhatItSays });
    expect(await storage.describe(key)).toBeNull();
    expect(await vehiclePhotoKey(vehicleId)).toBe(first.key);
  });

  it("removes a replaced vehicle photo only after the vehicle points at the new one", async () => {
    const vehicleId = await insertVehicle();
    const first = await vehiclePhoto(vehicleId);
    const second = await put({ purpose: "vehicle_photo", ownerId: vehicleId, fileName: "car.png", contentType: "image/png", body: png });
    const photoSeenFromOutside: (string | null)[] = [];
    beforeEachStorageDelete(async () => {
      photoSeenFromOutside.push(await vehiclePhotoKey(vehicleId));
    });
    expect((await saveUpload(second)).ok).toBe(true);
    expect(photoSeenFromOutside).toEqual([second.key]);
    vi.restoreAllMocks();
    expect(await storage.describe(first.key)).toBeNull();
    expect(await storage.describe(second.key)).not.toBeNull();
  });

  it("will not file a driver's photo under a vehicle", async () => {
    const vehicleId = await insertVehicle();
    const driverId = await insertDriver();
    const { request, key } = await photo(driverId);
    const result = await saveUpload({ ...request, purpose: "vehicle_photo", ownerId: vehicleId, key });
    expect(result).toMatchObject({ ok: false, message: "That upload does not belong here." });
    expect(await vehiclePhotoKey(vehicleId)).toBeNull();
  });
});

describe("spoofed content", () => {
  it("refuses a web page labelled as a PDF and removes it", async () => {
    const driverId = await insertDriver();
    const { saved, key } = await upload({
      purpose: "driver_license",
      ownerId: driverId,
      fileName: "license.pdf",
      contentType: "application/pdf",
      body: html,
    });
    expect(saved).toEqual({ ok: false, message: notWhatItSays, fieldErrors: {} });
    expect(await storage.describe(key)).toBeNull();
    expect(await db.query.documents.findFirst({ where: eq(documents.storageKey, key) })).toBeUndefined();
  });

  it("refuses a PDF labelled as a PNG", async () => {
    const driverId = await insertDriver();
    const { saved, key } = await upload({ purpose: "driver_license", ownerId: driverId, fileName: "scan.png", contentType: "image/png", body: pdf });
    expect(saved).toMatchObject({ ok: false, message: notWhatItSays });
    expect(await storage.describe(key)).toBeNull();
  });

  it("refuses a web page labelled as a driver photo and keeps the old photo", async () => {
    const driverId = await insertDriver();
    const first = await photo(driverId);
    expect(first.saved.ok).toBe(true);
    const { saved, key } = await upload({ purpose: "driver_photo", ownerId: driverId, fileName: "me.jpg", contentType: "image/jpeg", body: html });
    expect(saved).toMatchObject({ ok: false, message: notWhatItSays });
    expect(await storage.describe(key)).toBeNull();
    expect(await storage.describe(first.key)).not.toBeNull();
  });

  it("accepts a real PNG as a document", async () => {
    const driverId = await insertDriver();
    const { saved } = await upload({ purpose: "driver_license", ownerId: driverId, fileName: "scan.png", contentType: "image/png", body: png });
    expect(saved.ok).toBe(true);
  });
});

describe("storage failures", () => {
  it("still deletes the document when storage refuses, and reports the leftover file", async () => {
    const driverId = await insertDriver();
    const { key } = await license(driverId);
    const row = await db.query.documents.findFirst({ where: eq(documents.storageKey, key) });
    storageRefusesDeletes();
    expect(await deleteDocument({ documentId: row?.id ?? "" })).toEqual({ ok: true, data: { fileName: "license.pdf" } });
    vi.restoreAllMocks();
    expect(await db.query.documents.findFirst({ where: eq(documents.storageKey, key) })).toBeUndefined();
    expect(vi.mocked(reportError)).toHaveBeenCalledWith(new Error(`Storage refused to delete ${key} with status 503.`));
  });

  it("still gives the plain message for a spoofed file when storage cannot remove it", async () => {
    const driverId = await insertDriver();
    const request = await put({ purpose: "driver_license", ownerId: driverId, fileName: "license.pdf", contentType: "application/pdf", body: html });
    storageRefusesDeletes();
    expect(await saveUpload(request)).toMatchObject({ ok: false, message: notWhatItSays });
    expect(vi.mocked(reportError)).toHaveBeenCalledOnce();
  });
});

describe("delete ordering", () => {
  it("removes a document's file only after the row is gone for everyone", async () => {
    const driverId = await insertDriver();
    const { key } = await license(driverId);
    const row = await db.query.documents.findFirst({ where: eq(documents.storageKey, key) });
    const rowsSeenFromOutside: number[] = [];
    beforeEachStorageDelete(async () => {
      rowsSeenFromOutside.push((await db.select({ id: documents.id }).from(documents).where(eq(documents.storageKey, key))).length);
    });
    expect((await deleteDocument({ documentId: row?.id ?? "" })).ok).toBe(true);
    expect(rowsSeenFromOutside).toEqual([0]);
    vi.restoreAllMocks();
    expect(await storage.describe(key)).toBeNull();
  });

  it("removes a replaced photo only after the driver points at the new one", async () => {
    const driverId = await insertDriver();
    const first = await photo(driverId);
    const second = await put({ purpose: "driver_photo", ownerId: driverId, fileName: "me.png", contentType: "image/png", body: png });
    const photoSeenFromOutside: (string | null)[] = [];
    beforeEachStorageDelete(async () => {
      const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, driverId), columns: { photoKey: true } });
      photoSeenFromOutside.push(driver?.photoKey ?? null);
    });
    expect((await saveUpload(second)).ok).toBe(true);
    expect(photoSeenFromOutside).toEqual([second.key]);
    vi.restoreAllMocks();
    expect(await storage.describe(first.key)).toBeNull();
    expect(await storage.describe(second.key)).not.toBeNull();
  });
});

describe("saving the same upload twice", () => {
  async function documentsStoredAt(key: string) {
    return (await db.select({ id: documents.id }).from(documents).where(eq(documents.storageKey, key))).length;
  }

  it("records the document once and answers the repeat with the same id", async () => {
    const driverId = await insertDriver();
    const { request, saved } = await license(driverId);
    expect(saved.ok).toBe(true);
    expect(await saveUpload(request)).toEqual(saved);
    expect(await documentsStoredAt(request.key)).toBe(1);
  });

  it("records the document once when both saves arrive together", async () => {
    const driverId = await insertDriver();
    const request = await put({ purpose: "driver_license", ownerId: driverId, fileName: "license.pdf", contentType: "application/pdf", body: pdf });
    const [first, second] = await Promise.all([saveUpload(request), saveUpload(request)]);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(await documentsStoredAt(request.key)).toBe(1);
  });

  it("keeps a photo that is saved twice", async () => {
    const driverId = await insertDriver();
    const { request } = await photo(driverId);
    expect(await saveUpload(request)).toEqual({ ok: true, data: { id: driverId } });
    expect(await storage.describe(request.key)).not.toBeNull();
    const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, driverId), columns: { photoKey: true } });
    expect(driver?.photoKey).toBe(request.key);
  });
});

describe("serving stored files", () => {
  type FileRoute = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

  function open(route: FileRoute, id: string) {
    return route(new Request("http://localhost/file"), { params: Promise.resolve({ id }) });
  }

  async function savedLicense() {
    const { saved } = await license(await insertDriver());
    if (!saved.ok) throw new Error(saved.message);
    return saved.data.id;
  }

  it("serves the PDF from the app itself, so no link to the file leaves it", async () => {
    const response = await open(getDocument, await savedLicense());
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(`inline; filename="license.pdf"; filename*=UTF-8''license.pdf`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
  });

  it("refuses a signed out visitor", async () => {
    const documentId = await savedLicense();
    signOut();
    expect((await open(getDocument, documentId)).status).toBe(401);
  });

  it("serves a driver photo as the image type it was saved as", async () => {
    const driverId = await insertDriver();
    await photo(driverId);
    const file = await open(getDriverPhoto, driverId);
    expect(file.headers.get("content-type")).toBe("image/png");
    expect(file.headers.get("content-disposition")).toMatch(/^inline; filename="me\.png"/);
    expect(file.headers.get("cache-control")).toBe("private, max-age=3600");
  });

  it("serves a vehicle photo from the app, cached only in the viewer's browser", async () => {
    const vehicleId = await insertVehicle();
    await vehiclePhoto(vehicleId);
    const file = await open(getVehiclePhoto, vehicleId);
    expect(file.status).toBe(200);
    expect(file.headers.get("location")).toBeNull();
    expect(file.headers.get("content-type")).toBe("image/png");
    expect(file.headers.get("content-disposition")).toMatch(/^inline; filename="car\.png"/);
    expect(file.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(Buffer.from(await file.arrayBuffer())).toEqual(png);
  });

  it("refuses a vehicle photo to a signed out visitor", async () => {
    const vehicleId = await insertVehicle();
    await vehiclePhoto(vehicleId);
    signOut();
    expect((await open(getVehiclePhoto, vehicleId)).status).toBe(401);
  });

  it("answers not found for a vehicle with no photo", async () => {
    expect((await open(getVehiclePhoto, await insertVehicle())).status).toBe(404);
  });
});
