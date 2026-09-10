import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Zap, Clock, AlertTriangle, CheckCircle2, Loader2, Shield } from "lucide-react";
import ProgressDisplay from "@/components/ProgressDisplay";
import LogConsole from "@/components/LogConsole";
import { generateCustomId, createPlayFabAccount } from "@/lib/playfabGenerator";
import { useSessionOverride } from "@/lib/sessionOverride";

export default function Home() {
  const [titleId, setTitleId] = useState("");
  const [amount, setAmount] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const abortRef = useRef(false);
  const cooldownRef = useRef(null);
  const { isOwnerOverride } = useSessionOverride();

  const addLog = useCallback((message, type = "info") => {
    setLogs((prev) => [...prev, { message, type, time: new Date() }]);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(120);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStart = async () => {
    const count = parseInt(amount);
    if (!titleId.trim()) {
      addLog("Error: Title ID is required", "error");
      return;
    }
    if (!count || count < 1 || count > 500) {
      addLog("Error: Amount must be between 1 and 500", "error");
      return;
    }

    abortRef.current = false;
    setIsRunning(true);
    setProgress(0);
    setTotal(count);
    setSuccessCount(0);
    setFailCount(0);
    setLogs([]);

    addLog(`Starting account generation for Title ID: ${titleId}`, "info");
    addLog(`Target: ${count} accounts`, "info");

    let successes = 0;
    let fails = 0;

    for (let i = 0; i < count; i++) {
      if (abortRef.current) {
        addLog("Process aborted by user", "warning");
        break;
      }

      const customId = generateCustomId();
      const accountName = displayName.trim() ? `${displayName.trim()}${count > 1 ? (i + 1) : ""}` : null;
      const result = await createPlayFabAccount(titleId.trim(), customId, accountName);

      if (result.success) {
        successes++;
        setSuccessCount(successes);
        if (successes % 10 === 0 || successes === 1) {
          const nameInfo = accountName ? ` ${accountName}` : "";
          const locationInfo = result.location ? ` | ${result.location.city}, ${result.location.country} (${result.location.ip})` : "";
          addLog(`Account #${i + 1}${nameInfo}${locationInfo} → ${result.playFabId}`, "success");
        }
      } else {
        fails++;
        setFailCount(fails);
        addLog(`Account #${i + 1} failed: ${result.error}`, "error");
        
        // Stop if fatal error (invalid title ID)
        if (result.fatal) {
          addLog("Fatal error detected - stopping process", "error");
          break;
        }
      }

      setProgress(i + 1);

      // Longer delay to avoid rate limiting (500ms between requests)
      if (i < count - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    addLog(`Completed: ${successes} created, ${fails} failed`, successes > 0 ? "success" : "error");
    setIsRunning(false);
    startCooldown();
  };

  const handleAbort = () => {
    abortRef.current = true;
  };

  const formatCooldown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isDisabled = isRunning || (!isOwnerOverride && cooldown > 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center px-4 py-8 md:py-16">
      {/* Glow background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono tracking-wider mb-4">
            <Shield className="w-3 h-3" />
            PLAYFAB TOOL
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Account <span className="text-emerald-400">Generator</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono">
            Bulk create PlayFab accounts instantly
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <div className="space-y-5">
            {/* Title ID Input */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                PlayFab Title ID
              </Label>
              <Input
                value={titleId}
                onChange={(e) => setTitleId(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C"
                disabled={isRunning}
                className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-12 text-lg tracking-widest focus:border-emerald-500/50 focus:ring-emerald-500/20"
                maxLength={10}
              />
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                Number of Accounts
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 500)) setAmount(v);
                  }}
                  placeholder="1 – 500"
                  disabled={isRunning}
                  min={1}
                  max={500}
                  className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-12 text-lg focus:border-emerald-500/50 focus:ring-emerald-500/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">
                  / 500
                </div>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                Display Name <span className="text-zinc-600">(Optional)</span>
              </Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Player"
                disabled={isRunning}
                className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-12 text-lg focus:border-emerald-500/50 focus:ring-emerald-500/20"
                maxLength={25}
              />
              <p className="text-zinc-600 text-xs font-mono">
                Multiple accounts will be numbered: Player1, Player2, etc.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  disabled={isDisabled}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {cooldown > 0 && !isOwnerOverride ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      COOLDOWN {formatCooldown(cooldown)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      START GENERATION
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleAbort}
                  variant="destructive"
                  className="w-full h-12 bg-red-600 hover:bg-red-500 font-bold text-sm tracking-wider"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  ABORT
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        {(isRunning || progress > 0) && (
          <div className="mt-6">
            <ProgressDisplay
              progress={progress}
              total={total}
              successCount={successCount}
              failCount={failCount}
              isRunning={isRunning}
            />
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-6">
            <LogConsole logs={logs} />
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-zinc-600 text-xs font-mono">
          Max 500 accounts per batch • 2 min cooldown between runs
        </div>
      </div>
    </div>
  );
}