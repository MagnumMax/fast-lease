import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset?: string[] }> },
) {
  const { asset: assetParam = [] } = await params;
  const assetSegments = assetParam ?? [];
  const assetPath = path.join(
    process.cwd(),
    "public",
    "beta",
    "assets",
    ...assetSegments,
  );

  try {
    const file = await fs.readFile(assetPath);
    const arrayBuffer = file.buffer.slice(
      file.byteOffset,
      file.byteOffset + file.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer]);
    const extension = path.extname(assetPath).toLowerCase();
    const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error) {
    console.error("Error reading beta asset:", error);
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
