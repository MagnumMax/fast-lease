"use server";

import { NextResponse } from "next/server";

import { getOperationsCars } from "@/lib/supabase/queries/operations-server";

export async function GET() {
  const cars = await getOperationsCars();
  return NextResponse.json(cars);
}
