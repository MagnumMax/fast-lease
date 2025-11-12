import { z } from "zod";

export const AdminCreateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters.").max(200),
  email: z.string().email("Enter a valid email address."),
  role: z.string(),
  sendInvite: z.boolean().optional().default(true),
});

export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;
