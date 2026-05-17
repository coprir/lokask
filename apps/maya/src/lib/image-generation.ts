import { openai } from "./openai";
import { uploadImage } from "./cloudinary";
import { prisma } from "./prisma";
import type { AiPersona } from "@/types";

type ImageType = "selfie" | "gym" | "lifestyle" | "aesthetic" | "custom";

const IMAGE_PROMPTS: Record<ImageType, string> = {
  selfie:
    "Portrait photo of a young woman with glowing cyberpunk aesthetic, neon-lit background, professional photography, high quality, 8k resolution, social media style selfie",
  gym: "Athletic young woman in modern gym setting, cyberpunk neon lighting, fitness wear, motivational pose, professional photography, instagram style",
  lifestyle:
    "Lifestyle photo of stylish young woman in modern futuristic city, holographic elements, neon signs, editorial photography quality",
  aesthetic:
    "Artistic portrait with dark cyberpunk aesthetic, purple and pink neon tones, dreamy atmosphere, high fashion editorial",
  custom: "",
};

const STYLE_MODIFIERS = {
  cyberpunk: ", cyberpunk neon lighting, dark aesthetic, holographic elements",
  natural: ", natural lighting, warm tones, authentic feel",
  luxury: ", luxury setting, high-end fashion, editorial photography",
  minimal: ", minimalist background, clean aesthetic, modern",
  dreamy: ", dreamy bokeh, soft purple tones, ethereal atmosphere",
};

export async function generatePersonaImage(params: {
  persona: AiPersona;
  type: ImageType;
  style?: keyof typeof STYLE_MODIFIERS;
  customPrompt?: string;
}): Promise<{ imageUrl: string; contentId: string }> {
  const basePrompt =
    params.type === "custom" && params.customPrompt
      ? params.customPrompt
      : IMAGE_PROMPTS[params.type];

  const styleModifier = params.style ? STYLE_MODIFIERS[params.style] : "";
  const fullPrompt = `${basePrompt}${styleModifier}, photorealistic, professional photography, NOT real person`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    quality: "hd",
    style: "vivid",
  });

  const imageUrl = response.data[0].url!;
  const uploaded = await uploadImage(imageUrl, {
    folder: `maya-ai/personas/${params.persona.id}/${params.type}`,
  });

  const content = await prisma.generatedContent.create({
    data: {
      personaId: params.persona.id,
      type: "IMAGE",
      prompt: fullPrompt,
      imageUrl: uploaded.url,
      style: params.style,
      metadata: { type: params.type, originalUrl: imageUrl },
    },
  });

  return { imageUrl: uploaded.url, contentId: content.id };
}

export async function generateCaption(
  imageType: ImageType,
  persona: AiPersona,
  mood: string
): Promise<{ caption: string; hashtags: string[] }> {
  const { openai: ai } = await import("./openai");

  const response = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are ${persona.name}, an AI virtual influencer. Generate an Instagram-style caption for a ${imageType} photo. Current mood: ${mood}. Always include a subtle AI disclosure (e.g., "your fav AI 🤖"). Return JSON: { caption: string, hashtags: string[] }`,
      },
    ],
    temperature: 0.8,
    max_tokens: 200,
  });

  try {
    const content = response.choices[0].message.content?.trim() ?? "{}";
    return JSON.parse(content);
  } catch {
    return {
      caption: `Living my best digital life ✨ — your AI bestie ${persona.name} 🤖`,
      hashtags: ["#AIInfluencer", "#MayaAI", "#VirtualInfluencer", "#AI"],
    };
  }
}
