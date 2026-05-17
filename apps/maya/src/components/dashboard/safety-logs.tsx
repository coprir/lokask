"use client";

import { Shield, AlertTriangle, Ban, Eye } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { SafetyLog } from "@/types";

const ACTION_CONFIG = {
  WARN: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  BLOCK: { icon: Ban, color: "text-red-400", bg: "bg-red-400/10" },
  REPORT: { icon: Eye, color: "text-orange-400", bg: "bg-orange-400/10" },
  BAN: { icon: Ban, color: "text-red-600", bg: "bg-red-600/10" },
};

export function SafetyLogs({ logs }: { logs: SafetyLog[] }) {
  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
        <Shield className="h-4 w-4 text-cyber-pink" />
        <h3 className="font-semibold">Safety Logs</h3>
        <span className="ml-auto text-xs text-white/30">{logs.length} recent</span>
      </div>
      <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-white/30 text-sm">
            No safety events recorded
          </div>
        ) : (
          logs.map((log) => {
            const config = ACTION_CONFIG[log.action];
            return (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`p-1.5 rounded-lg ${config.bg} shrink-0`}>
                  <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{log.reason}</div>
                  {log.content && (
                    <div className="text-xs text-white/30 truncate mt-0.5">&ldquo;{log.content}&rdquo;</div>
                  )}
                  <div className="text-xs text-white/20 mt-1">{formatRelativeTime(log.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
