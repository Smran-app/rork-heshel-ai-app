import createContextHook from "@nkzw/create-context-hook";
import { Session, User } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState, useCallback } from "react";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { supabase } from "@/lib/supabase";
import { saveToken, clearToken } from "@/lib/api";

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "com.heshel.app",
  path: "auth/callback",
});

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHeshelPro, setIsHeshelPro] = useState<boolean>(false);

  const checkEntitlements = useCallback((customerInfo: CustomerInfo) => {
    const entitlements = customerInfo.entitlements.active;
    const isPro = !!entitlements["Heshel Pro"];
    console.log("[Auth] Is Heshel Pro:", isPro);
    setIsHeshelPro(isPro);
  }, []);

  useEffect(() => {
    const setupPurchases = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        checkEntitlements(customerInfo);
      } catch (e) {
        console.error("[Auth] Error getting customer info:", e);
      }
    };

    Purchases.addCustomerInfoUpdateListener(checkEntitlements);
    setupPurchases();
  }, [checkEntitlements]);

  useEffect(() => {
    if (user) {
      console.log("[Auth] Logging into Purchases with:", user.id);
      Purchases.logIn(user.id).then(({ customerInfo }) => {
        checkEntitlements(customerInfo);
      });
    } else {
      console.log("[Auth] Logging out of Purchases");
      Purchases.logOut().then(() => {
        setIsHeshelPro(false);
      });
    }
  }, [user, checkEntitlements]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log("[Auth] Initial session:", s ? "found" : "none");
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.access_token) {
        saveToken(s.access_token);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log("[Auth] State changed:", _event);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.access_token) {
        saveToken(s.access_token);
      } else if (_event === "SIGNED_OUT") {
        clearToken();
      }
      setIsLoading(false);
    });

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
          redirectUri,
        );

        console.log("[Auth] Browser result type:", result.type);

        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(
            url.hash ? url.hash.substring(1) : url.search.substring(1),
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
          redirectUri,
        );

        console.log("[Auth] Browser result type:", result.type);

        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(
            url.hash ? url.hash.substring(1) : url.search.substring(1),
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

  const signInWithAppleNative = useCallback(async (identityToken: string) => {
    try {
      console.log("[Auth] Starting Apple native sign-in session setup");
      const {
        data: { session: s },
        error,
      } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: identityToken,
      });

      if (error) {
        console.error("[Auth] Apple native sign-in error:", error.message);
        throw error;
      }

      if (s) {
        console.log("[Auth] Apple native sign-in successful");
        setSession(s);
        setUser(s.user);
        saveToken(s.access_token);
      }
      return { session: s, error };
    } catch (err) {
      console.error("[Auth] Apple native sign-in failed:", err);
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string) => {
      console.log("[Auth] Starting email sign-up for:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, display_name: name },
        },
      });
      if (error) {
        console.error("[Auth] Email sign-up error:", error.message);
        throw error;
      }
      console.log(
        "[Auth] Email sign-up result:",
        data.session ? "session created" : "confirmation needed",
      );
      return data;
    },
    [],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      console.log("[Auth] Starting email sign-in for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error("[Auth] Email sign-in error:", error.message);
        throw error;
      }
      console.log("[Auth] Email sign-in successful");
      return data;
    },
    [],
  );

  const signOut = useCallback(async () => {
    console.log("[Auth] Signing out");
    await clearToken();
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
    isHeshelPro,
    signInWithGoogle,
    signInWithApple,
    signInWithAppleNative,
    signUpWithEmail,
    signInWithEmail,
    signOut,
  };
});
