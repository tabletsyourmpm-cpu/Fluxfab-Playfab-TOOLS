import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Users, Coins, Package, LogOut, Eye, EyeOff } from "lucide-react";
import PlayersPanel from "@/components/titlemanager/PlayersPanel";
import CurrencyPanel from "@/components/titlemanager/CurrencyPanel";
import CatalogPanel from "@/components/titlemanager/CatalogPanel";

const TABS = [
  { id: "players", label: "Players", icon: Users },
  { id: "currency", label: "Currency", icon: Coins },
  { id: "catalog", label: "Catalog", icon: Package },
];

export default function TitleManager() {
  const [titleId, setTitleId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("players");
  const [showKey, setShowKey] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const connect = () => {
    if (!titleId.trim() || !secretKey.trim()) return;
    setCredentials({ titleId: titleId.trim(), secretKey: secretKey.trim() });
    setConnected(true);
  };

  const disconnect = () => {
    setConnected(false);
    setCredentials(null);
    setSecretKey("");
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Database className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Title Manager</h1>
            <p className="text-zinc-500 text-sm font-mono mt-1">Connect to manage your PlayFab title</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Title ID</Label>
              <Input
                value={titleId}
                onChange={(e) => setTitleId(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C"
                className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-11 tracking-widest"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Secret Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Your developer secret key"
                  onKeyDown={(e) => e.key === "Enter" && connect()}
                  className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-11 pr-10"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-zinc-600 text-xs font-mono">Found in PlayFab dashboard → Settings → Secret Keys</p>
            </div>

            <Button
              onClick={connect}
              disabled={!titleId.trim() || !secretKey.trim()}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-bold tracking-wider disabled:opacity-30"
            >
              CONNECT
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white font-mono">
              Title: <span className="text-emerald-400">{credentials.titleId}</span>
            </h1>
            <p className="text-zinc-600 text-xs font-mono mt-0.5">Connected to PlayFab Admin API</p>
          </div>
          <Button
            onClick={disconnect}
            variant="ghost"
            className="text-zinc-500 hover:text-red-400 text-xs font-mono gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            DISCONNECT
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono transition-all ${
                activeTab === id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm">
          {activeTab === "players" && <PlayersPanel titleId={credentials.titleId} secretKey={credentials.secretKey} />}
          {activeTab === "currency" && <CurrencyPanel titleId={credentials.titleId} secretKey={credentials.secretKey} />}
          {activeTab === "catalog" && <CatalogPanel titleId={credentials.titleId} secretKey={credentials.secretKey} />}
        </div>
      </div>
    </div>
  );
}