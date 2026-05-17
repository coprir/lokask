import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVoice, VOICE_PRESETS } from "@/lib/elevenlabs";
import { uploadAudio } from "@/lib/cloudinary";
import { checkRateLimit } from "@/lib/safety";
import { CACHE_KEYS } from "@/lib/redis";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check subscription allows voice
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.voiceEnabled) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Voice messages require a paid subscription. Upgrade to unlock!" },
        { status: 402 }
      );
    }

    // Rate limit: 10 voice messages per hour
    const rateLimit = await checkRateLimit(CACHE_KEYS.rateLimitVoice(userId), 10, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Voice rate limit reached. Try again later." },
        { status: 429 }
      );
    }

    const { text, personaId, preset = "default" } = await req.json();
    if (!text?.trim() || !personaId) {
      return NextResponse.json<ApiResponse>({ success: false, error: "text and personaId required" }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Text too long (max 500 chars)" }, { status: 400 });
    }

    // Generate voice
    const audioBuffer = await generateVoice(text, preset as keyof typeof VOICE_PRESETS);

    // Upload to Cloudinary
    const { url: audioUrl } = await uploadAudio(audioBuffer, {
      folder: `maya-ai/voice/${personaId}`,
    });

    // Store in DB
    const voiceMessage = await prisma.voiceMessage.create({
      data: {
        personaId,
        text,
        audioUrl,
        duration: Math.ceil(text.length / 15), // rough estimate
        voiceId: process.env.ELEVENLABS_VOICE_ID_MAYA ?? "default",
        preset,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { audioUrl, id: voiceMessage.id, duration: voiceMessage.duration },
    });
  } catch (error) {
    console.error("[VOICE API]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Voice generation failed" }, { status: 500 });
  }
}
