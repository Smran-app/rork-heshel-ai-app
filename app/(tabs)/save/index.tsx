import { Stack } from "expo-router";
import { Image } from "expo-image";
import { ExternalLink, Bookmark } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";

import Colors from "@/constants/colors";
import { savedRecipes } from "@/mocks/ingredients";

export default function SaveScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Saved Recipes" }} />
      <FlatList
        data={savedRecipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.8} testID={`saved-${item.id}`}>
            <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" />
            <View style={styles.overlay}>
              <View style={styles.badge}>
                <ExternalLink size={12} color={Colors.light.white} />
                <Text style={styles.badgeText}>{item.source}</Text>
              </View>
            </View>
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Bookmark size={18} color={Colors.light.tint} fill={Colors.light.tint} />
              </View>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
              <Text style={styles.meta}>{item.ingredientCount} ingredients required</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No saved recipes yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  list: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.light.white,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 180,
  },
  overlay: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.light.white,
    fontWeight: "600" as const,
  },
  info: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.light.text,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: Colors.light.tint,
    marginTop: 6,
    fontWeight: "500" as const,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
});
