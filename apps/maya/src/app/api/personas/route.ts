import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const persona = await prisma.aiPersona.findUnique({ where: { slug } });
      if (!persona) return NextResponse.json<ApiResponse>({ success: false, error: "Persona not found" }, { status: 404 });
      return NextResponse.json<ApiResponse>({ success: true, data: persona });
    }

    const personas = await prisma.aiPersona.findMany({ where: { isActive: true } });
    return NextResponse.json<ApiResponse>({ success: true, data: personas });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load personas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const persona = await prisma.aiPersona.create({ data });
    await redis.del(`persona:${persona.slug}`);

    return NextResponse.json<ApiResponse>({ success: true, data: persona }, { status: 201 });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to create persona" }, { status: 500 });
  }
}
