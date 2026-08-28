import { describe, expect, it } from "vitest";
import { isStrongPassword, validateNewPassword } from "@/lib/auth/password-policy";

describe("password policy", () => {
  it("rejects the weak seed-era password", () => {
    expect(isStrongPassword("admin12345")).toBe(false);
    expect(isStrongPassword("password")).toBe(false);
  });

  it("accepts a password with upper, lower, number, and special", () => {
    expect(isStrongPassword("Admin_123")).toBe(true);
  });

  it("requires confirmation to match and differ from the current password", () => {
    expect(validateNewPassword("Admin_123", "Admin_124").ok).toBe(false);
    expect(validateNewPassword("Admin_123", "Admin_123", "Admin_123").ok).toBe(false);
    expect(validateNewPassword("Admin_123", "Admin_123", "OldPass_1").ok).toBe(true);
  });
});
