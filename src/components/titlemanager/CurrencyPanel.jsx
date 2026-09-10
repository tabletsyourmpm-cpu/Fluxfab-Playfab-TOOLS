import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Coins, RefreshCw } from "lucide-react";

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

export default function CurrencyPanel({ titleId, secretKey }) {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const data = await adminCall(titleId, secretKey, "ListVirtualCurrencyTypes");
    if (data.data?.VirtualCurrencies) {
      setCurrencies(data.data.VirtualCurrencies);
    } else {
      setError(data.errorMessage || "Failed to load currencies");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-zinc-500 text-sm font-mono">Loading currencies...</p>;
  if (error) return <p className="text-red-400 text-sm font-mono">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider">{currencies.length} currencies</p>
        <Button variant="ghost" size="sm" onClick={load} className="text-zinc-500 hover:text-zinc-300 h-7 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {currencies.length === 0 && (
        <p className="text-zinc-600 text-sm font-mono">No virtual currencies found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currencies.map((vc) => (
          <div key={vc.CurrencyCode} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-mono font-bold">{vc.CurrencyCode}</p>
                <p className="text-zinc-500 text-xs font-mono">{vc.DisplayName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-3">
              <div className="bg-zinc-900 rounded-lg p-2">
                <p className="text-zinc-600">Initial Amount</p>
                <p className="text-zinc-300">{vc.InitialDeposit ?? 0}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-2">
                <p className="text-zinc-600">Recharge Rate</p>
                <p className="text-zinc-300">{vc.RechargeRate ?? "None"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}