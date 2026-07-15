import { describe, expect, it } from "vitest";
import { signupSchema } from "@/features/auth/validation";

describe("signup schema", () => {
  it("accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      displayName: "Nova Vale",
      handle: "novavale",
      email: "nova@example.com",
      password: "password123",
      confirmPassword: "password123",
      acceptTerms: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects reserved handles", () => {
    const result = signupSchema.safeParse({
      displayName: "Admin",
      handle: "admin",
      email: "nova@example.com",
      password: "password123",
      confirmPassword: "password123",
      acceptTerms: true,
    });

    expect(result.success).toBe(false);
  });
});
