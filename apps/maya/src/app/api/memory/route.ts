import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeMemory, retrieveRelevantMemories } from "@/lib/memory";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get("personaId") ?? "maya";
    const query = searchParams.get("query");

    if (query) {
      const memories = await retrieveRelevantMemories({
        userId: session.user.id,
        personaId,
        query,
      });
      return NextResponse.json<ApiResponse>({ success: true, data: memories });
    }

    const memories = await prisma.memory.findMany({
      where: { userId: session.user.id, personaId },
      orderBy: [{ type: "asc" }, { importance: "desc" }],
    });
    return NextResponse.json<ApiResponse>({ success: true, data: memories });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load memories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { personaId, type, key, value, importance } = await req.json();
    await storeMemory({ userId: session.user.id, personaId, type, key, value, importance });
    return NextResponse.json<ApiResponse>({ success: true, message: "Memory stored" });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to store memory" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("id");
    if (!memoryId) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Memory ID required" }, { status: 400 });
    }

    await prisma.memory.deleteMany({ where: { id: memoryId, userId: session.user.id } });
    return NextResponse.json<ApiResponse>({ success: true, message: "Memory deleted" });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to delete memory" }, { status: 500 });
  }
}
