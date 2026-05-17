import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { buildSystemPrompt, getPersona } from "@/lib/persona";
import { buildMemoryContext, extractAndStoreMemories } from "@/lib/memory";
import { checkContentSafety, checkRateLimit } from "@/lib/safety";
import { redis, CACHE_KEYS } from "@/lib/redis";
import type { ApiResponse, ChatCompletionResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { sessionId, message, personaId } = await req.json();
    if (!message?.trim() || !personaId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "message and personaId are required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    // Rate limiting
    const rateLimitKey = CACHE_KEYS.rateLimitChat(userId);
    const rateLimit = await checkRateLimit(rateLimitKey, 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Too many messages. Please slow down." },
        { status: 429 }
      );
    }

    // Safety check
    const safety = await checkContentSafety(message, userId, ip);
    if (!safety.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: safety.reason },
        { status: 422 }
      );
    }

    // Check message quota
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    if (subscription && subscription.tier === "FREE") {
      if (subscription.messagesUsed >= subscription.monthlyMessageQuota) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error:
              "Monthly message quota reached. Upgrade for more messages.",
          },
          { status: 402 }
        );
      }
    }

    // Get or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId, userId },
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    }
    if (!chatSession) {
      const persona = await getPersona(personaId);
      if (!persona) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Persona not found" },
          { status: 404 }
        );
      }
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          personaId,
          moodAtStart: persona.currentMood,
        },
        include: { messages: [] },
      });
    }

    // Get persona and build context
    const [persona, memoryContext] = await Promise.all([
      getPersona(personaId),
      buildMemoryContext(userId, personaId, message),
    ]);

    if (!persona) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Persona not found" },
        { status: 404 }
      );
    }

    // Build conversation history
    const recentMessages = (chatSession.messages ?? [])
      .reverse()
      .slice(-10)
      .map((m: { role: string; content: string }) => ({
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      }));

    // Store user message
    const userMsg = await prisma.message.create({
      data: {
        sessionId: chatSession.id,
        userId,
        role: "USER",
        content: message,
      },
    });

    // Generate AI response
    const systemPrompt = buildSystemPrompt(persona, memoryContext);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages,
        { role: "user", content: message },
      ],
      temperature: 0.85,
      max_tokens: 500,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });

    const aiContent =
      completion.choices[0].message.content ??
      "Hey! Something went a bit glitchy on my end 😅 Try again?";
    const tokens = completion.usage?.total_tokens ?? 0;

    // Store AI response
    const aiMsg = await prisma.message.create({
      data: {
        sessionId: chatSession.id,
        userId,
        role: "ASSISTANT",
        content: aiContent,
        tokens,
        metadata: safety.warningMessage
          ? { warning: safety.warningMessage }
          : undefined,
      },
    });

    // Update session and subscription in parallel
    await Promise.all([
      prisma.chatSession.update({
        where: { id: chatSession.id },
        data: {
          messageCount: { increment: 2 },
          lastMessageAt: new Date(),
        },
      }),
      subscription
        ? prisma.subscription.update({
            where: { userId },
            data: { messagesUsed: { increment: 1 } },
          })
        : Promise.resolve(),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalMessages: { increment: 1 },
          lastActiveAt: new Date(),
          engagementScore: { increment: 0.1 },
        },
      }),
    ]);

    // Extract memories asynchronously (non-blocking)
    const allMessages = [
      ...recentMessages,
      { role: "user", content: message },
      { role: "assistant", content: aiContent },
    ];
    extractAndStoreMemories(userId, personaId, allMessages).catch(() => {});

    // Track analytics
    prisma.analyticsEvent
      .create({
        data: {
          userId,
          event: "chat_message",
          properties: {
            personaId,
            sessionId: chatSession.id,
            tokens,
            mood: persona.currentMood,
          },
        },
      })
      .catch(() => {});

    const response: ChatCompletionResponse = {
      message: {
        id: aiMsg.id,
        sessionId: chatSession.id,
        userId,
        role: "ASSISTANT",
        content: aiContent,
        tokens,
        isRead: false,
        isPremium: false,
        createdAt: aiMsg.createdAt,
        metadata: aiMsg.metadata as Record<string, unknown> | undefined,
      },
      persona: {
        id: persona.id,
        name: persona.name,
        currentMood: persona.currentMood,
      },
      memoryUpdated: true,
    };

    if (safety.warningMessage) {
      (response as Record<string, unknown>).warning = safety.warningMessage;
    }

    return NextResponse.json<ApiResponse<ChatCompletionResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[CHAT API]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (!sessionId) {
      const sessions = await prisma.chatSession.findMany({
        where: { userId: session.user.id },
        include: { persona: true, messages: { take: 1, orderBy: { createdAt: "desc" } } },
        orderBy: { lastMessageAt: "desc" },
        take: 20,
      });
      return NextResponse.json<ApiResponse>({ success: true, data: sessions });
    }

    const messages = await prisma.message.findMany({
      where: { sessionId, userId: session.user.id },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: messages });
  } catch (error) {
    console.error("[CHAT GET]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
