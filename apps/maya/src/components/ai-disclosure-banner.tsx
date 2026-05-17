"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";

export function AiDisclosureBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-cyber-pink/20 via-cyber-purple/20 to-cyber-blue/20 border-b border-cyber-pink/30">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/80">
          <Bot className="h-3.5 w-3.5 text-cyber-pink shrink-0" />
          <span>
            <span className="font-bold text-cyber-pink">AI DISCLOSURE:</span>{" "}
            Maya is a 100% AI-generated virtual influencer. All interactions are
            with an artificial intelligence, not a real person.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="ml-4 text-white/50 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
