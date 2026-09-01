"use client";

import { useState } from "react";
import { Users, Search, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Filter = "all" | "orphaned" | "assigned";

export default function SuperAdminClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const query = trpc.admin.users.listClientsWithCoaches.useQuery(
    { search, filter },
    { refetchOnWindowFocus: false },
  );
  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-1">Clients &amp; Coaches</h1>
        <p className="text-gray-400 text-sm">Every client and who coaches them. Clients with no coach are flagged.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name or email"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-kairos-gold/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "assigned", "orphaned"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-kairos-gold/15 text-kairos-gold border border-kairos-gold/30"
                  : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {f === "orphaned" ? "No coach" : f}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-xs text-gray-500">
          {data.total} client{data.total === 1 ? "" : "s"} shown · {data.orphanedCount} with no coach
        </p>
      )}

      {/* List */}
      {query.isLoading ? (
        <div className="kairos-card p-10 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-kairos-gold" />
        </div>
      ) : query.isError ? (
        <div className="kairos-card p-6 flex flex-col items-center gap-2 text-center">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-sm text-red-400">{query.error.message}</p>
        </div>
      ) : (data?.clients.length ?? 0) === 0 ? (
        <div className="kairos-card p-10 text-center text-sm text-gray-500">No clients match.</div>
      ) : (
        <div className="kairos-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Coach(es)</th>
              </tr>
            </thead>
            <tbody>
              {data!.clients.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-3 text-white whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{c.email}</td>
                  <td className="px-4 py-3">
                    {c.coaches.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <AlertCircle size={11} /> No coach
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {c.coaches.map((co) => (
                          <span key={co.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30">
                            <Users size={11} /> {co.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
