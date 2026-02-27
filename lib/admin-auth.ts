const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const TOKEN = Buffer.from(`admin:${ADMIN_PASSWORD}`).toString("base64");

export function isAdminRequest(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  return authHeader === `Bearer ${TOKEN}`;
}
