import { describe, expect, it } from "vitest";
import { keyBelongsTo, storageKey, uploadIdOf, uploadProblem } from "@/domain/uploads";

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
