import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileArchive, Globe, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { appParams } from "@/lib/app-params";
import { getProjectFiles } from "@/lib/projectFiles";
import { createZip } from "@/lib/zip";
import { buildStaticHtml } from "@/lib/staticExport";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export default function ExportButton() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const exportProject = async () => {
    setBusy(true);
    try {
      // Try the platform's export endpoint first (full saved project)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let res;
      try {
        res = await fetch(`/api/apps/${appParams.appId}/coding/export-to-zip`, {
          credentials: "include",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && !contentType.includes("json") && !contentType.includes("html")) {
        downloadBlob(await res.blob(), "playfab-account-generator-project.zip");
        toast({ title: "Project exported", description: "Full project downloaded as a ZIP." });
        return;
      }
      throw new Error("export endpoint unavailable");
    } catch {
      // Fallback: zip whatever project files can be fetched from the server
      const files = await getProjectFiles();
      if (files.length === 0) {
        toast({
          variant: "destructive",
          title: "Export unavailable",
          description: "Use Code → 'Export project as ZIP' in the app editor to download the full project.",
        });
        return;
      }
      const zip = createZip(files);
      downloadBlob(zip, "playfab-account-generator-project.zip");
      toast({
        title: "Partial export",
        description: "Downloaded the available config files. Use Code → 'Export project as ZIP' in the app editor for the full project.",
      });
    } finally {
      setBusy(false);
    }
  };

  const exportStatic = async () => {
    setBusy(true);
    try {
      const html = await buildStaticHtml();
      downloadBlob(new Blob([html], { type: "text/html" }), "playfab-account-generator.html");
      toast({
        title: "Static page exported",
        description: "Fully interactive single-file app with JS — open it in any browser, no server needed.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not build the static page. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={busy}
          className="bg-zinc-900/80 border border-zinc-700 hover:bg-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 font-mono text-xs tracking-wider h-9"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          EXPORT
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-zinc-900 border-zinc-800">
        <DropdownMenuItem onClick={exportProject} className="text-zinc-300 hover:text-white focus:text-white">
          <FileArchive className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
          <div>
            <div className="font-mono text-xs">Project source (.zip)</div>
            <div className="text-zinc-500 text-[10px]">Full project as a ZIP archive</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportStatic} className="text-zinc-300 hover:text-white focus:text-white">
          <Globe className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
          <div>
            <div className="font-mono text-xs">Static page (.html)</div>
            <div className="text-zinc-500 text-[10px]">Interactive page with JS, one file</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}