import { describe, expect, it } from "vitest";
import {
  contentMatches,
  contentTypeOfKey,
  isPhotoPurpose,
  keyBelongsTo,
  servedFile,
  signatureBytes,
  storageKey,
  uploadIdOf,
  uploadOwners,
  uploadProblem,
} from "@/domain/uploads";

const megabyte = 1024 * 1024;

describe("uploadProblem", () => {
  it("accepts a PDF license up to 10 MB", () => {
    expect(uploadProblem("driver_license", { name: "license.pdf", type: "application/pdf", size: 10 * megabyte })).toBeNull();
  });

  it("refuses anything over 10 MB", () => {
    expect(uploadProblem("vehicle_registration", { name: "scan.png", type: "image/png", size: 10 * megabyte + 1 })).toBe(
      "Files must be 10 MB or smaller.",
    );
  });

  it("refuses other file types for documents", () => {
    expect(uploadProblem("driver_license", { name: "license.docx", type: "application/msword", size: 100 })).toBe(
      "Upload a PDF or an image (JPEG, PNG or WebP).",
    );
  });

  it("refuses a PDF as a photo", () => {
    expect(uploadProblem("driver_photo", { name: "me.pdf", type: "application/pdf", size: 100 })).toBe(
      "Use a JPEG, PNG or WebP photo.",
    );
  });

  it("holds a vehicle photo to the same photo types", () => {
    expect(uploadProblem("vehicle_photo", { name: "car.webp", type: "image/webp", size: 100 })).toBeNull();
    expect(uploadProblem("vehicle_photo", { name: "car.pdf", type: "application/pdf", size: 100 })).toBe("Use a JPEG, PNG or WebP photo.");
  });

  it("refuses an empty file", () => {
    expect(uploadProblem("driver_photo", { name: "me.png", type: "image/png", size: 0 })).toBe("That file is empty.");
  });
});

describe("contentMatches", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const text = (value: string) => new TextEncoder().encode(value);
  const pdf = text("%PDF-1.7\n%");
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d);
  const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1);
  const webp = text("RIFF\u0024\u0000\u0000\u0000WEBPVP8 ");
  const html = text("<html><script>alert(1)</script>");

  it("reads only as many bytes as the longest signature", () => {
    expect(signatureBytes).toBe(12);
  });

  it("accepts each allowed type when the bytes agree", () => {
    expect(contentMatches("application/pdf", pdf)).toBe(true);
    expect(contentMatches("image/png", png)).toBe(true);
    expect(contentMatches("image/jpeg", jpeg)).toBe(true);
    expect(contentMatches("image/webp", webp)).toBe(true);
  });

  it("refuses bytes that belong to another type", () => {
    expect(contentMatches("application/pdf", png)).toBe(false);
    expect(contentMatches("image/png", jpeg)).toBe(false);
    expect(contentMatches("image/jpeg", pdf)).toBe(false);
    expect(contentMatches("image/webp", text("RIFF\u0024\u0000\u0000\u0000WAVEfmt "))).toBe(false);
  });

  it("refuses markup dressed up as a document or photo", () => {
    for (const type of ["application/pdf", "image/png", "image/jpeg", "image/webp"]) {
      expect(contentMatches(type, html)).toBe(false);
    }
  });

  it("refuses a file shorter than its signature", () => {
    expect(contentMatches("image/png", png.subarray(0, 7))).toBe(false);
    expect(contentMatches("application/pdf", text("%PDF"))).toBe(false);
  });

  it("refuses a type outside the allowed list even when the bytes are fine", () => {
    expect(contentMatches("text/html", html)).toBe(false);
    expect(contentMatches("image/svg+xml", text("<svg xmlns"))).toBe(false);
    expect(contentMatches("toString", pdf)).toBe(false);
  });
});

describe("storage keys", () => {
  const owner = "4f1c2b8e-3a6d-4e2f-9b1a-7c5d8e9f0a1b";
  const license = { purpose: "driver_license" as const, ownerId: owner, fileName: "a.pdf", contentType: "application/pdf" };

  it("files uploads under their purpose and owner with a safe name", () => {
    expect(storageKey({ ...license, fileName: "My License (front).PDF" }, "u1")).toBe(`driver_license/${owner}/u1/My-License-front.pdf`);
  });

  it("ends every key with the extension of the declared type, whatever the file was called", () => {
    expect(storageKey({ ...license, fileName: "scan.html", contentType: "image/png" }, "u1")).toBe(`driver_license/${owner}/u1/scan.png`);
    expect(storageKey({ ...license, fileName: "photo", contentType: "image/jpeg" }, "u1")).toBe(`driver_license/${owner}/u1/photo.jpg`);
    expect(storageKey({ ...license, fileName: ".pdf" }, "u1")).toBe(`driver_license/${owner}/u1/file.pdf`);
  });

  it("knows which owner a key belongs to", () => {
    const key = storageKey(license, "u1");
    expect(keyBelongsTo(key, license)).toBe(true);
    expect(keyBelongsTo(key, { ...license, purpose: "vehicle_registration" })).toBe(false);
    expect(keyBelongsTo(`driver_license/${owner}/../other/a.pdf`, license)).toBe(false);
  });

  it("refuses a key whose extension does not match the declared type", () => {
    expect(keyBelongsTo(storageKey(license, "u1"), { ...license, contentType: "image/png" })).toBe(false);
  });
});

describe("contentTypeOfKey", () => {
  it("reads the type from the extension, in any case", () => {
    expect(contentTypeOfKey("driver_photo/o/u/me.PNG")).toBe("image/png");
    expect(contentTypeOfKey("driver_photo/o/u/me.jpeg")).toBe("image/jpeg");
    expect(contentTypeOfKey("driver_license/o/u/a.pdf")).toBe("application/pdf");
  });

  it("knows nothing about other or missing extensions", () => {
    expect(contentTypeOfKey("driver_photo/o/u/me.html")).toBeNull();
    expect(contentTypeOfKey("driver_photo/o/u/me")).toBeNull();
    expect(contentTypeOfKey("driver_photo/o/u/png")).toBeNull();
    expect(contentTypeOfKey("driver_photo/o.png/u/me")).toBeNull();
  });
});

describe("servedFile", () => {
  it("opens an allowed type in the browser under its own type", () => {
    expect(servedFile({ fileName: "license.pdf", contentType: "application/pdf" })).toEqual({
      contentType: "application/pdf",
      disposition: `inline; filename="license.pdf"; filename*=UTF-8''license.pdf`,
    });
  });

  it("downloads anything else as plain bytes so it can never run as a page", () => {
    for (const contentType of ["text/html", "image/svg+xml", null]) {
      const served = servedFile({ fileName: "x.html", contentType });
      expect(served.contentType).toBe("application/octet-stream");
      expect(served.disposition).toMatch(/^attachment; /);
    }
  });

  it("keeps quotes, line breaks and accents out of the plain name and encodes them in the full one", () => {
    const { disposition } = servedFile({ fileName: 'Renée "v2"\r\n(1).pdf', contentType: "application/pdf" });
    expect(disposition).toBe(`inline; filename="Ren_e _v2___(1).pdf"; filename*=UTF-8''Ren%C3%A9e%20%22v2%22%0D%0A%281%29.pdf`);
  });
});

describe("photo purposes and owners", () => {
  it("tells photos from documents", () => {
    expect(isPhotoPurpose("driver_photo")).toBe(true);
    expect(isPhotoPurpose("vehicle_photo")).toBe(true);
    expect(isPhotoPurpose("driver_license")).toBe(false);
    expect(isPhotoPurpose("vehicle_registration")).toBe(false);
  });

  it("files each upload under a driver or a vehicle", () => {
    expect(uploadOwners).toEqual({
      driver_license: "driver",
      vehicle_registration: "vehicle",
      driver_photo: "driver",
      vehicle_photo: "vehicle",
    });
  });
});

describe("uploadIdOf", () => {
  it("reads the upload id from a key", () => {
    expect(uploadIdOf("driver_photo/owner/abc/me.png")).toBe("abc");
    expect(uploadIdOf(null)).toBeNull();
  });
});

describe("recordId", () => {
  it("accepts a uuid and refuses anything else", async () => {
    const { recordId } = await import("@/domain/result");
    expect(recordId("4f1c2b8e-3a6d-4e2f-9b1a-7c5d8e9f0a1b")).toBe("4f1c2b8e-3a6d-4e2f-9b1a-7c5d8e9f0a1b");
    expect(recordId("../etc/passwd")).toBeNull();
    expect(recordId(["4f1c2b8e-3a6d-4e2f-9b1a-7c5d8e9f0a1b"])).toBeNull();
  });
});
