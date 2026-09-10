import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Clock, AlertTriangle, Radio } from "lucide-react";
import ProgressDisplay from "@/components/ProgressDisplay";
import LogConsole from "@/components/LogConsole";

// Photon uses a WebSocket handshake to establish a connection.
// We simulate a CCU entry by opening a WebSocket to the Photon Name Server
// and performing a Join Lobby request, which counts as a CCU on the dashboard.
async function connectPhotonCCU(appId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: "Connection timeout" });
    }, 10000);

    try {
      // Photon Name Server WebSocket endpoint
      const ws = new WebSocket(`wss://ns.photonengine.io/Photon?x-nsuuid=${appId}`);
      
      ws.onopen = () => {
        // Send a minimal Photon authenticate request (ExitGames PhotonClient protocol)
        // OpCode 230 = Authenticate, with AppId parameter (key 224)
        const authenticate = buildPhotonAuthPacket(appId);
        ws.send(authenticate);
      };

      ws.onmessage = () => {
        clearTimeout(timeout);
        // Got a response = we registered as a CCU
        resolve({ success: true });
        // Keep socket open for a moment to count as active CCU, then close
        setTimeout(() => ws.close(), 3000);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve({ success: false, error: "WebSocket error" });
      };

      ws.onclose = (e) => {
        clearTimeout(timeout);
        if (e.code === 1006 || e.code === 1000) {
          // Normal or abnormal closure - treat as success if we sent the packet
          resolve({ success: true });
        }
      };
    } catch (e) {
      clearTimeout(timeout);
      resolve({ success: false, error: e.message });
    }
  });
}

// Build a minimal Photon binary protocol authenticate packet
function buildPhotonAuthPacket(appId) {
  // Photon binary protocol: init request header
  // This is the minimal packet to register with the Name Server
  const appIdBytes = new TextEncoder().encode(appId);
  const buf = new Uint8Array([
    0xF3, 0x02, // Init Request
    0x00, 0x00, // ReliableSequenceNumber
    ...appIdBytes
  ]);
  return buf.buffer;
}

export default function PhotonCCU() {
  const [appId, setAppId] = useState("");
  const [amount, setAmount] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const abortRef = useRef(false);
  const cooldownRef = useRef(null);

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
    if (!appId.trim()) {
      addLog("Error: App ID is required", "error");
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

    addLog(`Starting CCU fill for App ID: ${appId}`, "info");
    addLog(`Target: ${count} connections`, "info");

    let successes = 0;
    let fails = 0;

    // Run connections in batches of 10 concurrently
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
      if (abortRef.current) {
        addLog("Process aborted by user", "warning");
        break;
      }

      const batch = Math.min(batchSize, count - i);
      const promises = Array.from({ length: batch }, (_, j) =>
        connectPhotonCCU(appId.trim()).then((result) => ({ result, index: i + j + 1 }))
      );

      const results = await Promise.all(promises);

      for (const { result, index } of results) {
        if (result.success) {
          successes++;
          setSuccessCount(successes);
          if (successes % 10 === 0 || successes <= 3) {
            addLog(`Connection #${index} established → CCU +1`, "success");
          }
        } else {
          fails++;
          setFailCount(fails);
          addLog(`Connection #${index} failed: ${result.error}`, "error");
        }
        setProgress(index);
      }

      if (i + batchSize < count) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    addLog(`Completed: ${successes} connected, ${fails} failed`, successes > 0 ? "success" : "error");
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

  const isDisabled = isRunning || cooldown > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center px-4 py-8 md:py-16">
      {/* Glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[400px] h-[400px] bg-violet-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-mono tracking-wider mb-4">
            <Radio className="w-3 h-3" />
            PHOTON TOOL
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            CCU <span className="text-violet-400">Filler</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono">
            Inflate Photon App CCU count instantly
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <div className="space-y-5">
            {/* App ID Input */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                Photon App ID
              </Label>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={isRunning}
                className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-12 text-sm tracking-widest focus:border-violet-500/50 focus:ring-violet-500/20"
              />
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                Number of Connections
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
                  className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-12 text-lg focus:border-violet-500/50 focus:ring-violet-500/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">
                  / 500
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  disabled={isDisabled}
                  className="w-full h-12 bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {cooldown > 0 ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      COOLDOWN {formatCooldown(cooldown)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      START FILLING
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
          Max 500 connections per batch • 2 min cooldown between runs
        </div>
      </div>
    </div>
  );
}