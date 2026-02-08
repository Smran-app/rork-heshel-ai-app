import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ChefHat,
  Flame,
  Heart,
  Sparkles,
  X,
  ArrowLeft,
  Play,
  ChevronDown,
} from "lucide-react-native";
import React, { useCallback, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { fetchFeedRecipes, FeedRecipe } from "@/lib/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_DOWN_THRESHOLD = 120;

const FUN_MESSAGES = [
  "Great choice! 🍳",
  "Let's get cooking! 🔥",
  "Excellent pick! ✨",
  "You'll love this one! 💛",
  "Chef mode activated! 👨‍🍳",
  "Yum! Good taste! 😋",
];

function getRandomMessage(): string {
  return FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)];
}

interface CardProps {
  recipe: FeedRecipe;
  isTop: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeDown: () => void;
}

function SwipeCard({ recipe, isTop, onSwipeRight, onSwipeLeft, onSwipeDown }: CardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useMemo(() => {
    if (!isTop) return PanResponder.create({});
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Animated.parallel([
            Animated.timing(pan.x, {
              toValue: SCREEN_WIDTH + 100,
              duration: 250,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            onSwipeRight();
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.parallel([
            Animated.timing(pan.x, {
              toValue: -SCREEN_WIDTH - 100,
              duration: 250,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onSwipeLeft();
          });
        } else if (gesture.dy > SWIPE_DOWN_THRESHOLD) {
          Animated.parallel([
            Animated.timing(pan.y, {
              toValue: SCREEN_HEIGHT,
              duration: 250,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onSwipeDown();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    });
  }, [isTop, onSwipeRight, onSwipeLeft, onSwipeDown]);

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const rightLabelOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const leftLabelOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const downLabelOpacity = pan.y.interpolate({
    inputRange: [0, SWIPE_DOWN_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const cardStyle = isTop
    ? {
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        opacity,
        zIndex: 10,
      }
    : {
        transform: [{ scale: 0.95 }],
        opacity: 0.7,
        zIndex: 5,
      };

  const thumbnail = recipe.video?.thumbnail_url ?? null;

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
      testID={`feed-card-${recipe.id}`}
    >
      {thumbnail ? (
        <View style={styles.cardImageWrap}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.cardImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.cardImageGradient}
          />
          {recipe.video?.author_name ? (
            <View style={styles.authorChip}>
              <Play size={10} color="#fff" fill="#fff" />
              <Text style={styles.authorChipText}>{recipe.video.author_name}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.cardImageWrap, styles.cardImagePlaceholder]}>
          <ChefHat size={48} color="rgba(255,255,255,0.6)" />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {recipe.name}
        </Text>

        <View style={styles.chipRow}>
          {recipe.cuisine_type ? (
            <View style={styles.chip}>
              <ChefHat size={12} color={Colors.light.tint} />
              <Text style={styles.chipText}>{recipe.cuisine_type}</Text>
            </View>
          ) : null}
          {recipe.effort_level ? (
            <View style={[styles.chip, styles.effortChip]}>
              <Flame size={12} color={Colors.light.accent} />
              <Text style={[styles.chipText, styles.effortChipText]}>
                {recipe.effort_level}
              </Text>
            </View>
          ) : null}
          {recipe.vibe ? (
            <View style={[styles.chip, styles.vibeChip]}>
              <Sparkles size={12} color="#8B5CF6" />
              <Text style={[styles.chipText, styles.vibeChipText]}>{recipe.vibe}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardIngredients} numberOfLines={2}>
          {recipe.ingredients.map((i) => i.name).join(" · ")}
        </Text>

        {recipe.technique_hints.length > 0 ? (
          <Text style={styles.cardHint} numberOfLines={2}>
            💡 {recipe.technique_hints[0]}
          </Text>
        ) : null}
      </View>

      {isTop ? (
        <>
          <Animated.View
            style={[styles.swipeLabel, styles.swipeLabelRight, { opacity: rightLabelOpacity }]}
          >
            <Heart size={28} color="#fff" fill="#fff" />
            <Text style={styles.swipeLabelText}>COOK</Text>
          </Animated.View>
          <Animated.View
            style={[styles.swipeLabel, styles.swipeLabelLeft, { opacity: leftLabelOpacity }]}
          >
            <X size={28} color="#fff" />
            <Text style={styles.swipeLabelText}>SKIP</Text>
          </Animated.View>
          <Animated.View
            style={[styles.swipeLabel, styles.swipeLabelDown, { opacity: downLabelOpacity }]}
          >
            <ChevronDown size={28} color="#fff" />
            <Text style={styles.swipeLabelText}>NEXT</Text>
          </Animated.View>
        </>
      ) : null}
    </Animated.View>
  );
}

export default function CookFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [choiceMessage, setChoiceMessage] = useState<string | null>(null);
  const messageAnim = useRef(new Animated.Value(0)).current;


  const { data: feedRecipes = [], isLoading, isError, refetch } = useQuery<FeedRecipe[]>({
    queryKey: ["feed-recipes"],
    queryFn: () => fetchFeedRecipes("comfort", "low", 10),
  });

  const showChoiceMessage = useCallback((recipeId: number) => {
    const msg = getRandomMessage();
    setChoiceMessage(msg);

    messageAnim.setValue(0);
    Animated.sequence([
      Animated.timing(messageAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(messageAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setChoiceMessage(null);
      router.push({ pathname: "/recipe/[id]", params: { id: String(recipeId) } });

    });
  }, [router, messageAnim]);

  const handleSwipeRight = useCallback(() => {
    const recipe = feedRecipes[currentIndex];
    if (!recipe) return;
    console.log("[Feed] Swiped right on:", recipe.name);
    setCurrentIndex((prev) => prev + 1);
    showChoiceMessage(recipe.id);
  }, [currentIndex, feedRecipes, showChoiceMessage]);

  const handleSwipeLeft = useCallback(() => {
    console.log("[Feed] Swiped left, skipping");
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleSwipeDown = useCallback(() => {
    console.log("[Feed] Swiped down, next");
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const remaining = feedRecipes.slice(currentIndex);
  const allSwiped = feedRecipes.length > 0 && currentIndex >= feedRecipes.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          testID="feed-back-btn"
        >
          <ArrowLeft size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>What to Cook?</Text>
          <Text style={styles.headerSubtitle}>
            {feedRecipes.length > 0
              ? `${currentIndex + 1} / ${feedRecipes.length}`
              : "Finding recipes..."}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <View style={styles.cardArea}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Finding recipes for you...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Could not load recipes</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : allSwiped ? (
          <View style={styles.centered}>
            <Sparkles size={48} color={Colors.light.tint} />
            <Text style={styles.emptyTitle}>That&apos;s all for now!</Text>
            <Text style={styles.emptySubtitle}>
              Come back later for more recipe ideas
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setCurrentIndex(0);
                refetch();
              }}
            >
              <Text style={styles.retryBtnText}>Refresh Feed</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {remaining
              .slice(0, 2)
              .reverse()
              .map((recipe, idx) => {
                const isTop = idx === (Math.min(remaining.length, 2) - 1);
                return (
                  <SwipeCard
                    key={`${recipe.id}-${currentIndex}`}
                    recipe={recipe}
                    isTop={isTop}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeDown={handleSwipeDown}
                  />
                );
              })}
          </>
        )}

        {choiceMessage ? (
          <Animated.View
            style={[
              styles.choiceOverlay,
              {
                opacity: messageAnim,
                transform: [
                  {
                    scale: messageAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.choiceBubble}>
              <Text style={styles.choiceText}>{choiceMessage}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.skipBtn]}
          onPress={handleSwipeLeft}
          disabled={allSwiped || isLoading}
          testID="feed-skip-btn"
        >
          <X size={26} color={Colors.light.danger} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.nextBtn]}
          onPress={handleSwipeDown}
          disabled={allSwiped || isLoading}
          testID="feed-next-btn"
        >
          <ChevronDown size={26} color={Colors.light.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.cookBtn]}
          onPress={handleSwipeRight}
          disabled={allSwiped || isLoading}
          testID="feed-cook-btn"
        >
          <Heart size={26} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: Colors.light.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardImageWrap: {
    width: "100%",
    height: CARD_HEIGHT * 0.45,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  authorChip: {
    position: "absolute",
    bottom: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  authorChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#fff",
  },
  cardBody: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.light.text,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 11,
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
  cardIngredients: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  cardHint: {
    fontSize: 12,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    overflow: "hidden",
    lineHeight: 18,
  },
  swipeLabel: {
    position: "absolute",
    top: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swipeLabelRight: {
    left: 16,
    backgroundColor: Colors.light.tint,
  },
  swipeLabelLeft: {
    right: 16,
    backgroundColor: Colors.light.danger,
  },
  swipeLabelDown: {
    left: "50%",
    marginLeft: -50,
    top: "auto",
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  swipeLabelText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 1,
  },
  choiceOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  choiceBubble: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  choiceText: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: "#fff",
    textAlign: "center",
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingTop: 12,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  skipBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: Colors.light.danger,
  },
  nextBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  cookBtn: {
    backgroundColor: Colors.light.tint,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },
  errorText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#fff",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#fff",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: "#fff",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
    textAlign: "center",
  },
});
