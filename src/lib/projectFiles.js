// The project's own source can't be bundled into the client app, so the
// fallback export fetches config files from the server at export time.

// Best-effort list of project files that can be fetched from the server.
const FETCH_CANDIDATES = [
  ".gitignore",
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.js",
  "tailwind.config.js",
  "postcss.config.js",
  "jsconfig.json",
  "components.json",
  "README.md",
  "src/index.css",
];

/**
 * Returns [{ name, data }] for every project file that could be fetched
 * from the server (root configs, dotfiles like .gitignore, styles).
 */
export async function getProjectFiles() {
  const encoder = new TextEncoder();
  const files = [];

  for (const name of FETCH_CANDIDATES) {
    try {
      const res = await fetch("/" + name);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      // The server falls back to index.html for unknown paths — skip those
      if (contentType.includes("html") && name !== "index.html") continue;
      const text = await res.text();
      if (text && text.length < 5000000) {
        files.push({ name, data: encoder.encode(text) });
      }
    } catch {
      // file not available — skip
    }
  }

  return files;
}