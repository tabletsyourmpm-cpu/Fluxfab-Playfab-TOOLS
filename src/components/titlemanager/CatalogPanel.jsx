import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, RefreshCw, Search } from "lucide-react";

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

export default function CatalogPanel({ titleId, secretKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const data = await adminCall(titleId, secretKey, "GetCatalogItems", { CatalogVersion: "" });
    if (data.data?.Catalog) {
      setItems(data.data.Catalog);
    } else {
      setError(data.errorMessage || "Failed to load catalog");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) =>
    item.DisplayName?.toLowerCase().includes(search.toLowerCase()) ||
    item.ItemId?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-zinc-500 text-sm font-mono">Loading catalog...</p>;
  if (error) return <p className="text-red-400 text-sm font-mono">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="bg-zinc-950 border-zinc-700 text-white font-mono placeholder:text-zinc-600 h-9 pl-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={load} className="text-zinc-500 hover:text-zinc-300 h-9 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <span className="text-zinc-600 text-xs font-mono">{filtered.length} items</span>
      </div>

      {filtered.length === 0 && (
        <p className="text-zinc-600 text-sm font-mono">No items found.</p>
      )}

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div key={item.ItemId} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-mono font-bold text-sm">{item.DisplayName || item.ItemId}</p>
                <span className="text-zinc-600 text-xs font-mono bg-zinc-900 px-1.5 py-0.5 rounded">{item.ItemId}</span>
              </div>
              {item.Description && <p className="text-zinc-500 text-xs mt-1">{item.Description}</p>}
              {item.VirtualCurrencyPrices && Object.keys(item.VirtualCurrencyPrices).length > 0 && (
                <div className="flex gap-2 mt-2">
                  {Object.entries(item.VirtualCurrencyPrices).map(([code, price]) => (
                    <span key={code} className="text-emerald-400 text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {price} {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}