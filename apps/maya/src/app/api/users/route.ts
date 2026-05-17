import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: user });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to load user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, timezone, preferredLanguage } = await req.json();
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(timezone && { timezone }),
        ...(preferredLanguage && { preferredLanguage }),
        onboardingDone: true,
      },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: user });
  } catch (error) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
