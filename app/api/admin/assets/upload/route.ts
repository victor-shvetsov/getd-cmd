import { put } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("clientId") as string;
    const section = formData.get("section") as string; // brand_kit | content | website

    if (!file || !clientId || !section) {
      return NextResponse.json(
        { error: "Missing file, clientId, or section" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `assets/${clientId}/${section}/${Date.now()}-${file.name}`;

    const blob = await put(path, file, { access: "public" });

    // For images, thumbnail_url = file_url (browser can resize)
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"].includes(ext);

    return NextResponse.json({
      url: blob.url,
      file_type: ext,
      file_size: file.size,
      is_image: isImage,
      thumbnail_url: isImage ? blob.url : null,
    });
  } catch (error) {
    console.error("Asset upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
