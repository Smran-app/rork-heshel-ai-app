import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Play, Flame } from "lucide-react-native";
import React, { useRef, useEffect } from "react";
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
            <Image
              source={require("@/assets/images/mascot.png")}
              style={styles.mascotSmall}
              contentFit="contain"
            />
          </View>

          <TouchableOpacity activeOpacity={0.85} testID="cook-suggestion-card">
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
                ListEmptyComponent={
                  <Text style={styles.emptyIngredients}>No ingredients yet</Text>
                }
              />
            )}
          </View>

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
            ) : recipes.length === 0 ? (
              <Text style={styles.emptyIngredients}>No recipes yet</Text>
            ) : (
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
            )}
          </View>

          <LinearGradient
            colors={["#E8F0E4", "#D4E8CD"]}
            style={styles.shoppingBanner}
          >
            <Text style={styles.shoppingText}>
              You&apos;re 5 ingredients away from tonight&apos;s dinner.
            </Text>
            <TouchableOpacity
              style={styles.shoppingButton}
              testID="view-shopping-list"
            >
              <Text style={styles.shoppingButtonText}>View shopping list</Text>
            </TouchableOpacity>
          </LinearGradient>
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
  mascotSmall: {
    width: 60,
    height: 60,
    marginLeft: 8,
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
    marginBottom: 14,
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
    width: 110,
    height: 110,
    marginLeft: -10,
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
    textAlign: "center",
  },
  ingredientQty: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  recipeCard: {
    flexDirection: "row",
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
    justifyContent: "center",
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
  shoppingBanner: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 10,
  },
  shoppingText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  shoppingButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  shoppingButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  ingredientLoading: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  ingredientPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.tint,
  },
  ingredientPlaceholderText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  emptyIngredients: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    paddingVertical: 20,
  },
});
