import React, { useCallback, useEffect, useRef, useState } from "react";
import Photon from "photon-realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Link2, LogOut, Radio } from "lucide-react";
import LogConsole from "@/components/LogConsole";
import { generateCustomId, loginPlayFabDebugger } from "@/lib/playfabGenerator";

const LBC = Photon.LoadBalancing.LoadBalancingClient;
const SDK_STATE = LBC.State;

function describePayload(payload) {
  try {
    return JSON.stringify(payload).slice(0, 500);
  } catch {
    return "[unserializable payload]";
  }
}

export default function PhotonCCU() {
  const [version, setVersion] = useState("live1.1.1.43");
  const [realtimeId, setRealtimeId] = useState("");
  const [titleId, setTitleId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("Debugger Instance");
  const [region, setRegion] = useState("US");
  const [createPrivate, setCreatePrivate] = useState(false);
  const [status, setStatus] = useState("DISCONNECTED");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [logs, setLogs] = useState([]);
  const clientRef = useRef(null);
  const connectTimeoutRef = useRef(null);
  const connectionStartedAtRef = useRef(0);

  const addLog = useCallback((message, type = "info") => {
    setLogs((current) => [...current, { message, type, time: new Date() }]);
  }, []);

  useEffect(() => () => {
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    clientRef.current?.disconnect();
  }, []);

  const disconnect = () => {
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("DISCONNECTED");
    addLog("Disconnected from Photon.", "warning");
  };

  const armConnectionTimeout = (client, phase) => {
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = setTimeout(() => {
      const elapsed = Math.round(performance.now() - connectionStartedAtRef.current);
      setStatus("TIMEOUT");
      addLog(`Photon ${phase} timed out after ${elapsed}ms.`, "error");
      addLog(`Diagnostics: online=${navigator.onLine}, WebSocket=${typeof WebSocket === "function"}, endpoint=${client.getNameServerAddress?.() || "unknown"}.`, "error");
      client.disconnect();
    }, 15000);
  };

  const connect = async () => {
    if (!realtimeId.trim() || !version.trim() || !roomCode.trim() || !titleId.trim()) {
      addLog("Realtime ID, version, room code, and PlayFab Title ID are required.", "error");
      return;
    }

    disconnect();
    setLogs([]);
    setStatus("CONNECTING");
    setIsAuthenticating(true);
    connectionStartedAtRef.current = performance.now();
    addLog(`Starting Photon Realtime SDK for ${version.trim()} (${region}).`);
    addLog(`Browser diagnostics: online=${navigator.onLine}, WebSocket=${typeof WebSocket === "function"}, protocol=WSS.`);

    let playFabAccount;
    try {
      playFabAccount = await loginPlayFabDebugger(titleId.trim(), generateCustomId());
      addLog(`PlayFab debugger account ready: ${playFabAccount.playFabId}${playFabAccount.newlyCreated ? " (created)" : " (existing)"}.`, "success");
    } catch (error) {
      setIsAuthenticating(false);
      setStatus("ERROR");
      addLog(error.message, "error");
      return;
    }
    setIsAuthenticating(false);
    const client = new LBC(
      Photon.ConnectionProtocol.Wss,
      realtimeId.trim(),
      version.trim()
    );
    clientRef.current = client;
    client.setLogLevel(Photon.LogLevel.DEBUG);
    client.setUserId(playFabAccount.playFabId || displayName.trim() || "Debugger Instance");
    addLog(`Photon endpoint: ${client.getNameServerAddress?.() || "unknown until SDK connect"}.`);
    addLog(`Photon user ID: ${client.getUserId?.() || playFabAccount.playFabId}.`);
    armConnectionTimeout(client, "Name Server connection");

    client.onStateChange = (state) => {
      const stateName = LBC.StateToName(state);
      const elapsed = Math.round(performance.now() - connectionStartedAtRef.current);
      setStatus(stateName.toUpperCase());
      addLog(`Photon state: ${stateName} at ${elapsed}ms.`);

      if (state === SDK_STATE.ConnectedToNameServer) {
        addLog("Name Server transport established; requesting the selected region master.", "success");
        armConnectionTimeout(client, "region master connection");
      }

      if (state === SDK_STATE.Error || state === SDK_STATE.Disconnected) {
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      }

      if (state === SDK_STATE.JoinedLobby) {
        addLog(`${createPrivate ? "Creating or joining" : "Joining"} room ${roomCode.trim()}.`);
        armConnectionTimeout(client, "room join");
        client.joinRoom(
          roomCode.trim(),
          createPrivate ? { createIfNotExists: true } : {},
          createPrivate ? { maxPlayers: 10 } : undefined
        );
      }

      if (state === SDK_STATE.Joined && connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    };

    client.onOperationResponse = (operationCode, returnCode, debugMessage, parameters) => {
      const detail = debugMessage ? ` message=${debugMessage}` : "";
      addLog(`Photon operation response: op=${operationCode}, returnCode=${returnCode}.${detail}`, returnCode === 0 ? "info" : "error");
      if (returnCode !== 0 && parameters) addLog(`Photon response parameters: ${describePayload(parameters)}`, "error");
    };

    client.onEvent = (eventCode, data) => {
      addLog(`Photon event received: code=${eventCode}, payload=${describePayload(data)}.`);
    };

    client.onJoinRoom = () => {
      setStatus("JOINED");
      addLog(`Joined room ${roomCode.trim()} as ${displayName.trim() || "Debugger Instance"}.`, "success");
    };

    client.onError = (errorCode, errorMessage) => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      setStatus("ERROR");
      addLog(`Photon error ${errorCode}: ${errorMessage || "Unknown error"}.`, "error");
    };

    Photon.setOnLoad(() => {
      client.connectToRegionMaster(region.trim() || "US");
    });
  };

  const connected = Boolean(clientRef.current) && status !== "DISCONNECTED" && status !== "ERROR";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center px-4 py-8 md:py-16">
      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-mono tracking-wider mb-4">
            <Radio className="w-3 h-3" />
            PHOTON DEBUGGER
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Lobby Connector</h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono">Official Photon Realtime JavaScript SDK</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Game Version</Label>
              <Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="live1.1.1.43" disabled={connected} />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Input value={region} onChange={(event) => setRegion(event.target.value.toUpperCase())} placeholder="US" disabled={connected} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Photon Realtime App ID</Label>
              <Input value={realtimeId} onChange={(event) => setRealtimeId(event.target.value)} placeholder="Realtime application ID" disabled={connected} />
            </div>
            <div className="space-y-2">
              <Label>PlayFab Title ID</Label>
              <Input value={titleId} onChange={(event) => setTitleId(event.target.value.toUpperCase())} placeholder="Title ID" disabled={connected} />
            </div>
            <div className="space-y-2">
              <Label>Room Code</Label>
              <Input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Private room code" disabled={connected} />
            </div>
            <div className="space-y-2">
              <Label>Debugger Name</Label>
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Debugger Instance" disabled={connected} />
            </div>
          </div>

          <label className="flex items-center gap-3 border border-zinc-800 p-3 text-xs font-mono text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={createPrivate} onChange={(event) => setCreatePrivate(event.target.checked)} disabled={connected} />
            CREATE PRIVATE LOBBY IF MISSING
          </label>

          <div className="flex gap-3">
            {!connected ? (
              <Button onClick={connect} disabled={isAuthenticating} className="flex-1 h-11 bg-violet-500 hover:bg-violet-400 text-white font-bold tracking-wider">
                <Link2 className="w-4 h-4" /> {isAuthenticating ? "CREATING PLAYFAB USER..." : "CONNECT AND JOIN"}
              </Button>
            ) : (
              <Button onClick={disconnect} variant="destructive" className="flex-1 h-11">
                <LogOut className="w-4 h-4" /> DISCONNECT
              </Button>
            )}
          </div>

          <div className="border border-zinc-800 bg-black/20 p-3 font-mono text-xs">
            <span className="text-zinc-500">STATUS </span>
            <span className="text-violet-400">{status}</span>
          </div>
          <p className="text-zinc-600 text-xs font-mono">
            This test path only creates a PlayFab debugger account and attempts a Photon Realtime room join.
          </p>
        </div>

        {logs.length > 0 && (
          <div className="mt-6">
            <LogConsole logs={logs} />
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 text-zinc-600 text-xs font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Room join success is reported only by the SDK callback. No handcrafted Photon packets are used.</span>
        </div>
      </div>
    </div>
  );
}
