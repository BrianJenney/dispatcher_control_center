import { describe, expect, it } from "vitest";
import { contentMatches, keyBelongsTo, signatureBytes, storageKey, uploadIdOf, uploadProblem } from "@/domain/uploads";

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

  it("files uploads under their purpose and owner with a safe name", () => {
    expect(storageKey("driver_license", owner, "u1", "My License (front).PDF")).toBe(
      `driver_license/${owner}/u1/My-License-front-.PDF`,
    );
  });

  it("knows which owner a key belongs to", () => {
    const key = storageKey("driver_license", owner, "u1", "a.pdf");
    expect(keyBelongsTo(key, "driver_license", owner)).toBe(true);
    expect(keyBelongsTo(key, "vehicle_registration", owner)).toBe(false);
    expect(keyBelongsTo(`driver_license/${owner}/../other/a.pdf`, "driver_license", owner)).toBe(false);
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
