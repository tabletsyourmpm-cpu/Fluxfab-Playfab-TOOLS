import React from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function ProgressDisplay({ progress, total, successCount, failCount, isRunning }) {
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm">
      {/* Percentage */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
            {isRunning ? "Processing" : "Complete"}
          </span>
        </div>
        <span className="text-emerald-400 font-mono text-sm font-bold">
          {progress} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-300 text-sm font-mono">{successCount}</span>
          <span className="text-zinc-600 text-xs font-mono">created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-zinc-300 text-sm font-mono">{failCount}</span>
          <span className="text-zinc-600 text-xs font-mono">failed</span>
        </div>
        <div className="ml-auto">
          <span className="text-emerald-400 font-mono text-xl font-bold">{pct}%</span>
        </div>
      </div>
    </div>
  );
}