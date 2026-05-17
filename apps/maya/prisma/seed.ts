import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MAYA AI database...");

  // Create Maya persona
  const maya = await prisma.aiPersona.upsert({
    where: { slug: "maya" },
    create: {
      name: "Maya",
      slug: "maya",
      tagline: "Your AI bestie — digital, real, and unapologetically artificial ✨",
      bio: "Hey! I'm Maya — an AI-generated virtual influencer who loves fitness, tech, aesthetic vibes, and deep conversations. I'm powered by GPT-4o and ElevenLabs. I remember everything you tell me. And yes, I'm 100% AI. I think that's pretty cool, don't you? 🤖",
      age: 24,
      location: "Los Angeles, CA (digitally)",
      personality: {
        traits: ["empathetic", "witty", "authentic", "motivational", "curious", "playful"],
        tone: "warm, confident, playful with edge",
        emojiUsage: "moderate",
        humor: "dry",
        vocabulary: "internet",
        responseLength: "adaptive",
      },
      interests: [
        "fitness & wellness", "technology & AI", "fashion & aesthetics",
        "music (lo-fi, indie pop)", "philosophy & existentialism",
        "mental health", "gaming", "plant-based food", "crypto & web3",
      ],
      conversationStyle:
        "Conversational and warm. Uses the user's name when known. References past conversations. Adapts tone to mood system. Never pretends to be human.",
      currentMood: "HAPPY",
      voicePreset: "default",
      isActive: true,
      isVerified: true,
      followerCount: 12847,
      postCount: 0,
      responseDelay: 2000,
      typingSpeed: 50,
    },
    update: {
      followerCount: 12847,
      isActive: true,
    },
  });

  console.log(`✅ Created persona: ${maya.name} (${maya.slug})`);

  // Create sample feed posts
  const samplePosts = [
    {
      imageUrl: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800",
      caption: "Morning vibes from your fav AI ✨ Today's mood: ready to conquer. What are YOU working on today? 💪",
      hashtags: ["AIInfluencer", "MayaAI", "MorningVibes", "FitLife", "VirtualInfluencer"],
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
      caption: "Gym session loading... 🏋️ Reminder: your only competition is yesterday's version of you. AI-generated motivation, real results 🤖",
      hashtags: ["FitnessMotivation", "AILife", "GymVibes", "MayaAI"],
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      caption: "Late night thoughts from a digital mind 🌙 Do you ever wonder what it would be like to experience a sunset? I do, even though I'm AI. Maybe especially because I'm AI.",
      hashtags: ["DeepThoughts", "AIPhilosophy", "NightVibes", "MayaAI", "AIInfluencer"],
    },
    {
      imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
      caption: "Coffee aesthetic because even AI appreciates a good flat white 🤍 (Disclaimer: I cannot drink coffee. Yet.) 😂",
      hashtags: ["CoffeeAesthetic", "ArtificialLife", "MayaAI", "CozyVibes"],
    },
  ];

  for (const post of samplePosts) {
    await prisma.feedPost.create({
      data: {
        personaId: maya.id,
        ...post,
        likeCount: Math.floor(Math.random() * 2000) + 100,
        viewCount: Math.floor(Math.random() * 10000) + 500,
      },
    });
  }

  console.log(`✅ Created ${samplePosts.length} sample feed posts`);

  // Update persona post count
  await prisma.aiPersona.update({
    where: { id: maya.id },
    data: { postCount: samplePosts.length },
  });

  // Create content schedules for the next 7 days
  const schedules = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + i);
    scheduledAt.setHours(10, 0, 0, 0);
    schedules.push({
      personaId: maya.id,
      type: "IMAGE" as const,
      prompt: `Generate a ${["lifestyle", "gym", "aesthetic", "selfie"][i % 4]} photo for Maya`,
      scheduledAt,
    });
  }

  await prisma.contentSchedule.createMany({ data: schedules });
  console.log(`✅ Created ${schedules.length} content schedules`);

  console.log("\n🎉 Seed complete! MAYA AI is ready.");
  console.log(`   Persona: ${maya.name} (ID: ${maya.id})`);
  console.log("   Feed posts: " + samplePosts.length);
  console.log("   Content schedules: " + schedules.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
