import { vi } from "vitest";

vi.mock("@/server/session", () => ({ currentUser: vi.fn() }));
