import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ChefHat,
  ExternalLink,
  Flame,
  Play,
  Sparkles,
  UtensilsCrossed,
  ShoppingCart,
  Check,
  Circle,
} from "lucide-react-native";
import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { fetchRecipes, APIRecipe, fetchRecipeIngredientsRequired } from "@/lib/api";

interface ParsedShoppingItem {
  name: string;
  quantity: string;
  unit: string;
}

function parseIngredientString(raw: string): ParsedShoppingItem {
  try {
    const cleaned = raw
      .replace(/'/g, '"')
      .replace(/None/g, '"not specified"')
      .replace(/True/g, '"true"')
      .replace(/False/g, '"false"');
    const parsed = JSON.parse(cleaned);
    return {
      name: parsed.name ?? "Unknown",
      quantity: parsed.quantity ?? "not specified",
      unit: parsed.unit ?? "not specified",
    };
  } catch {
    const nameMatch = raw.match(/'name':\s*'([^']+)'/);
    const qtyMatch = raw.match(/'quantity':\s*'([^']+)'/);
    const unitMatch = raw.match(/'unit':\s*'([^']+)'/);
    return {
      name: nameMatch?.[1] ?? raw.slice(0, 30),
      quantity: qtyMatch?.[1] ?? "not specified",
      unit: unitMatch?.[1] ?? "not specified",
    };
  }
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data: recipes = [], isLoading } = useQuery<APIRecipe[]>({
    queryKey: ["recipes"],
    queryFn: fetchRecipes,
  });

  const rawRecipe = recipes.find((r) => String(r.id) === id);

  const recipe = rawRecipe
    ? {
        ...rawRecipe,
        name: rawRecipe.name ?? "Untitled Recipe",
        description: rawRecipe.description ?? "",
        ingredients: rawRecipe.ingredients ?? [],
        technique_hints: rawRecipe.technique_hints ?? [],
        cuisine_type: rawRecipe.cuisine_type ?? "",
        effort_level: rawRecipe.effort_level ?? "",
        vibe: rawRecipe.vibe ?? "",
      }
    : null;

  const recipeId = rawRecipe?.id ?? 0;

  const { data: ingredientsRequired = [], isLoading: shoppingLoading } = useQuery<string[]>({
    queryKey: ["ingredientsRequired", recipeId],
    queryFn: () => fetchRecipeIngredientsRequired(recipeId),
    enabled: recipeId > 0,
  });

  const shoppingItems = useMemo(() => {
    return ingredientsRequired.map(parseIngredientString);
  }, [ingredientsRequired]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const openVideo = useCallback(() => {
    if (recipe?.video?.link) {
      console.log("[Recipe] Opening video:", recipe.video.link);
      Linking.openURL(recipe.video.link);
    }
  }, [recipe?.video?.link]);

  const toggleChecked = useCallback((idx: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const checkedCount = checkedItems.size;
  const totalItems = shoppingItems.length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Recipe" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Recipe" }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: (recipe.name?.length ?? 0) > 28 ? recipe.name.slice(0, 28) + "..." : recipe.name }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {recipe.video?.thumbnail_url ? (
            <TouchableOpacity activeOpacity={0.9} onPress={openVideo} style={styles.heroWrap}>
              <Image
                source={{ uri: recipe.video.thumbnail_url }}
                style={styles.heroImage}
                contentFit="cover"
              />
              <View style={styles.heroOverlay} />
              <View style={styles.playButton}>
                <Play size={28} color={Colors.light.white} fill={Colors.light.white} />
              </View>
              {recipe.video.author_name ? (
                <View style={styles.authorBadge}>
                  <Text style={styles.authorText}>{recipe.video.author_name}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}

          <View style={styles.headerSection}>
            <Text style={styles.recipeName}>{recipe.name}</Text>

            <View style={styles.metaRow}>
              {recipe.cuisine_type ? (
                <View style={styles.metaChip}>
                  <ChefHat size={13} color={Colors.light.tint} />
                  <Text style={styles.metaChipText}>{recipe.cuisine_type}</Text>
                </View>
              ) : null}
              {recipe.effort_level ? (
                <View style={[styles.metaChip, styles.effortChip]}>
                  <Flame size={13} color={Colors.light.accent} />
                  <Text style={[styles.metaChipText, styles.effortChipText]}>{recipe.effort_level}</Text>
                </View>
              ) : null}
              {recipe.vibe ? (
                <View style={[styles.metaChip, styles.vibeChip]}>
                  <Sparkles size={13} color="#8B5CF6" />
                  <Text style={[styles.metaChipText, styles.vibeChipText]}>{recipe.vibe}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {recipe.video?.link ? (
            <TouchableOpacity style={styles.watchBtn} activeOpacity={0.8} onPress={openVideo}>
              <Play size={18} color={Colors.light.white} fill={Colors.light.white} />
              <Text style={styles.watchBtnText}>Watch on YouTube</Text>
              <ExternalLink size={14} color={Colors.light.white} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <UtensilsCrossed size={18} color={Colors.light.tint} />
              <Text style={styles.sectionTitle}>
                Ingredients ({recipe.ingredients.length})
              </Text>
            </View>
            {recipe.ingredients.map((ing, idx) => (
              <View key={`${ing.name}-${idx}`} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
                {ing.quantity !== "not specified" || ing.unit !== "not specified" ? (
                  <Text style={styles.ingredientQty}>
                    {ing.quantity !== "not specified" ? ing.quantity : ""}
                    {ing.unit !== "not specified" ? ` ${ing.unit}` : ""}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.shoppingSection}>
            <View style={styles.shoppingHeader}>
              <View style={styles.shoppingTitleRow}>
                <View style={styles.shoppingIconWrap}>
                  <ShoppingCart size={18} color={Colors.light.white} />
                </View>
                <View style={styles.shoppingTitleGroup}>
                  <Text style={styles.shoppingTitle}>Shopping List</Text>
                  {totalItems > 0 && (
                    <Text style={styles.shoppingCount}>
                      {checkedCount}/{totalItems} items
                    </Text>
                  )}
                </View>
              </View>
              {totalItems > 0 && (
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` as any },
                    ]}
                  />
                </View>
              )}
            </View>

            {shoppingLoading ? (
              <View style={styles.shoppingLoading}>
                <ActivityIndicator size="small" color={Colors.light.tint} />
                <Text style={styles.shoppingLoadingText}>Fetching shopping list...</Text>
              </View>
            ) : shoppingItems.length > 0 ? (
              <View style={styles.shoppingList}>
                {shoppingItems.map((item, idx) => {
                  const isChecked = checkedItems.has(idx);
                  return (
                    <TouchableOpacity
                      key={`shop-${idx}`}
                      style={[styles.shopItem, isChecked && styles.shopItemChecked]}
                      activeOpacity={0.7}
                      onPress={() => toggleChecked(idx)}
                      testID={`shop-item-${idx}`}
                    >
                      <View style={[styles.checkCircle, isChecked && styles.checkCircleActive]}>
                        {isChecked ? (
                          <Check size={12} color={Colors.light.white} />
                        ) : (
                          <Circle size={12} color={Colors.light.tabIconDefault} />
                        )}
                      </View>
                      <View style={styles.shopItemInfo}>
                        <Text
                          style={[styles.shopItemName, isChecked && styles.shopItemNameChecked]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {item.quantity !== "not specified" || item.unit !== "not specified" ? (
                          <Text style={[styles.shopItemQty, isChecked && styles.shopItemQtyChecked]}>
                            {item.quantity !== "not specified" ? item.quantity : ""}
                            {item.unit !== "not specified" ? ` ${item.unit}` : ""}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.shoppingEmpty}>
                <Text style={styles.shoppingEmptyText}>No shopping list available for this recipe.</Text>
              </View>
            )}
          </View>

          {recipe.technique_hints.length > 0 ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Sparkles size={18} color={Colors.light.accent} />
                <Text style={styles.sectionTitle}>Technique & Steps</Text>
              </View>
              {recipe.technique_hints.map((hint, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{hint}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {recipe.description ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <Text style={styles.descriptionText}>{recipe.description}</Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.white,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroWrap: {
    position: "relative" as const,
    width: "100%" as const,
    height: 220,
  },
  heroImage: {
    width: "100%" as const,
    height: 220,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playButton: {
    position: "absolute" as const,
    top: "50%" as const,
    left: "50%" as const,
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  authorBadge: {
    position: "absolute" as const,
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  authorText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#fff",
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  recipeName: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.light.text,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.tint,
    textTransform: "capitalize" as const,
  },
  effortChip: {
    backgroundColor: Colors.light.accentLight,
  },
  effortChipText: {
    color: Colors.light.accent,
  },
  vibeChip: {
    backgroundColor: "#EDE9FE",
  },
  vibeChipText: {
    color: "#8B5CF6",
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#CC0000",
    paddingVertical: 14,
    borderRadius: 14,
  },
  watchBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.light.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.tint,
    marginRight: 10,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  ingredientQty: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.light.tintLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.light.tint,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.text,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.textSecondary,
  },
  shoppingSection: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.light.white,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  shoppingHeader: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  shoppingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  shoppingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  shoppingTitleGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shoppingTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  shoppingCount: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.8)",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.white,
  },
  shoppingLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
  },
  shoppingLoadingText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  shoppingList: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  shopItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 12,
    gap: 12,
  },
  shopItemChecked: {
    backgroundColor: Colors.light.tintLight,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  shopItemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shopItemName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
    flex: 1,
  },
  shopItemNameChecked: {
    textDecorationLine: "line-through",
    color: Colors.light.tabIconDefault,
  },
  shopItemQty: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
    marginLeft: 8,
  },
  shopItemQtyChecked: {
    color: Colors.light.tabIconDefault,
    textDecorationLine: "line-through",
  },
  shoppingEmpty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  shoppingEmptyText: {
    fontSize: 13,
    color: Colors.light.tabIconDefault,
  },
});
