import crypto from "node:crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return sha256(token);
}

export function generateId(prefix = ""): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}
