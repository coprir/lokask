import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePersonaImage, generateCaption } from "@/lib/image-generation";
import { getPersona } from "@/lib/persona";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { personaId, type, style, customPrompt, publish = false } = await req.json();
    if (!personaId || !type) {
      return NextResponse.json<ApiResponse>({ success: false, error: "personaId and type required" }, { status: 400 });
    }

    const persona = await getPersona(personaId);
    if (!persona) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Persona not found" }, { status: 404 });
    }

    const [{ imageUrl, contentId }, captionData] = await Promise.all([
      generatePersonaImage({ persona, type, style, customPrompt }),
      generateCaption(type, persona, persona.currentMood),
    ]);

    if (publish) {
      const [feedPost] = await Promise.all([
        prisma.feedPost.create({
          data: {
            personaId,
            imageUrl,
            caption: captionData.caption,
            hashtags: captionData.hashtags,
          },
        }),
        prisma.generatedContent.update({
          where: { id: contentId },
          data: { isPublished: true, publishedAt: new Date() },
        }),
        prisma.aiPersona.update({
          where: { id: personaId },
          data: { postCount: { increment: 1 } },
        }),
      ]);
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { imageUrl, contentId, caption: captionData.caption, hashtags: captionData.hashtags, feedPostId: feedPost.id },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { imageUrl, contentId, caption: captionData.caption, hashtags: captionData.hashtags },
    });
  } catch (error) {
    console.error("[IMAGE GEN]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Image generation failed" }, { status: 500 });
  }
}
