export interface VoicePreset {
  voice_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

export const VOICE_PRESETS: Record<string, VoicePreset> = {
  default: {
    voice_id: process.env.ELEVENLABS_VOICE_ID_MAYA ?? "21m00Tcm4TlvDq8ikWAM",
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.5,
    use_speaker_boost: true,
  },
  excited: {
    voice_id: process.env.ELEVENLABS_VOICE_ID_MAYA ?? "21m00Tcm4TlvDq8ikWAM",
    stability: 0.3,
    similarity_boost: 0.9,
    style: 0.8,
    use_speaker_boost: true,
  },
  chill: {
    voice_id: process.env.ELEVENLABS_VOICE_ID_MAYA ?? "21m00Tcm4TlvDq8ikWAM",
    stability: 0.8,
    similarity_boost: 0.7,
    style: 0.2,
    use_speaker_boost: false,
  },
  flirty: {
    voice_id: process.env.ELEVENLABS_VOICE_ID_MAYA ?? "21m00Tcm4TlvDq8ikWAM",
    stability: 0.4,
    similarity_boost: 0.85,
    style: 0.7,
    use_speaker_boost: true,
  },
};

export async function generateVoice(
  text: string,
  preset: keyof typeof VOICE_PRESETS = "default"
): Promise<Buffer> {
  const config = VOICE_PRESETS[preset] ?? VOICE_PRESETS.default;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: config.stability,
          similarity_boost: config.similarity_boost,
          style: config.style,
          use_speaker_boost: config.use_speaker_boost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
