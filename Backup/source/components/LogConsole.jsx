import React, { useRef, useEffect } from "react";
import { Terminal } from "lucide-react";

const typeColors = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

const typePrefixes = {
  info: "INFO",
  success: " OK ",
  error: " ERR",
  warning: "WARN",
};

export default function LogConsole({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50">
        <Terminal className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-zinc-500 text-xs font-mono uppercase tracking-wider">Console</span>
        <span className="text-zinc-700 text-xs font-mono ml-auto">{logs.length} entries</span>
      </div>

      {/* Logs */}
      <div className="max-h-56 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 text-xs font-mono leading-relaxed">
            <span className="text-zinc-700 shrink-0">
              {log.time.toLocaleTimeString("en-US", { hour12: false })}
            </span>
            <span className={`shrink-0 ${typeColors[log.type]}`}>
              [{typePrefixes[log.type]}]
            </span>
            <span className={typeColors[log.type]}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}