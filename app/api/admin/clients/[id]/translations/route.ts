import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const { language_code, translations } = body;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("translations")
    .upsert(
      {
        client_id: id,
        language_code,
        translations,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,language_code" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
