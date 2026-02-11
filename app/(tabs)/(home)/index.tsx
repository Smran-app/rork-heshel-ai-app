import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronRight,
  Play,
  Flame,
  Plus,
  Youtube,
  Lock,
  ScanLine,
  Camera,
} from "lucide-react-native";
import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { fetchIngredients, fetchRecipes, APIIngredient, APIRecipe } from "@/lib/api";
import AddRecipeModal from "@/components/AddRecipeModal";

const INGREDIENT_CARD_WIDTH = 90;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "Chef";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const handleOpenModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const { data: ingredients = [], isLoading: ingredientsLoading } = useQuery<APIIngredient[]>({
    queryKey: ["ingredients"],
    queryFn: fetchIngredients,
  });

  const { data: recipes = [], isLoading: recipesLoading } = useQuery<APIRecipe[]>({
    queryKey: ["recipes"],
    queryFn: fetchRecipes,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasIngredients = ingredients.length > 0;
  const hasRecipes = recipes.length > 0;

  const navigateToKitchen = useCallback(() => {
    router.push("/(tabs)/kitchen" as any);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
              <Text style={styles.subtitle}>
                What would you like to cook today?
              </Text>
            </View>
          </View>

          {hasIngredients ? (
            <TouchableOpacity activeOpacity={0.85} testID="cook-suggestion-card" onPress={() => router.push("/cook-feed" as any)}>
              <LinearGradient
                colors={["#C5DBC0", "#D9ECCC", "#E8F5E0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.suggestionCard}
              >
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionTitle}>
                    What should I cook?
                  </Text>
                  <Text style={styles.suggestionSubtitle}>
                    Based on your kitchen & saved ideas
                  </Text>
                  <View style={styles.suggestionButton}>
                    <ChevronRight size={20} color={Colors.light.white} />
                  </View>
                </View>
                <Image
                  source={require("@/assets/images/mascot.png")}
                  style={styles.mascotLarge}
                  contentFit="contain"
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.85} testID="cook-suggestion-card-locked" onPress={navigateToKitchen}>
              <LinearGradient
                colors={["#C5DBC0", "#D9ECCC", "#E8F5E0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.suggestionCard}
              >
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionTitle}>
                    What should I cook?
                  </Text>
                  <Text style={styles.suggestionSubtitle}>
                    Add ingredients to unlock smart suggestions
                  </Text>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, styles.dotGreen]} />
                    <View style={[styles.dot, styles.dotLightGreen]} />
                    <View style={[styles.dot, styles.dotLighter]} />
                    <View style={[styles.dot, styles.dotLightest]} />
                  </View>
                  <View style={styles.addIngredientsBtn}>
                    <Lock size={14} color={Colors.light.white} />
                    <Text style={styles.addIngredientsBtnText}>Add ingredients</Text>
                  </View>
                </View>
                <Image
                  source={require("@/assets/images/mascot.png")}
                  style={styles.mascotLarge}
                  contentFit="contain"
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {hasIngredients ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What&apos;s in your kitchen?</Text>
              {ingredientsLoading ? (
                <View style={styles.ingredientLoading}>
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                </View>
              ) : (
                <FlatList
                  data={ingredients}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={styles.ingredientList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.ingredientCard}
                      activeOpacity={0.7}
                      testID={`ingredient-${item.id}`}
                    >
                      <View style={styles.ingredientImageWrap}>
                        {item.global?.image ? (
                          <Image
                            source={{ uri: item.global.image }}
                            style={styles.ingredientImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.ingredientImage, styles.ingredientPlaceholder]}>
                            <Text style={styles.ingredientPlaceholderText}>
                              {(item.global?.name ?? item.name).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.ingredientName}>{item.global?.name ?? item.name}</Text>
                      <Text style={styles.ingredientQty}>{item.quantity} {item.unit}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          ) : (
            <View style={styles.emptyKitchenSection}>
              <Text style={styles.emptyKitchenTitle}>
                Your kitchen is empty {"\u2014"} let&apos;s fix that
              </Text>
              <Text style={styles.emptyKitchenSubtitle}>
                Add ingredients you already have and Heshel will suggest what you can cook right away.
              </Text>

              <View style={styles.emptyKitchenActions}>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  activeOpacity={0.7}
                  testID="scan-grocery-btn"
                  onPress={navigateToKitchen}
                >
                  <View style={styles.emptyActionIcon}>
                    <ScanLine size={18} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.emptyActionText}>Scan a grocery bill</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  activeOpacity={0.7}
                  testID="upload-fridge-btn"
                  onPress={navigateToKitchen}
                >
                  <View style={styles.emptyActionIcon}>
                    <Camera size={18} color={Colors.light.accent} />
                  </View>
                  <Text style={styles.emptyActionText}>Upload fridge photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.emptyKitchenHint}>Start with just 3-5 items</Text>

              <TouchableOpacity
                style={styles.manualAddBtn}
                activeOpacity={0.7}
                onPress={navigateToKitchen}
                testID="manual-add-btn"
              >
                <Plus size={16} color={Colors.light.tint} />
                <Text style={styles.manualAddText}>Or add manually</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Recipes</Text>
              {recipes.length > 3 ? (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/save" as any)}
                  activeOpacity={0.7}
                  testID="see-all-recipes"
                >
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {recipesLoading ? (
              <View style={styles.ingredientLoading}>
                <ActivityIndicator size="small" color={Colors.light.tint} />
              </View>
            ) : hasRecipes ? (
              recipes.slice(0, 3).map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeCard}
                  activeOpacity={0.8}
                  testID={`recipe-${recipe.id}`}
                  onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: String(recipe.id) } })}
                >
                  {recipe.video?.thumbnail_url ? (
                    <View style={styles.recipeImageWrap}>
                      <Image
                        source={{ uri: recipe.video.thumbnail_url }}
                        style={styles.recipeImage}
                        contentFit="cover"
                      />
                      <View style={styles.playBadge}>
                        <Play size={12} color={Colors.light.white} fill={Colors.light.white} />
                      </View>
                    </View>
                  ) : recipe.image ? (
                    <Image
                      source={{ uri: recipe.image }}
                      style={styles.recipeImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
                      <Text style={styles.recipeImagePlaceholderText}>
                        {recipe.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>
                      {recipe.name}
                    </Text>
                    <View style={styles.recipeMetaRow}>
                      {recipe.cuisine_type ? (
                        <View style={styles.cuisineBadge}>
                          <Text style={styles.cuisineBadgeText}>{recipe.cuisine_type}</Text>
                        </View>
                      ) : null}
                      {recipe.effort_level ? (
                        <View style={styles.effortBadge}>
                          <Flame size={10} color={Colors.light.accent} />
                          <Text style={styles.effortText}>{recipe.effort_level}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.recipeSource}>
                      {recipe.ingredients.length} ingredients
                      {recipe.video?.author_name ? ` · ${recipe.video.author_name}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                style={styles.emptyRecipeCard}
                activeOpacity={0.85}
                onPress={handleOpenModal}
                testID="empty-recipe-add"
              >
                <LinearGradient
                  colors={["#FFF8ED", "#FFF3D6"]}
                  style={styles.emptyRecipeGradient}
                >
                  <View style={styles.emptyRecipeLeft}>
                    <View style={styles.emptyRecipeIconRow}>
                      <View style={[styles.emptyRecipeIconBadge, { backgroundColor: "#FF4444" }]}>
                        <Youtube size={12} color={Colors.light.white} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.emptyRecipeContent}>
                    <Text style={styles.emptyRecipeTitle}>Save recipes you love</Text>
                    <Text style={styles.emptyRecipeSubtitle}>
                      Paste YouTube recipe links
                    </Text>
                    <Text style={styles.emptyRecipeUrl}>youtube.com/watch?v=abc123</Text>
                  </View>
                  <View style={styles.emptyRecipePlusWrap}>
                    <Plus size={20} color={Colors.light.accent} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {hasRecipes ? (
            <TouchableOpacity
              style={styles.addRecipeCard}
              activeOpacity={0.85}
              onPress={handleOpenModal}
              testID="add-recipe-btn"
            >
              <LinearGradient
                colors={["#FFF3D6", "#FFE8B8", "#FFDDA0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addRecipeGradient}
              >
                <View style={styles.addRecipeIconWrap}>
                  <Youtube size={22} color={Colors.light.white} />
                </View>
                <View style={styles.addRecipeContent}>
                  <Text style={styles.addRecipeTitle}>Add a Recipe</Text>
                  <Text style={styles.addRecipeSubtitle}>
                    Paste YouTube links to save recipes
                  </Text>
                </View>
                <View style={styles.addRecipePlusWrap}>
                  <Plus size={20} color={Colors.light.accent} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}

          <LinearGradient
            colors={["#E8F0E4", "#D4E8CD"]}
            style={styles.shoppingBanner}
          >
            <Text style={styles.shoppingTitle}>
              We&apos;ll build your shopping list
            </Text>
            <Text style={styles.shoppingSubtitle}>
              Once you add ingredients or recipes, Heshel creates a smart shopping list automatically.
            </Text>
            <TouchableOpacity
              style={styles.shoppingButton}
              testID="get-started-btn"
              onPress={navigateToKitchen}
            >
              <Text style={styles.shoppingButtonText}>Get started</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      <AddRecipeModal
        visible={showAddModal}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },

  suggestionCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
    minHeight: 130,
  },
  suggestionContent: {
    flex: 1,
    zIndex: 1,
  },
  suggestionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  suggestionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  suggestionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  mascotLarge: {
    width: 140,
    height: 140,
    marginLeft: -10,
  },
  dotRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: "#4A7C59",
  },
  dotLightGreen: {
    backgroundColor: "#8CB88A",
  },
  dotLighter: {
    backgroundColor: "#B8D4B4",
  },
  dotLightest: {
    backgroundColor: "#D4E8CD",
  },
  addIngredientsBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start" as const,
    gap: 8,
  },
  addIngredientsBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  ingredientList: {
    gap: 12,
  },
  ingredientCard: {
    width: INGREDIENT_CARD_WIDTH,
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ingredientImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: Colors.light.cardBg,
  },
  ingredientImage: {
    width: 56,
    height: 56,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.text,
    textAlign: "center" as const,
  },
  ingredientQty: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  ingredientPlaceholder: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.tint,
  },
  ingredientPlaceholderText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  ingredientLoading: {
    height: 100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyKitchenSection: {
    marginBottom: 28,
  },
  emptyKitchenTitle: {
    fontSize: 19,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  emptyKitchenSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyKitchenActions: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 14,
  },
  emptyActionBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.light.cardBg,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.text,
    flex: 1,
  },
  emptyKitchenHint: {
    fontSize: 13,
    color: Colors.light.tabIconDefault,
    textAlign: "center" as const,
    marginBottom: 10,
  },
  manualAddBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 10,
  },
  manualAddText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  emptyRecipeCard: {
    marginBottom: 4,
  },
  emptyRecipeGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  emptyRecipeLeft: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyRecipeIconRow: {
    flexDirection: "row" as const,
    gap: 4,
  },
  emptyRecipeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyRecipeContent: {
    flex: 1,
  },
  emptyRecipeTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  emptyRecipeSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  emptyRecipeUrl: {
    fontSize: 11,
    color: Colors.light.tabIconDefault,
    marginTop: 4,
    fontStyle: "italic" as const,
  },
  emptyRecipePlusWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(232,168,56,0.15)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  recipeCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeImageWrap: {
    width: 100,
    height: 100,
    position: "relative" as const,
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  recipeImagePlaceholder: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.tint,
  },
  recipeImagePlaceholderText: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  playBadge: {
    position: "absolute" as const,
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center" as const,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  recipeMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 6,
  },
  cuisineBadge: {
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cuisineBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  effortBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
  recipeSource: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  addRecipeCard: {
    marginBottom: 24,
  },
  addRecipeGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  addRecipeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  addRecipeContent: {
    flex: 1,
  },
  addRecipeTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  addRecipeSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  addRecipePlusWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(232,168,56,0.15)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  shoppingBanner: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 10,
  },
  shoppingTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  shoppingSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  shoppingButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start" as const,
  },
  shoppingButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
});
