/// <reference types="expo/types" />

// Ensure the EXPO_PUBLIC_* env vars are typed.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  }
}
