"use server";

import { NextResponse } from "next/server";

import { getOperationsClients } from "@/lib/supabase/queries/operations-server";

export async function GET() {
  const clients = await getOperationsClients();
  return NextResponse.json(clients);
}
