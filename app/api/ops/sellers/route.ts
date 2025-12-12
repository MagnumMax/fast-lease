"use server";

import { NextResponse } from "next/server";

import { getOperationsSellers } from "@/lib/supabase/queries/operations-server";

export async function GET() {
  const sellers = await getOperationsSellers();
  return NextResponse.json(sellers);
}
