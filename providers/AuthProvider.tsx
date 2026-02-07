import createContextHook from "@nkzw/create-context-hook";
import { Session, User } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "heshelai",
  path: "auth/callback",
});

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log("[Auth] Initial session:", s ? "found" : "none");
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        console.log("[Auth] State changed:", _event);
        setSession(s);
        setUser(s?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      console.log("[Auth] Starting Google sign-in, redirect:", redirectUri);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[Auth] Google OAuth error:", error.message);
        throw error;
      }

      if (data?.url) {
        console.log("[Auth] Opening browser for Google auth");
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        console.log("[Auth] Browser result type:", result.type);

        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(
            url.hash ? url.hash.substring(1) : url.search.substring(1)
          );
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error("[Auth] Set session error:", sessionError.message);
              throw sessionError;
            }
            console.log("[Auth] Google sign-in successful");
          }
        }
      }
    } catch (err) {
      console.error("[Auth] Google sign-in failed:", err);
      throw err;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      console.log("[Auth] Starting Apple sign-in, redirect:", redirectUri);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("[Auth] Apple OAuth error:", error.message);
        throw error;
      }

      if (data?.url) {
        console.log("[Auth] Opening browser for Apple auth");
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        console.log("[Auth] Browser result type:", result.type);

        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(
            url.hash ? url.hash.substring(1) : url.search.substring(1)
          );
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error("[Auth] Set session error:", sessionError.message);
              throw sessionError;
            }
            console.log("[Auth] Apple sign-in successful");
          }
        }
      }
    } catch (err) {
      console.error("[Auth] Apple sign-in failed:", err);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log("[Auth] Signing out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[Auth] Sign out error:", error.message);
      throw error;
    }
  }, []);

  return {
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };
});
