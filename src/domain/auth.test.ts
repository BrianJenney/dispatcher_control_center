import { describe, expect, it } from "vitest";
import { appOrigins, inAppPath, safeRedirectPath, signInInput } from "@/domain/auth";

describe("signInInput", () => {
  it("asks for an email in plain language", () => {
    const result = signInInput.safeParse({ email: " ", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter your email address.");
  });

  it("rejects a malformed email", () => {
    const result = signInInput.safeParse({ email: "dispatcher", password: "x" });
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });

  it("asks for a password", () => {
    const result = signInInput.safeParse({ email: "a@example.com", password: "" });
    expect(result.error?.issues[0]?.message).toBe("Enter your password.");
  });

  it("trims the email", () => {
    expect(signInInput.parse({ email: " a@example.com ", password: "x" }).email).toBe("a@example.com");
  });
});

describe("safeRedirectPath", () => {
  it.each(["/", "/jobs", "/jobs?status=offer"])("keeps the in-app path %s", (path) => {
    expect(safeRedirectPath.parse(path)).toBe(path);
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "jobs", "", undefined, 42])(
    "sends %s back to the dashboard",
    (path) => {
      expect(safeRedirectPath.parse(path)).toBe("/");
    },
  );
});

describe("inAppPath", () => {
  it.each(["/", "/jobs/new"])("accepts %s", (path) => {
    expect(inAppPath.test(path)).toBe(true);
  });

  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "/jobs new"])("refuses %s", (path) => {
    expect(inAppPath.test(path)).toBe(false);
  });
});

describe("appOrigins", () => {
  it("uses the configured address and trusts nothing else when it is the only one", () => {
    expect(appOrigins({ configured: "https://app.example.com" })).toEqual({
      baseUrl: "https://app.example.com",
      trusted: ["https://app.example.com"],
    });
  });

  it("falls back to the branch address, then the deployment address, when nothing is configured", () => {
    expect(appOrigins({ branch: "app-git-fix.vercel.app", deployment: "app-abc123.vercel.app" })).toEqual({
      baseUrl: "https://app-git-fix.vercel.app",
      trusted: ["https://app-git-fix.vercel.app", "https://app-abc123.vercel.app"],
    });
    expect(appOrigins({ deployment: "app-abc123.vercel.app" }).baseUrl).toBe("https://app-abc123.vercel.app");
  });

  it("trusts every address the deployment can be reached on, without repeats", () => {
    const result = appOrigins({ configured: "https://app-git-fix.vercel.app", branch: "app-git-fix.vercel.app", deployment: "app-abc123.vercel.app" });
    expect(result.baseUrl).toBe("https://app-git-fix.vercel.app");
    expect(result.trusted).toEqual(["https://app-git-fix.vercel.app", "https://app-abc123.vercel.app"]);
  });

  it("reports no address when none is known", () => {
    expect(appOrigins({})).toEqual({ baseUrl: null, trusted: [] });
  });
});
