import { z } from "zod";

const reservedHandles = new Set(["admin", "support", "system", "moderator", "root", "official"]);

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(4).max(32),
    handle: z
      .string()
      .trim()
      .min(3)
      .max(20)
      .regex(/^[a-z0-9_]+$/, "Handle may only use lowercase letters, numbers, and underscores")
      .refine((value) => !reservedHandles.has(value), "That handle is reserved"),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
