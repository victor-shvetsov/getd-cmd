import { NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

// Simple token — in production use a proper JWT. Fine for single-user agency admin.
const TOKEN = Buffer.from(`admin:${ADMIN_PASSWORD}`).toString("base64");

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ token: TOKEN });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader === `Bearer ${TOKEN}`) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
