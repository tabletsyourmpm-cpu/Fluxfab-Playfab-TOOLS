// Builds a fully self-contained, interactive single-file version of the
// Account Generator page: the generator logic is inlined from the app's
// own shared module and React + Babel + Tailwind load from CDNs, so the
// exported HTML works standalone in any browser.

const LOGIC_MARKER = "/*__GENERATOR_LOGIC__*/";
const UI_MARKER = "/*__GENERATOR_UI__*/";

// The dev server serves modules with hot-reload boilerplate and ESM exports;
// strip both so the code runs as a plain classic script.
function cleanModuleText(text) {
  let cleaned = text;
  const hotIdx = cleaned.indexOf("import.meta.hot");
  if (hotIdx !== -1) cleaned = cleaned.slice(0, hotIdx);
  cleaned = cleaned
    .split("\n")
    .filter((line) => !line.includes("__vite__"))
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n");
  cleaned = cleaned.replace(/^export (?=(?:async )?function|const|let)/gm, "");
  return cleaned.trim();
}

async function fetchGeneratorLogic() {
  const res = await fetch("/src/lib/playfabGenerator.js");
  if (!res.ok) throw new Error("generator logic unavailable");
  const logic = cleanModuleText(await res.text());
  if (!logic.includes("function createPlayFabAccount")) {
    throw new Error("generator logic incomplete");
  }
  return logic;
}

const GENERATOR_UI = `
const { useState, useRef, useEffect } = React;

function formatCooldown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ":" + String(s).padStart(2, "0");
}

const LOG_COLORS = {
  info: "text-sky-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400"
};
const LOG_PREFIXES = { info: "[*]", success: "[+]", error: "[!]", warning: "[~]" };

function LogConsole({ logs }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <span className="w-2 h-2 rounded-full bg-red-500/70"></span>
        <span className="w-2 h-2 rounded-full bg-amber-500/70"></span>
        <span className="w-2 h-2 rounded-full bg-emerald-500/70"></span>
        <span className="ml-2 text-zinc-500 text-xs font-mono tracking-widest">SYSTEM LOG</span>
      </div>
      <div ref={ref} className="h-52 overflow-y-auto p-4 space-y-1.5 font-mono text-xs">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-zinc-600 shrink-0">{log.time}</span>
            <span className={LOG_COLORS[log.type] || "text-zinc-400"}>
              <span className="shrink-0">{LOG_PREFIXES[log.type] || "[*]"} </span>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const addLog = (message, type) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev, { message, type, time }]);
  };

  const handleStart = async () => {
    const count = parseInt(amount, 10);
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

    addLog("Starting account generation for Title ID: " + titleId, "info");
    addLog("Target: " + count + " accounts", "info");

    let successes = 0;
    let fails = 0;

    for (let i = 0; i < count; i++) {
      if (abortRef.current) {
        addLog("Process aborted by user", "warning");
        break;
      }

      const customId = generateCustomId();
      const accountName = displayName.trim() ? (displayName.trim() + (count > 1 ? String(i + 1) : "")) : null;
      const result = await createPlayFabAccount(titleId.trim(), customId, accountName);

      if (result.success) {
        successes++;
        setSuccessCount(successes);
        if (successes % 10 === 0 || successes === 1) {
          const nameInfo = accountName ? (" " + accountName) : "";
          const locInfo = result.location ? (" | " + result.location.city + ", " + result.location.country + " (" + result.location.ip + ")") : "";
          addLog("Account #" + (i + 1) + nameInfo + locInfo + " → " + result.playFabId, "success");
        }
      } else {
        fails++;
        setFailCount(fails);
        addLog("Account #" + (i + 1) + " failed: " + result.error, "error");
        if (result.fatal) {
          addLog("Fatal error detected - stopping process", "error");
          break;
        }
      }

      setProgress(i + 1);
      if (i < count - 1) await new Promise((r) => setTimeout(r, 500));
    }

    addLog("Completed: " + successes + " created, " + fails + " failed", successes > 0 ? "success" : "error");
    setIsRunning(false);
    setCooldown(120);
  };

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  const isDisabled = isRunning || cooldown > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center px-4 py-8 md:py-16">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-200px] right-[-100px] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono tracking-wider mb-4">
            <span className="w-3 h-3 inline-block rounded-full border-2 border-emerald-400"></span>
            PLAYFAB TOOL
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Account <span className="text-emerald-400">Generator</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-mono">Bulk create PlayFab accounts instantly</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-mono uppercase tracking-wider block">PlayFab Title ID</label>
              <input
                value={titleId}
                onChange={(e) => setTitleId(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C"
                disabled={isRunning}
                maxLength={10}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-white font-mono placeholder:text-zinc-600 h-12 text-lg tracking-widest px-3 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-mono uppercase tracking-wider block">Number of Accounts</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || (parseInt(v, 10) >= 0 && parseInt(v, 10) <= 500)) setAmount(v);
                  }}
                  placeholder="1 – 500"
                  disabled={isRunning}
                  min={1}
                  max={500}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-white font-mono placeholder:text-zinc-600 h-12 text-lg px-3 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">/ 500</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-mono uppercase tracking-wider block">
                Display Name <span className="text-zinc-600">(Optional)</span>
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Player"
                disabled={isRunning}
                maxLength={25}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md text-white font-mono placeholder:text-zinc-600 h-12 text-lg px-3 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
              <p className="text-zinc-600 text-xs font-mono">Multiple accounts will be numbered: Player1, Player2, etc.</p>
            </div>

            <div className="pt-2">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={isDisabled}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm tracking-wider rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {cooldown > 0 ? "COOLDOWN " + formatCooldown(cooldown) : "START GENERATION"}
                </button>
              ) : (
                <button
                  onClick={() => (abortRef.current = true)}
                  className="w-full h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wider rounded-md"
                >
                  ABORT
                </button>
              )}
            </div>
          </div>
        </div>

        {(isRunning || progress > 0) && (
          <div className="mt-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
                {isRunning ? "Generating..." : "Complete"}
              </span>
              <span className="text-emerald-400 text-sm font-mono font-bold">{percent}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: percent + "%" }}></div>
            </div>
            <div className="flex gap-6 mt-4">
              <div>
                <div className="text-emerald-400 text-xl font-bold font-mono">{successCount}</div>
                <div className="text-zinc-500 text-xs font-mono">SUCCESS</div>
              </div>
              <div>
                <div className="text-red-400 text-xl font-bold font-mono">{failCount}</div>
                <div className="text-zinc-500 text-xs font-mono">FAILED</div>
              </div>
              <div>
                <div className="text-zinc-300 text-xl font-bold font-mono">{progress} / {total}</div>
                <div className="text-zinc-500 text-xs font-mono">PROGRESS</div>
              </div>
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-6">
            <LogConsole logs={logs} />
          </div>
        )}

        <div className="text-center mt-8 text-zinc-600 text-xs font-mono">
          Max 500 accounts per batch • 2 min cooldown between runs
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
`;

export async function buildStaticHtml() {
  const logic = await fetchGeneratorLogic();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PlayFab Account Generator</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>
  body { background: #0a0a0f; margin: 0; }
<\/style>
</head>
<body>
<div id="root"></div>
<script id="app-source" type="text/plain">
${LOGIC_MARKER}
${UI_MARKER}
<\/script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  try {
    var source = document.getElementById('app-source').textContent;
    var compiled = Babel.transform(source, { presets: [['react', { runtime: 'classic' }]] }).code;
    var script = document.createElement('script');
    script.text = compiled;
    document.body.appendChild(script);
  } catch (e) {
    var pre = document.createElement('pre');
    pre.style.color = '#f87171';
    pre.textContent = 'Build error: ' + (e && e.message);
    document.body.appendChild(pre);
  }
});
<\/script>
</body>
</html>`;

  return html
    .replace(LOGIC_MARKER, () => logic)
    .replace(UI_MARKER, () => GENERATOR_UI.trim());
}