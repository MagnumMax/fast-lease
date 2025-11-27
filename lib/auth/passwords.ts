import { randomBytes } from "node:crypto";

export function generateRandomPassword(length = 18): string {
  return randomBytes(length).toString("base64url");
}
