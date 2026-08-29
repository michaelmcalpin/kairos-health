"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Apple,
  Pill,
  Syringe,
  Dumbbell,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProtocolBulkEditor from "@/components/coach/ProtocolBulkEditor";

type ProtocolType = "diet" | "supplements" | "peptides" | "workouts";

const TYPE_TABS: { id: ProtocolType; label: string; icon: typeof Apple }[] = [
  { id: "diet", label: "Diet", icon: Apple },
  { id: "supplements", label: "Supplements", icon: Pill },
  { id: "peptides", label: "Peptides", icon: Syringe },
  { id: "workouts", label: "Workouts", icon: Dumbbell },
];

const TAB_LABEL: Record<ProtocolType, string> = {
  diet: "Diet",
  supplements: "Supplements",
  peptides: "Peptides",
  workouts: "Workouts",
};

type Detected = { type: ProtocolType; label: string; reason: string };

export default function BulkEditProtocolsPage({ params }: { params: { id: string } }) {
  const clientId = params.id;
  const [type, setType] = useState<ProtocolType>("diet");

  // "Detect type" flow — coach uploads once, AI says which tab, coach confirms.
  const detectInputRef = useRef<HTMLInputElement | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detected, setDetected] = useState<Detected[] | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // File handed to the editor to auto-import once the coach confirms a tab.
  const [autoImport, setAutoImport] = useState<{ file: File; type: ProtocolType } | null>(null);

  const detailQuery = trpc.coach.clients.getDetail.useQuery(
    { clientId },
    { staleTime: 15_000, refetchOnWindowFocus: false, retry: false },
  );
  const clientName = detailQuery.data?.name ?? "Client";

  const gridQuery = trpc.coach.protocolBulk.getGrid.useQuery(
    { clientId, type },
    { refetchOnWindowFocus: false, retry: false },
  );

  const runDetect = async (file: File) => {
    setDetectError(null);
    setDetected(null);
    setDetecting(true);
    setPendingFile(file);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("detect", "1");
      const res = await fetch("/api/protocol-import", { method: "POST", body: form });
      if (!res.ok) {
        setDetectError("Couldn't read that file. Supported: Word, PDF, Excel, CSV.");
        setPendingFile(null);
        return;
      }
      const data = (await res.json()) as { detected?: Detected[]; warnings?: string[] };
      const list = Array.isArray(data?.detected) ? data.detected : [];
      if (list.length === 0) {
        setDetectError(
          (data?.warnings ?? []).filter(Boolean).join(" ") ||
            "Couldn't tell which protocol this is — pick a tab below and import there.",
        );
        return;
      }
      setDetected(list);
    } catch {
      setDetectError("Couldn't read that file. Supported: Word, PDF, Excel, CSV.");
      setPendingFile(null);
    } finally {
      setDetecting(false);
    }
  };

  // Coach confirmed a tab for the detected document — switch and hand the file
  // to the editor to import.
  const confirmImport = (target: ProtocolType) => {
    if (!pendingFile) return;
    setAutoImport({ file: pendingFile, type: target });
    setType(target);
    setDetected(null);
    setPendingFile(null);
    setDetectError(null);
  };

  const cancelDetect = () => {
    setDetected(null);
    setPendingFile(null);
    setDetectError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href={`/trainer/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors"
      >
        <ArrowLeft size={14} /> Back to {detailQuery.data?.name ?? "client"}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">Bulk Edit Protocols</h1>
          <p className="text-gray-400 text-sm">
            Spreadsheet-style editing for <span className="text-kairos-gold">{clientName}</span> — paste from Google Sheets,
            import a CSV, or upload a document and let AI sort it into the right tab.
          </p>
        </div>
        <div>
          <input
            ref={detectInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runDetect(f);
              e.currentTarget.value = "";
            }}
          />
          <button
            onClick={() => detectInputRef.current?.click()}
            disabled={detecting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/25 transition-colors disabled:opacity-50"
          >
            {detecting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Upload a document (AI picks the tab)
          </button>
        </div>
      </div>

      {/* Detect error */}
      {detectError && (
        <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertCircle size={13} /> {detectError}
        </div>
      )}

      {/* Detection result — "which tab does this go in?" */}
      {detected && detected.length > 0 && (
        <div className="rounded-xl border border-kairos-gold/30 bg-kairos-gold/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-heading font-semibold text-kairos-gold flex items-center gap-2">
                <Sparkles size={14} /> This looks like {detected.length > 1 ? "more than one thing" : `a ${detected[0].label} document`}
              </h3>
              {pendingFile && (
                <p className="text-[11px] text-kairos-silver-dark mt-0.5">{pendingFile.name}</p>
              )}
            </div>
            <button onClick={cancelDetect} className="p-1 rounded-md text-gray-500 hover:text-white" title="Cancel">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-2 mb-3">Import it into which tab?</p>
          <div className="flex flex-wrap gap-2">
            {/* Detected types first (highlighted, with the AI's reason). */}
            {detected.map((d) => (
              <button
                key={d.type}
                onClick={() => confirmImport(d.type)}
                title={d.reason || undefined}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-kairos-gold text-kairos-royal-dark hover:bg-kairos-gold-light transition-colors"
              >
                {TAB_LABEL[d.type]}
                {d.reason && <span className="text-[11px] font-normal opacity-80">· {d.reason}</span>}
              </button>
            ))}
            {/* Any remaining tabs as a fallback, in case detection was off. */}
            {TYPE_TABS.filter((t) => !detected.some((d) => d.type === t.id)).map((t) => (
              <button
                key={t.id}
                onClick={() => confirmImport(t.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type switcher */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = type === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-kairos-gold/15 text-kairos-gold border border-kairos-gold/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Editor / states */}
      <div className="kairos-card">
        {gridQuery.isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-kairos-gold" />
            <p className="text-sm text-gray-400">Loading {type}…</p>
          </div>
        ) : gridQuery.isError ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2 text-center">
            <AlertCircle size={22} className="text-red-400" />
            <p className="text-sm text-red-400">{gridQuery.error.message}</p>
            <button
              onClick={() => gridQuery.refetch()}
              className="mt-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : gridQuery.data ? (
          <ProtocolBulkEditor
            key={type}
            clientId={clientId}
            type={type}
            columns={gridQuery.data.columns}
            initialRows={gridQuery.data.rows}
            initialPlanMeta={gridQuery.data.planMeta ?? undefined}
            autoImportFile={autoImport && autoImport.type === type ? autoImport.file : undefined}
            onAutoImportConsumed={() => setAutoImport(null)}
            onPublished={() => gridQuery.refetch()}
          />
        ) : null}
      </div>
    </div>
  );
}
