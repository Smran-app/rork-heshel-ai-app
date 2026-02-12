import { Stack } from "expo-router";
import {
  Wheat,
  Milk,
  Egg,
  Fish,
  Nut,
  Bean,
  Leaf,
  X,
  Check,
  Loader,
} from "lucide-react-native";
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import {
  fetchDietaryRestrictions,
  createDietaryRestrictions,
  updateDietaryRestrictions,
  DietaryPayload,
} from "@/lib/api";

interface DietaryItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const COMMON_ALLERGIES: DietaryItem[] = [
  { id: "gluten", label: "Gluten", icon: "wheat", color: "#D97706", bgColor: "#FEF3C7" },
  { id: "dairy", label: "Dairy", icon: "milk", color: "#2563EB", bgColor: "#DBEAFE" },
  { id: "eggs", label: "Eggs", icon: "egg", color: "#F59E0B", bgColor: "#FEF9C3" },
  { id: "fish", label: "Fish", icon: "fish", color: "#0891B2", bgColor: "#CFFAFE" },
  { id: "nuts", label: "Tree Nuts", icon: "nut", color: "#92400E", bgColor: "#FDE68A" },
  { id: "peanuts", label: "Peanuts", icon: "bean", color: "#B45309", bgColor: "#FED7AA" },
  { id: "soy", label: "Soy", icon: "bean", color: "#65A30D", bgColor: "#ECFCCB" },
  { id: "shellfish", label: "Shellfish", icon: "fish", color: "#DC2626", bgColor: "#FEE2E2" },
];

const DIET_TYPES: DietaryItem[] = [
  { id: "vegetarian", label: "Vegetarian", icon: "leaf", color: "#16A34A", bgColor: "#DCFCE7" },
  { id: "vegan", label: "Vegan", icon: "leaf", color: "#15803D", bgColor: "#D1FAE5" },
  { id: "pescatarian", label: "Pescatarian", icon: "fish", color: "#0284C7", bgColor: "#E0F2FE" },
  { id: "keto", label: "Keto", icon: "nut", color: "#9333EA", bgColor: "#F3E8FF" },
  { id: "paleo", label: "Paleo", icon: "leaf", color: "#EA580C", bgColor: "#FFF7ED" },
  { id: "halal", label: "Halal", icon: "leaf", color: "#059669", bgColor: "#D1FAE5" },
  { id: "kosher", label: "Kosher", icon: "leaf", color: "#4F46E5", bgColor: "#EEF2FF" },
  { id: "low_carb", label: "Low Carb", icon: "wheat", color: "#CA8A04", bgColor: "#FEF9C3" },
];

const ALL_KNOWN_IDS = [
  ...COMMON_ALLERGIES.map((a) => a.id),
  ...DIET_TYPES.map((d) => d.id),
];

function getIconComponent(iconName: string, color: string, size: number) {
  switch (iconName) {
    case "wheat": return <Wheat size={size} color={color} />;
    case "milk": return <Milk size={size} color={color} />;
    case "egg": return <Egg size={size} color={color} />;
    case "fish": return <Fish size={size} color={color} />;
    case "nut": return <Nut size={size} color={color} />;
    case "bean": return <Bean size={size} color={color} />;
    case "leaf": return <Leaf size={size} color={color} />;
    default: return <Leaf size={size} color={color} />;
  }
}

function parseCommaSeparated(val: string | null | undefined): string[] {
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default function DietaryRestrictionsScreen() {
  const queryClient = useQueryClient();
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set());
  const [selectedDiets, setSelectedDiets] = useState<Set<string>>(new Set());
  const [customRestriction, setCustomRestriction] = useState<string>("");
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [hasExisting, setHasExisting] = useState<boolean>(false);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dietaryQuery = useQuery({
    queryKey: ["dietary-restrictions"],
    queryFn: fetchDietaryRestrictions,
  });

  useEffect(() => {
    if (dietaryQuery.data && !initialLoaded) {
      console.log("[Dietary] Populating from API data:", dietaryQuery.data);
      setHasExisting(true);
      setInitialLoaded(true);

      const allergenItems = parseCommaSeparated(dietaryQuery.data.allergen);
      const knownAllergens = new Set<string>();
      const unknownAllergens: string[] = [];
      allergenItems.forEach((item) => {
        if (COMMON_ALLERGIES.find((a) => a.id === item || a.label.toLowerCase() === item)) {
          const match = COMMON_ALLERGIES.find((a) => a.id === item || a.label.toLowerCase() === item);
          if (match) knownAllergens.add(match.id);
        } else {
          unknownAllergens.push(item);
        }
      });
      setSelectedAllergies(knownAllergens);

      const dietItems = parseCommaSeparated(dietaryQuery.data.diet_type);
      const knownDiets = new Set<string>();
      dietItems.forEach((item) => {
        const match = DIET_TYPES.find((d) => d.id === item || d.label.toLowerCase() === item);
        if (match) knownDiets.add(match.id);
      });
      setSelectedDiets(knownDiets);

      const customFromApi = parseCommaSeparated(dietaryQuery.data.custom);
      const allCustom = [...unknownAllergens, ...customFromApi];
      const uniqueCustom = [...new Set(allCustom)];
      setCustomItems(uniqueCustom);
    } else if (dietaryQuery.data === null && !initialLoaded) {
      setInitialLoaded(true);
      setHasExisting(false);
    }
  }, [dietaryQuery.data, initialLoaded]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (payload: DietaryPayload) => {
      if (hasExisting) {
        return updateDietaryRestrictions(payload);
      }
      return createDietaryRestrictions(payload);
    },
    onSuccess: (data) => {
      console.log("[Dietary] Save success:", data);
      setHasExisting(true);
      queryClient.invalidateQueries({ queryKey: ["dietary-restrictions"] });
      Alert.alert("Saved", "Your dietary preferences have been updated.");
    },
    onError: (error: Error) => {
      console.error("[Dietary] Save error:", error.message);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    },
  });

  const toggleAllergy = useCallback((id: string) => {
    setSelectedAllergies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleDiet = useCallback((id: string) => {
    setSelectedDiets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const addCustomRestriction = useCallback(() => {
    const trimmed = customRestriction.trim();
    if (!trimmed) return;
    if (customItems.includes(trimmed.toLowerCase())) return;
    setCustomItems((prev) => [...prev, trimmed]);
    setCustomRestriction("");
  }, [customRestriction, customItems]);

  const removeCustomItem = useCallback((item: string) => {
    setCustomItems((prev) => prev.filter((i) => i !== item));
  }, []);

  const handleSave = useCallback(() => {
    const allergenList = Array.from(selectedAllergies);
    const dietList = Array.from(selectedDiets);

    const payload: DietaryPayload = {};

    if (allergenList.length > 0) {
      payload.allergen = allergenList.join(",");
    } else {
      payload.allergen = "";
    }

    if (dietList.length > 0) {
      payload.diet_type = dietList.join(",");
    } else {
      payload.diet_type = "";
    }

    if (customItems.length > 0) {
      payload.custom = customItems.join(",");
    } else {
      payload.custom = "";
    }

    console.log("[Dietary] Saving payload:", payload);
    saveMutation.mutate(payload);
  }, [selectedAllergies, selectedDiets, customItems, saveMutation]);

  const totalSelected = selectedAllergies.size + selectedDiets.size + customItems.length;
  const isLoading = dietaryQuery.isLoading;
  const isSaving = saveMutation.isPending;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Dietary Restrictions" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Dietary Restrictions" }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.introSection}>
            <View style={styles.introIconWrap}>
              <Leaf size={24} color={Colors.light.tint} />
            </View>
            <Text style={styles.introTitle}>Personalize your recipes</Text>
            <Text style={styles.introSubtitle}>
              Select any allergies or dietary preferences so we can tailor recipe suggestions for you.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergies & Intolerances</Text>
            <Text style={styles.sectionSubtitle}>We'll exclude these from recommendations</Text>
            <View style={styles.grid}>
              {COMMON_ALLERGIES.map((item) => {
                const isSelected = selectedAllergies.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.chip,
                      { backgroundColor: isSelected ? item.bgColor : Colors.light.white },
                      isSelected && { borderColor: item.color, borderWidth: 1.5 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleAllergy(item.id)}
                    testID={`allergy-${item.id}`}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: item.bgColor }]}>
                      {getIconComponent(item.icon, item.color, 16)}
                    </View>
                    <Text style={[styles.chipLabel, isSelected && { color: item.color, fontWeight: "700" as const }]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.chipCheck, { backgroundColor: item.color }]}>
                        <Check size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diet Type</Text>
            <Text style={styles.sectionSubtitle}>Choose your preferred eating style</Text>
            <View style={styles.grid}>
              {DIET_TYPES.map((item) => {
                const isSelected = selectedDiets.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.chip,
                      { backgroundColor: isSelected ? item.bgColor : Colors.light.white },
                      isSelected && { borderColor: item.color, borderWidth: 1.5 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleDiet(item.id)}
                    testID={`diet-${item.id}`}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: item.bgColor }]}>
                      {getIconComponent(item.icon, item.color, 16)}
                    </View>
                    <Text style={[styles.chipLabel, isSelected && { color: item.color, fontWeight: "700" as const }]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.chipCheck, { backgroundColor: item.color }]}>
                        <Check size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Restrictions</Text>
            <Text style={styles.sectionSubtitle}>Add anything else you'd like to avoid</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sesame, Mustard..."
                placeholderTextColor={Colors.light.tabIconDefault}
                value={customRestriction}
                onChangeText={setCustomRestriction}
                onSubmitEditing={addCustomRestriction}
                returnKeyType="done"
                testID="custom-restriction-input"
              />
              <TouchableOpacity
                style={[styles.addBtn, !customRestriction.trim() && styles.addBtnDisabled]}
                onPress={addCustomRestriction}
                disabled={!customRestriction.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {customItems.length > 0 && (
              <View style={styles.customItemsRow}>
                {customItems.map((item) => (
                  <View key={item} style={styles.customChip}>
                    <Text style={styles.customChipText}>{item}</Text>
                    <TouchableOpacity onPress={() => removeCustomItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={14} color={Colors.light.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </Animated.View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {totalSelected > 0 && (
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomCount}>{totalSelected} selected</Text>
          </View>
        )}
        {totalSelected === 0 && <View style={styles.bottomInfo} />}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={isSaving}
          testID="save-dietary-btn"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Check size={18} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>
            {isSaving ? "Saving..." : "Save Preferences"}
          </Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  introSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  introIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.tintLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.light.text,
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 8,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  chipCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  addBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  customItemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  customChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.danger,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 34,
    backgroundColor: Colors.light.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomCount: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
});
