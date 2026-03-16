"use client";

/**
 * Integration Status Card — Shows connected device/service status
 *
 * Displays provider connection state, last sync time, and
 * provides connect/disconnect/re-sync actions.
 */

import React, { useState } from "react";

export interface IntegrationStatus {
  provider: string;
  name: string;
  description: string;
  connected: boolean;
  lastSyncAt: string | null;
  recordsSynced: number;
  status: "idle" | "syncing" | "success" | "error";
  error?: string;
  dataTypes: string[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  idle: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" },
  syncing: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  success: { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" },
  error: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function IntegrationStatusCard({
  integration,
  onConnect,
  onDisconnect,
  onSync,
}: {
  integration: IntegrationStatus;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
}) {
  const colors = STATUS_COLORS[integration.status] || STATUS_COLORS.idle;

  return (
    <div className="kairos-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-heading text-sm font-semibold text-[#122055]">
            {integration.name}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">{integration.description}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${integration.status === "syncing" ? "animate-pulse" : ""}`} />
          {integration.connected
            ? integration.status === "syncing"
              ? "Syncing"
              : integration.status === "error"
              ? "Error"
              : "Connected"
            : "Not Connected"}
        </span>
      </div>

      {integration.connected && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Last Sync</span>
              <p className="text-sm font-medium text-gray-700">{timeAgo(integration.lastSyncAt)}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Records</span>
              <p className="text-sm font-medium text-gray-700">
                {integration.recordsSynced.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {integration.dataTypes.map((dt) => (
              <span
                key={dt}
                className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded"
              >
                {dt}
              </span>
            ))}
          </div>

          {integration.error && (
            <p className="text-xs text-red-500 mb-3">{integration.error}</p>
          )}
        </>
      )}

      <div className="flex gap-2">
        {integration.connected ? (
          <>
            <button
              onClick={onSync}
              disabled={integration.status === "syncing"}
              className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg bg-[#122055] text-white hover:bg-[#1a2d6d] transition-colors disabled:opacity-50"
            >
              {integration.status === "syncing" ? "Syncing..." : "Sync Now"}
            </button>
            <button
              onClick={onDisconnect}
              className="text-xs font-medium py-1.5 px-3 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="w-full text-xs font-medium py-1.5 px-3 rounded-lg bg-[#D4AF37] text-white hover:bg-[#b8962e] transition-colors"
          >
            Connect {integration.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Integration Dashboard (grid of all integrations) ───────────────────────

const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  {
    provider: "oura", name: "Oura Ring", description: "Sleep, HRV, readiness scores",
    connected: true, lastSyncAt: new Date(Date.now() - 15 * 60000).toISOString(),
    recordsSynced: 12847, status: "success", dataTypes: ["sleep", "heart_rate", "hrv", "body_temperature"],
  },
  {
    provider: "dexcom", name: "Dexcom G7", description: "Continuous glucose monitoring",
    connected: true, lastSyncAt: new Date(Date.now() - 5 * 60000).toISOString(),
    recordsSynced: 48320, status: "success", dataTypes: ["glucose"],
  },
  {
    provider: "whoop", name: "WHOOP 4.0", description: "Recovery, strain, and workout data",
    connected: false, lastSyncAt: null, recordsSynced: 0, status: "idle", dataTypes: ["strain", "heart_rate", "sleep", "workouts"],
  },
  {
    provider: "garmin", name: "Garmin Connect", description: "Activities, sleep, and stress",
    connected: false, lastSyncAt: null, recordsSynced: 0, status: "idle", dataTypes: ["steps", "workouts", "sleep", "heart_rate"],
  },
  {
    provider: "apple_health", name: "Apple Health", description: "HealthKit data via iOS app",
    connected: true, lastSyncAt: new Date(Date.now() - 60 * 60000).toISOString(),
    recordsSynced: 5420, status: "success", dataTypes: ["steps", "heart_rate", "workouts"],
  },
  {
    provider: "labcorp", name: "LabCorp", description: "Lab orders and results",
    connected: true, lastSyncAt: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
    recordsSynced: 48, status: "success", dataTypes: ["lab_results"],
  },
];

export function IntegrationDashboard() {
  const [integrations, setIntegrations] = useState(MOCK_INTEGRATIONS);

  const handleConnect = (provider: string) => {
    // In production, this would initiate OAuth flow
    setIntegrations((prev) =>
      prev.map((i) =>
        i.provider === provider
          ? { ...i, connected: true, status: "syncing" as const, lastSyncAt: new Date().toISOString() }
          : i
      )
    );
    // Simulate sync completion
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider ? { ...i, status: "success" as const, recordsSynced: 100 } : i
        )
      );
    }, 3000);
  };

  const handleSync = (provider: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.provider === provider ? { ...i, status: "syncing" as const } : i))
    );
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.provider === provider
            ? { ...i, status: "success" as const, lastSyncAt: new Date().toISOString(), recordsSynced: i.recordsSynced + 50 }
            : i
        )
      );
    }, 2000);
  };

  const handleDisconnect = (provider: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.provider === provider
          ? { ...i, connected: false, status: "idle" as const, lastSyncAt: null, recordsSynced: 0 }
          : i
      )
    );
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-[#122055]">Connected Integrations</h2>
          <p className="text-sm text-gray-500">{connectedCount} of {integrations.length} connected</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <IntegrationStatusCard
            key={integration.provider}
            integration={integration}
            onConnect={() => handleConnect(integration.provider)}
            onSync={() => handleSync(integration.provider)}
            onDisconnect={() => handleDisconnect(integration.provider)}
          />
        ))}
      </div>
    </div>
  );
}
