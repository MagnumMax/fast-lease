import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  console.warn("[workflow] manual transition attempt blocked", {
    dealId: id,
    userAgent: request.headers.get("user-agent") ?? null,
  });
  return NextResponse.json(
    {
      error:
        "Manual transitions are disabled. Завершите связанные задачи, чтобы продвинуть сделку.",
    },
    { status: 403 },
  );
}
