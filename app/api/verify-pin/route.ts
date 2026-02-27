import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { slug, pin } = await request.json();

  if (!slug || !pin) {
    return NextResponse.json({ error: "Missing slug or pin" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("pin")
    .eq("slug", slug)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (client.pin !== pin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
