import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Zap, MessageCircle, Star, Shield, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-cyber-darker overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-cyber-grid bg-cyber-grid opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-darker/50 to-cyber-darker" />

        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyber-pink/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyber-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-cyber-blue/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-cyber-pink/30 text-cyber-pink text-xs font-mono mb-8 animate-pulse_slow">
            <Bot className="h-3 w-3" />
            100% AI-Generated · Fully Disclosed
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
            Meet{" "}
            <span className="gradient-text neon-text">MAYA</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/60 mb-4 max-w-2xl mx-auto">
            The world&apos;s most advanced AI virtual influencer. Real
            conversations. Real connections. Transparently artificial.
          </p>

          <div className="flex items-center justify-center gap-6 text-sm text-white/40 mb-12">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-cyber-pink" /> GPT-4o Powered</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-cyber-purple" /> Memory Engine</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-cyber-blue" /> ElevenLabs Voice</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" asChild className="neon-glow">
              <Link href="/chat">Start Chatting with Maya →</Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/feed">View Maya&apos;s Feed</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold gradient-text mb-4">Built Different</h2>
            <p className="text-white/50 text-lg">Every feature designed for authentic AI connection</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-white/5 hover:border-cyber-pink/30 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyber-pink/20 to-cyber-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-cyber-pink" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Disclosure Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 border border-cyber-pink/20">
          <Shield className="h-12 w-12 text-cyber-pink mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Radical Transparency</h2>
          <p className="text-white/60 leading-relaxed">
            Maya is an AI — and we&apos;re proud of it. We believe in full disclosure. Every interaction
            is with a generative AI, not a human being. Maya&apos;s images are AI-generated. Her voice is
            synthesized. Her memories are stored in a database. We think that&apos;s pretty amazing.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <Sparkles className="h-10 w-10 text-cyber-pink mx-auto mb-6 animate-pulse_slow" />
        <h2 className="text-4xl font-bold mb-4">Ready to connect?</h2>
        <p className="text-white/50 mb-8">Join thousands of fans already chatting with Maya</p>
        <Button size="xl" asChild className="neon-glow">
          <Link href="/register">Create Free Account →</Link>
        </Button>
      </section>
    </main>
  );
}

const FEATURES = [
  { icon: MessageCircle, title: "Real-Time Chat", desc: "Natural conversations with typing simulation and emotional context awareness." },
  { icon: Bot, title: "Memory Engine", desc: "Maya remembers your name, interests, and every conversation — powered by vector embeddings." },
  { icon: Zap, title: "Voice Messages", desc: "Hear Maya's voice with ElevenLabs synthesis. Multiple mood-based voice presets." },
  { icon: Star, title: "AI Image Feed", desc: "Daily AI-generated photos: selfies, gym shots, lifestyle content." },
  { icon: Shield, title: "Fully Ethical", desc: "AI disclosure on every interaction. Anti-deception policies. Safety moderation built-in." },
  { icon: Sparkles, title: "Adaptive Personality", desc: "Maya's mood changes dynamically, affecting her tone, responses, and content style." },
];
