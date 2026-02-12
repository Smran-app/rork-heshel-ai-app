import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { RecipeQueueProvider } from "@/providers/RecipeQueueProvider";
import ProcessingQueue from "@/components/ProcessingQueue";
import { Platform } from "react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === "login";

    if (!isAuthenticated && !inAuth) {
      console.log("[Nav] Not authenticated, redirecting to login");
      router.replace("/login");
    } else if (isAuthenticated && inAuth) {
      console.log("[Nav] Authenticated, redirecting to home");
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    // Platform-specific API keys
    const iosApiKey = "appl_hRXLEpqYDJVeNMCiArlctRvIdsB";
    // const androidApiKey = "goog_LtyoeuxvFLeehvoHdVSpJaTHrRk";

    if (Platform.OS === "ios") {
      Purchases.configure({ apiKey: iosApiKey });
    } else if (Platform.OS === "android") {
      // Purchases.configure({ apiKey: androidApiKey });
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="recipe/[id]" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen
        name="cook-feed"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="dietary-restrictions"
        options={{ headerBackTitle: "Back" }}
      />
      <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <RecipeQueueProvider>
            <RootLayoutNav />
            <ProcessingQueue />
          </RecipeQueueProvider>
          <StatusBar style="dark" />
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
