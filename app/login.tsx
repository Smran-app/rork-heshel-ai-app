import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, User, ArrowRight } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

type AuthMode = "login" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogle = async () => {
    try {
      setLoadingProvider("google");
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    try {
      setLoadingProvider("apple");
      await signInWithApple();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      Alert.alert("Missing Name", "Please enter your name to create an account.");
      return;
    }
    try {
      setLoadingProvider("email");
      if (mode === "signup") {
        const result = await signUpWithEmail(email.trim(), password, name.trim());
        if (result.session === null) {
          Alert.alert("Check Your Email", "We sent a confirmation link to your email. Please verify to continue.");
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      const lowerMsg = message.toLowerCase();
      if (mode === "login" && (lowerMsg.includes("invalid login") || lowerMsg.includes("invalid credentials"))) {
        Alert.alert(
          "Sign In Failed",
          "Invalid email or password. If you previously signed in with Google or Apple, please use that method instead.",
        );
      } else if (mode === "signup" && lowerMsg.includes("already registered")) {
        Alert.alert(
          "Account Exists",
          "This email is already registered. Try signing in, or use Google/Apple if you originally signed up that way.",
        );
      } else {
        Alert.alert(mode === "signup" ? "Sign Up Failed" : "Sign In Failed", message);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#FFF8F2", "#E8F0E4", "#D4E8CD"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.logoSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("@/assets/images/mascot.png")}
              style={styles.mascot}
              contentFit="contain"
            />
            <Text style={styles.appName}>Heshel AI</Text>
            <Text style={styles.tagline}>Your personal kitchen companion</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.formCard}>
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, mode === "login" && styles.tabActive]}
                  onPress={() => setMode("login")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === "signup" && styles.tabActive]}
                  onPress={() => setMode("signup")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {mode === "signup" && (
                <View style={styles.inputRow}>
                  <User size={18} color="#8A9A7B" />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#A0AE96"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    testID="name-input"
                  />
                </View>
              )}

              <View style={styles.inputRow}>
                <Mail size={18} color="#8A9A7B" />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#A0AE96"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="email-input"
                />
              </View>

              <View style={styles.inputRow}>
                <Lock size={18} color="#8A9A7B" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#A0AE96"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  testID="password-input"
                />
              </View>

              <TouchableOpacity
                style={styles.emailButton}
                activeOpacity={0.8}
                onPress={handleEmailAuth}
                disabled={!!loadingProvider}
                testID="email-auth-button"
              >
                {loadingProvider === "email" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.emailButtonText}>
                      {mode === "signup" ? "Create Account" : "Sign In"}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              activeOpacity={0.8}
              onPress={handleGoogle}
              disabled={!!loadingProvider}
              testID="google-sign-in"
            >
              {loadingProvider === "google" ? (
                <ActivityIndicator color={Colors.light.text} />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={styles.appleButton}
                activeOpacity={0.8}
                onPress={handleApple}
                disabled={!!loadingProvider}
                testID="apple-sign-in"
              >
                {loadingProvider === "apple" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.appleIcon}></Text>
                    <Text style={styles.appleText}>Continue with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <Text style={styles.disclaimer}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 20,
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800" as const,
    color: Colors.light.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  buttonsSection: {
    gap: 14,
    marginTop: 24,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#EDF3E8",
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#8A9A7B",
  },
  tabTextActive: {
    color: Colors.light.text,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    paddingVertical: Platform.OS === "ios" ? 0 : 10,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A7C3F",
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 2,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C8D4BF",
  },
  dividerText: {
    fontSize: 13,
    color: "#8A9A7B",
    fontWeight: "500" as const,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#4285F4",
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  appleIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  appleText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
