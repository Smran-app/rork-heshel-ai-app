import { Stack, useRouter } from "expo-router";
import {
  ChevronRight,
  Heart,
  CircleHelp,
  LogOut,
  ChefHat,
  Leaf,
  Flame,
  Calendar,
} from "lucide-react-native";
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/images/icon.png";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { fetchUserProfile } from "@/lib/api";

const menuItems = [
  {
    icon: Heart,
    label: "Dietary Restrictions",
    id: "diet",
    route: "/dietary-restrictions",
  },
  { icon: CircleHelp, label: "Help & Support", id: "help", route: null },
];

export default function ProfileScreen() {
  const { user, signOut, isHeshelPro } = useAuth();
  const router = useRouter();

  const profileQuery = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    enabled: !!user,
  });

  const profile = profileQuery.data;
  const counts = profile?.counts;

  const displayName =
    profile?.user?.user_metadata?.full_name ??
    profile?.user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Chef";
  const displayEmail = profile?.user?.email ?? user?.email ?? "";
  const initials = displayName.charAt(0).toUpperCase();

  const provider = profile?.user?.app_metadata?.provider ?? "email";
  const memberSince = profile?.user?.created_at
    ? new Date(profile.user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const onRefresh = useCallback(() => {
    profileQuery.refetch();
  }, [profileQuery]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {isHeshelPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{displayEmail}</Text>
          {memberSince && (
            <View style={styles.memberRow}>
              <Calendar size={12} color={Colors.light.tabIconDefault} />
              <Text style={styles.memberSince}>Member since {memberSince}</Text>
            </View>
          )}
          {provider !== "email" && (
            <View style={styles.providerBadge}>
              <Text style={styles.providerText}>
                Signed in via{" "}
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </Text>
            </View>
          )}

          {!isHeshelPro && (
            <TouchableOpacity
              style={styles.upgradeButton}
              activeOpacity={0.8}
              onPress={() => router.push("/paywall" as any)}
            >
              <View style={styles.upgradeContent}>
                <View style={styles.upgradeIcon}>
                  {/* <ChefHat size={20} color={Colors.light.white} /> */}
                  <Image source={logo} style={{ width: 40, height: 40 }} />
                </View>
                <View>
                  <Text style={styles.upgradeTitle}>Upgrade to Heshel Pro</Text>
                  <Text style={styles.upgradeSubtitle}>
                    Get unlimited recipes & more
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.light.white} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          {profileQuery.isLoading ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="small" color={Colors.light.tint} />
            </View>
          ) : (
            <>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: Colors.light.tintLight },
                  ]}
                >
                  <Leaf size={18} color={Colors.light.tint} />
                </View>
                <Text style={styles.statNumber}>
                  {counts?.ingredients ?? 0}
                </Text>
                <Text style={styles.statLabel}>Ingredients</Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: Colors.light.accentLight },
                  ]}
                >
                  <ChefHat size={18} color={Colors.light.accent} />
                </View>
                <Text style={styles.statNumber}>{counts?.recipes ?? 0}</Text>
                <Text style={styles.statLabel}>Recipes</Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[styles.statIconWrap, { backgroundColor: "#FDEAEA" }]}
                >
                  <Flame size={18} color={Colors.light.danger} />
                </View>
                <Text style={styles.statNumber}>{counts?.cooked ?? 0}</Text>
                <Text style={styles.statLabel}>Cooked</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              testID={`menu-${item.id}`}
              onPress={() =>
                item.route ? router.push(item.route as any) : null
              }
            >
              <item.icon size={20} color={Colors.light.tint} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.7}
          onPress={handleSignOut}
          testID="sign-out-button"
        >
          <LogOut size={20} color={Colors.light.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.tintLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: Colors.light.tint,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.danger,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  email: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  providerBadge: {
    marginTop: 8,
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  providerText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  proBadge: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.light.white,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.tint,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    justifyContent: "space-between",
    width: "90%",
  },
  upgradeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  upgradeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statsLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: 20,
    gap: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.white,
    gap: 10,
  },
});
