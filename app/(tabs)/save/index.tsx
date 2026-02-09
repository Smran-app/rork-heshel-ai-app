import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Play, Flame, Bookmark, Youtube, Camera } from "lucide-react-native";
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import Colors from "@/constants/colors";
import { fetchRecipes, APIRecipe } from "@/lib/api";
import AddRecipeModal from "@/components/AddRecipeModal";
import { useRecipeQueue } from "@/providers/RecipeQueueProvider";

export default function SaveScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const { addImagesToQueue } = useRecipeQueue();

  const { data: recipes = [], isLoading } = useQuery<APIRecipe[]>({
    queryKey: ["recipes"],
    queryFn: fetchRecipes,
  });

  const handlePickImages = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Please allow access to your photo library to upload recipe images.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (result.canceled || result.assets.length === 0) {
        console.log("[Save] Image picker cancelled");
        return;
      }

      const uris = result.assets.map((asset) => asset.uri);
      console.log("[Save] Picked", uris.length, "images for recipe");
      addImagesToQueue(uris);
    } catch (err) {
      console.error("[Save] Image picker error:", err);
      Alert.alert("Error", "Failed to pick images. Please try again.");
    }
  }, [addImagesToQueue]);

  const renderRecipe = ({ item }: { item: APIRecipe }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      testID={`saved-${item.id}`}
      onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: String(item.id) } })}
    >
      {item.video?.thumbnail_url ? (
        <View>
          <Image source={{ uri: item.video.thumbnail_url }} style={styles.image} contentFit="cover" />
          <View style={styles.playOverlay}>
            <Play size={16} color={Colors.light.white} fill={Colors.light.white} />
          </View>
        </View>
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.overlay}>
        {item.video?.author_name ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.video.author_name}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
          <Bookmark size={18} color={Colors.light.tint} fill={Colors.light.tint} />
        </View>
        <View style={styles.metaRow}>
          {item.cuisine_type ? (
            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineText}>{item.cuisine_type}</Text>
            </View>
          ) : null}
          {item.effort_level ? (
            <View style={styles.effortBadge}>
              <Flame size={10} color={Colors.light.accent} />
              <Text style={styles.effortText}>{item.effort_level}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{item.ingredients.length} ingredients</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Saved Recipes" }} />
      <AddRecipeModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderRecipe}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No saved recipes yet</Text>
            </View>
          }
        />
      )}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={styles.fabSecondary}
          activeOpacity={0.85}
          onPress={handlePickImages}
          testID="add-recipe-images-fab"
        >
          <Camera size={20} color={Colors.light.tint} />
          <Text style={styles.fabSecondaryText}>From Images</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabPrimary}
          activeOpacity={0.85}
          onPress={() => setShowAddModal(true)}
          testID="add-recipe-fab"
        >
          <Youtube size={20} color={Colors.light.white} />
          <Text style={styles.fabPrimaryText}>YouTube</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
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
  imagePlaceholder: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.tint,
  },
  imagePlaceholderText: {
    fontSize: 40,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  playOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
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
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.light.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  cuisineBadge: {
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cuisineText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  effortBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  effortText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.light.accent,
    textTransform: "capitalize" as const,
  },
  meta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
  fabRow: {
    position: "absolute",
    bottom: 24,
    right: 20,
    left: 20,
    flexDirection: "row",
    gap: 10,
  },
  fabSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.white,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fabSecondaryText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.tint,
  },
  fabPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPrimaryText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
});
