import { Stack } from "expo-router";
import { ChevronRight, Settings, Bell, Heart, CircleHelp } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

import Colors from "@/constants/colors";

const menuItems = [
  { icon: Settings, label: "Preferences", id: "prefs" },
  { icon: Bell, label: "Notifications", id: "notif" },
  { icon: Heart, label: "Dietary Restrictions", id: "diet" },
  { icon: CircleHelp, label: "Help & Support", id: "help" },
];

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>C</Text>
          </View>
          <Text style={styles.name}>Chef</Text>
          <Text style={styles.email}>chef@heshel.ai</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>6</Text>
            <Text style={styles.statLabel}>Ingredients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Cooked</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              testID={`menu-${item.id}`}
            >
              <item.icon size={20} color={Colors.light.tint} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
          ))}
        </View>
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
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
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
  statNumber: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.light.tint,
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
});
