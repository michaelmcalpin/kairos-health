"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Apple, Pill, Syringe, Dumbbell, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProtocolBulkEditor from "@/components/coach/ProtocolBulkEditor";

type ProtocolType = "diet" | "supplements" | "peptides" | "workouts";

const TYPE_TABS: { id: ProtocolType; label: string; icon: typeof Apple }[] = [
  { id: "diet", label: "Diet", icon: Apple },
  { id: "supplements", label: "Supplements", icon: Pill },
  { id: "peptides", label: "Peptides", icon: Syringe },
  { id: "workouts", label: "Workouts", icon: Dumbbell },
];

export default function BulkEditProtocolsPage({ params }: { params: { id: string } }) {
  const clientId = params.id;
  const [type, setType] = useState<ProtocolType>("diet");

  const detailQuery = trpc.coach.clients.getDetail.useQuery(
    { clientId },
    { staleTime: 15_000, refetchOnWindowFocus: false, retry: false },
  );
  const clientName = detailQuery.data?.name ?? "Client";

  const gridQuery = trpc.coach.protocolBulk.getGrid.useQuery(
    { clientId, type },
    { refetchOnWindowFocus: false, retry: false },
  );

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
      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-1">Bulk Edit Protocols</h1>
        <p className="text-gray-400 text-sm">
          Spreadsheet-style editing for <span className="text-kairos-gold">{clientName}</span> — paste from Google Sheets or
          import a CSV, review, then publish to notify the client.
        </p>
      </div>

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
            onPublished={() => gridQuery.refetch()}
          />
        ) : null}
      </div>
    </div>
  );
}
