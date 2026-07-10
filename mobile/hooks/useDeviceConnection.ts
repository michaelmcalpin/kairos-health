/**
 * useDeviceConnection — Full device connection lifecycle hook.
 *
 * Wraps tRPC mutations for connecting, disconnecting, and syncing
 * OAuth-based device providers (Oura, Dexcom, Garmin, etc.).
 *
 * For OAuth providers the backend returns an authorization URL that
 * the mobile app opens in the system browser. The OAuth callback is
 * handled server-side, so the mobile app only needs to poll for
 * connection status after launching the URL.
 */

import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { API_URL } from "@/lib/constants";
import {
  type DeviceProvider,
  getProviderInfo,
  initiateOAuthConnection,
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
      // Backend may return an OAuth URL for the provider
      const oauthUrl = data?.url || data?.authorizationUrl;
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
        // Fall back to our device-integrations service for OAuth URL construction
        await initiateOAuthConnection(provider, API_URL);
      }
      setIsConnecting(false);
      // Refetch connection status after a delay to allow OAuth callback
      setTimeout(() => connectionQuery.refetch(), 3000);
    },
    onError: async (error: any) => {
      // If backend is unreachable, still try to open OAuth URL directly
      if (info?.connectionType === "oauth") {
        await initiateOAuthConnection(provider, API_URL);
        setIsConnecting(false);
        setTimeout(() => connectionQuery.refetch(), 3000);
      } else {
        setIsConnecting(false);
        Alert.alert(
          "Connection Error",
          error.message || `Failed to connect ${provider}`,
        );
      }
    },
  });

  /* -- Mutation: disconnect -- */
  const disconnectMutation = trpc.clientPortal.devices.disconnect.useMutation({
    onSuccess: () => {
      connectionQuery.refetch();
      Alert.alert("Disconnected", `${provider} has been disconnected.`);
    },
  });

  /* -- Mutation: sync now -- */
  const syncMutation = trpc.clientPortal.devices.syncNow.useMutation({
    onSuccess: () => {
      Alert.alert("Sync Complete", `${provider} data synced successfully.`);
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
      `Are you sure you want to disconnect ${provider}?`,
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
