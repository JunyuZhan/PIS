import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/database";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const paramsData = await params;
  const { slug } = paramsData;

  const db = await createClient();
  const albumResult = await db
    .from("albums")
    .select("id, title, allow_download, allow_share, is_public")
    .eq("slug", slug)
    .single();

  if (albumResult.error || !albumResult.data) {
    return NextResponse.json({ error: "相册不存在" }, { status: 404 });
  }

  return NextResponse.json(albumResult.data);
}
