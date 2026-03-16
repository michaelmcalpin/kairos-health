"use client";

import { useState } from "react";
import type { DeviceSelection } from "@/lib/onboarding/types";

interface DevicesStepProps {
  devices: DeviceSelection[];
  onUpdate: (devices: DeviceSelection[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface DeviceProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  popular: boolean;
}

const DEVICE_PROVIDERS: DeviceProvider[] = [
  { id: "dexcom", name: "Dexcom", icon: "📟", description: "Continuous Glucose Monitor", popular: true },
  { id: "oura", name: "Oura Ring", icon: "💍", description: "Sleep & Recovery Tracking", popular: true },
  { id: "whoop", name: "WHOOP", icon: "⌚", description: "Strain & Recovery", popular: true },
  { id: "apple_health", name: "Apple Health", icon: "🍎", description: "Unified Health Data", popular: true },
  { id: "garmin", name: "Garmin", icon: "🏃", description: "Fitness & Activity", popular: false },
  { id: "fitbit", name: "Fitbit", icon: "📱", description: "Activity & Sleep", popular: false },
];

export function DevicesStep({ devices, onUpdate, onContinue, onBack }: DevicesStepProps) {
  const [connecting, setConnecting] = useState<string | null>(null);

  function handleToggleDevice(provider: DeviceProvider) {
    const existing = devices.find((d) => d.providerId === provider.id);

    if (existing) {
      onUpdate(devices.filter((d) => d.providerId !== provider.id));
    } else {
      // Simulate connection flow
      setConnecting(provider.id);
      setTimeout(() => {
        onUpdate([
          ...devices,
          { providerId: provider.id, providerName: provider.name, connected: true },
        ]);
        setConnecting(null);
      }, 1200);
    }
  }

  const connectedCount = devices.filter((d) => d.connected).length;

  return (
    <div className="max-w-lg mx-auto w-full">
      <h2 className="text-2xl font-heading font-bold text-white mb-2">Connect Devices</h2>
      <p className="text-gray-400 mb-2">
        Link your wearables and health devices for automated data tracking.
        You can always add more later.
      </p>
      <p className="text-sm mb-6" style={{ color: "#D4AF37" }}>
        This step is optional — {connectedCount > 0 ? `${connectedCount} connected` : "skip if you prefer"}
      </p>

      <div className="space-y-3">
        {DEVICE_PROVIDERS.map((provider) => {
          const deviceState = devices.find((d) => d.providerId === provider.id);
          const isConnected = deviceState?.connected ?? false;
          const isConnecting = connecting === provider.id;

          return (
            <div
              key={provider.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition ${
                isConnected
                  ? "border-emerald-700/50 bg-emerald-900/10"
                  : "border-gray-700 bg-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <div className="font-semibold text-white text-sm flex items-center gap-2">
                    {provider.name}
                    {provider.popular && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37]">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs">{provider.description}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleDevice(provider)}
                disabled={isConnecting}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  isConnecting
                    ? "bg-gray-700 text-gray-400"
                    : isConnected
                      ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700/50 hover:bg-red-900/20 hover:text-red-400 hover:border-red-700/50"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M11 6a5 5 0 00-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Connecting...
                  </span>
                ) : isConnected ? (
                  "Connected"
                ) : (
                  "Connect"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="kairos-btn-gold px-8 py-2 rounded-lg font-semibold transition hover:scale-105"
        >
          {connectedCount > 0 ? "Continue" : "Skip for Now"}
        </button>
      </div>
    </div>
  );
}
