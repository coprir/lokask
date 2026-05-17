import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPersona } from "@/lib/persona";
import { generatePersonaImage, generateCaption } from "@/lib/image-generation";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const schedules = await prisma.contentSchedule.findMany({
      where: { isCompleted: false, scheduledAt: { lte: now } },
      take: 10,
    });

    const results = await Promise.allSettled(
      schedules.map(async (schedule) => {
        const persona = await getPersona(schedule.personaId);
        if (!persona) return;

        if (schedule.type === "IMAGE") {
          const [{ imageUrl, contentId }, captionData] = await Promise.all([
            generatePersonaImage({ persona, type: "lifestyle" }),
            generateCaption("lifestyle", persona, persona.currentMood),
          ]);

          await Promise.all([
            prisma.feedPost.create({
              data: {
                personaId: schedule.personaId,
                imageUrl,
                caption: captionData.caption,
                hashtags: captionData.hashtags,
              },
            }),
            prisma.contentSchedule.update({
              where: { id: schedule.id },
              data: { isCompleted: true, completedAt: now, result: { imageUrl, contentId } },
            }),
          ]);
        }
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json<ApiResponse>({ success: true, data: { processed: schedules.length, succeeded } });
  } catch (error) {
    console.error("[CRON CONTENT]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Content schedule failed" }, { status: 500 });
  }
}
