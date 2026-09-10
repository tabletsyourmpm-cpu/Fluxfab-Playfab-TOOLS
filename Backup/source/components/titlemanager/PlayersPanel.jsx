import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Calendar, Plus, Minus } from "lucide-react";

async function adminCall(titleId, secretKey, endpoint, body = {}) {
  const res = await fetch(`https://${titleId}.playfabapi.com/Admin/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secretKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { errorMessage: "Invalid response from server" };
  }
}

export default function PlayersPanel({ titleId, secretKey }) {
  const [search, setSearch] = useState("");
  const [player, setPlayer] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currencyAmount, setCurrencyAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const lookupPlayer = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError("");
    setPlayer(null);
    setInventory(null);

    const isId = /^[A-F0-9]{16}$/i.test(search.trim());
    const body = isId ? { PlayFabId: search.trim() } : { TitleDisplayName: search.trim() };

    const data = await adminCall(titleId, secretKey, "LookupUserAccountInfo", body);
    if (data.data?.UserInfo) {
      setPlayer(data.data.UserInfo);
      const inv = await adminCall(titleId, secretKey, "GetUserInventory", {
        PlayFabId: data.data.UserInfo.PlayFabId,
      });
      if (inv.data) setInventory(inv.data);
    } else {
      setError(data.errorMessage || "Player not found");
    }
    setLoading(false);
  };

  const modifyCurrency = async (add) => {
    if (!selectedCurrency || !currencyAmount) return;
    const endpoint = add ? "AddUserVirtualCurrency" : "SubtractUserVirtualCurrency";
    const result = await adminCall(titleId, secretKey, endpoint, {
      PlayFabId: player.PlayFabId,
      VirtualCurrency: selectedCurrency,
      Amount: parseInt(currencyAmount),
    });
    if (result.data) {
      setActionMsg(`${add ? "Added" : "Removed"} ${currencyAmount} ${selectedCurrency}`);
      const inv = await adminCall(titleId, secretKey, "GetUserInventory", { PlayFabId: player.PlayFabId });
      if (inv.data) setInventory(inv.data);
    } else {
      setActionMsg(result.errorMessage || "Failed");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookupPlayer()}
          placeholder="PlayFab ID or Display Name"
          className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-10"
        />
        <Button onClick={lookupPlayer} disabled={loading} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-10 px-4">
          {loading ? "..." : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

      {/* Player Info */}
      {player && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-mono font-bold">{player.TitleInfo?.DisplayName || "No Display Name"}</p>
              <p className="text-zinc-500 text-xs font-mono">{player.PlayFabId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-zinc-900 rounded-lg p-2">
              <p className="text-zinc-600">Created</p>
              <p className="text-zinc-300">{player.Created ? new Date(player.Created).toLocaleDateString() : "—"}</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2">
              <p className="text-zinc-600">Last Login</p>
              <p className="text-zinc-300">{player.TitleInfo?.LastLogin ? new Date(player.TitleInfo.LastLogin).toLocaleDateString() : "—"}</p>
            </div>
          </div>

          {/* Virtual Currencies */}
          {inventory?.VirtualCurrency && Object.keys(inventory.VirtualCurrency).length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-wider">Virtual Currencies</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(inventory.VirtualCurrency).map(([code, amount]) => (
                  <div key={code} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="text-emerald-400 font-mono font-bold text-sm">{code}</span>
                    <span className="text-white font-mono text-sm">{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modify Currency */}
          <div>
            <p className="text-zinc-500 text-xs font-mono mb-2 uppercase tracking-wider">Modify Currency</p>
            <div className="flex gap-2">
              <Input
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value.toUpperCase())}
                placeholder="Code (e.g. GD)"
                className="bg-zinc-900 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-9 w-28"
                maxLength={2}
              />
              <Input
                type="number"
                value={currencyAmount}
                onChange={(e) => setCurrencyAmount(e.target.value)}
                placeholder="Amount"
                className="bg-zinc-900 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-9"
              />
              <Button onClick={() => modifyCurrency(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-3">
                <Plus className="w-4 h-4" />
              </Button>
              <Button onClick={() => modifyCurrency(false)} className="bg-red-700 hover:bg-red-600 text-white h-9 px-3">
                <Minus className="w-4 h-4" />
              </Button>
            </div>
            {actionMsg && <p className="text-emerald-400 text-xs font-mono mt-2">{actionMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}