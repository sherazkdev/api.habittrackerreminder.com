import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/openapi";

export async function GET(request: NextRequest) {
  const audience = request.nextUrl.searchParams.get("audience") === "public" ? "public" : "full";
  return NextResponse.json(buildOpenApiSpec(audience), {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
