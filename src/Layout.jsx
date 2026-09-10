import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, Database, Radio } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-12">
          <div className="flex items-center gap-1.5 mr-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-400 text-xs font-mono tracking-widest">PLAYFAB</span>
          </div>
          <Link
            to={createPageUrl("Home")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              currentPageName === "Home"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            GENERATOR
          </Link>
          <Link
            to={createPageUrl("TitleManager")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              currentPageName === "TitleManager"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            TITLE MANAGER
          </Link>
          <Link
            to={createPageUrl("PhotonCCU")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              currentPageName === "PhotonCCU"
                ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            PHOTON CCU
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}