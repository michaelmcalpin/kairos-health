/**
 * useDeviceConnection — Full device connection lifecycle hook.
 *
 * Wraps tRPC mutations for connecting, disconnecting, and syncing
 * OAuth-based device providers (Oura, Dexcom, Garmin, etc.).
 *
 * For OAuth providers the backend returns an authorization URL (`authUrl`)
 * that the mobile app opens in the system browser. The OAuth callback is
 * handled server-side, so the mobile app only needs to poll for
 * connection status after launching the URL.
 */

import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import {
  type DeviceProvider,
  getProviderInfo,
} from "@/lib/device-integrations";

export type { DeviceProvider } from "@/lib/device-integrations";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDeviceConnection(provider: DeviceProvider) {
  const [isConnecting, setIsConnecting] = useState(false);

  /* -- Query: current connection status -- */
  const connectionQuery = trpc.clientPortal.devices.getConnection.useQuery(
    { provider },
    { ...DEFAULT_QUERY_OPTIONS, retry: false },
  );

  const info = getProviderInfo(provider);

  /* -- Mutation: initiate OAuth connect -- */
  const connectMutation = trpc.clientPortal.devices.initiateConnect.useMutation({
    onSuccess: async (data: any) => {
      // Backend returns an authUrl for the provider's OAuth flow
      const oauthUrl = data?.authUrl || data?.url;
      if (oauthUrl) {
        try {
          await Linking.openURL(oauthUrl);
        } catch {
          Alert.alert(
            "Connection",
            `Please visit this URL to connect: ${oauthUrl}`,
          );
        }
      } else {
        Alert.alert(
          "Connection",
          `Could not retrieve authorization URL for ${info?.name ?? provider}. Please try again or connect via the web dashboard.`,
        );
      }
      setIsConnecting(false);
      // Refetch connection status after a delay to allow OAuth callback
      setTimeout(() => connectionQuery.refetch(), 3000);
    },
    onError: async (error: any) => {
      setIsConnecting(false);
      Alert.alert(
        "Connection Error",
        error.message || `Failed to connect ${info?.name ?? provider}. Please try again or connect via the web dashboard.`,
      );
    },
  });

  /* -- Mutation: disconnect -- */
  const disconnectMutation = trpc.clientPortal.devices.disconnect.useMutation({
    onSuccess: () => {
      connectionQuery.refetch();
      Alert.alert("Disconnected", `${info?.name ?? provider} has been disconnected.`);
    },
  });

  /* -- Mutation: sync now -- */
  const syncMutation = trpc.clientPortal.devices.syncNow.useMutation({
    onSuccess: () => {
      Alert.alert("Sync Complete", `${info?.name ?? provider} data synced successfully.`);
    },
    onError: (error: any) => {
      Alert.alert(
        "Sync Error",
        error.message || "Failed to sync data.",
      );
    },
  });

  /* -- Actions -- */
  const connect = useCallback(() => {
    setIsConnecting(true);
    connectMutation.mutate({ provider });
  }, [provider]);

  const disconnect = useCallback(() => {
    Alert.alert(
      "Disconnect Device",
      `Are you sure you want to disconnect ${info?.name ?? provider}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnectMutation.mutate({ provider }),
        },
      ],
    );
  }, [provider]);

  const sync = useCallback(() => {
    syncMutation.mutate({ provider });
  }, [provider]);

  /* -- Derived state -- */
  const isConnected =
    !!(connectionQuery.data as any)?.connected ||
    (connectionQuery.data as any)?.status === "connected";
  const lastSync = (connectionQuery.data as any)?.lastSync || null;

  return {
    isConnected,
    isConnecting,
    lastSync,
    isLoading: connectionQuery.isLoading,
    connect,
    disconnect,
    sync,
    isSyncing: syncMutation.isPending,
    refetch: connectionQuery.refetch,
  };
}
