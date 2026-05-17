import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const persona = await prisma.aiPersona.findFirst({ where: { isActive: true, slug: "maya" } });
    if (!persona) return NextResponse.json<ApiResponse>({ success: true, message: "No active persona" });

    const activeUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        onboardingDone: true,
      },
      take: 100,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${persona.name}, an AI virtual influencer. Generate a warm, engaging morning message to send to your fans. Keep it under 150 characters. Current mood: ${persona.currentMood}. Include an emoji. Don't use user's name (it's a broadcast).`,
        },
      ],
      temperature: 0.9,
    });

    const morningMessage = completion.choices[0].message.content ?? "Good morning! ☀️ Hope you have an amazing day ahead!";

    await Promise.all(
      activeUsers.map((user) =>
        prisma.notification.create({
          data: {
            userId: user.id,
            title: `${persona.name} sent you a morning message ☀️`,
            body: morningMessage,
            type: "message",
            metadata: { personaId: persona.id, type: "morning_message" },
          },
        })
      )
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { sent: activeUsers.length, message: morningMessage },
    });
  } catch (error) {
    console.error("[CRON MORNING]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Cron job failed" }, { status: 500 });
  }
}
