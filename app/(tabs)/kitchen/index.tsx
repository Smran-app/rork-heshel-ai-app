import { Stack } from "expo-router";
import { Image } from "expo-image";
import { Plus, RefreshCw, X, ChevronDown } from "lucide-react-native";
import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { fetchIngredients, createIngredient, APIIngredient, CreateIngredientPayload } from "@/lib/api";

const UNIT_OPTIONS = ["tsp", "tbsp", "cup", "g", "kg", "ml", "l", "oz", "lb", "piece", "pinch"];

export default function KitchenScreen() {
  const [search, setSearch] = useState<string>("");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [ingredientName, setIngredientName] = useState<string>("");
  const [ingredientQty, setIngredientQty] = useState<string>("");
  const [ingredientUnit, setIngredientUnit] = useState<string>("tsp");
  const [unitPickerOpen, setUnitPickerOpen] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const queryClient = useQueryClient();

  const {
    data: ingredients = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<APIIngredient[]>({
    queryKey: ["ingredients"],
    queryFn: fetchIngredients,
  });

  const addMutation = useMutation({
    mutationFn: (payload: CreateIngredientPayload) => createIngredient(payload),
    onSuccess: () => {
      console.log("[Kitchen] Ingredient created successfully");
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      closeModal();
    },
    onError: (err: Error) => {
      console.error("[Kitchen] Failed to create ingredient:", err.message);
      Alert.alert("Error", err.message || "Failed to add ingredient");
    },
  });

  const openModal = useCallback(() => {
    setIngredientName("");
    setIngredientQty("");
    setIngredientUnit("tsp");
    setUnitPickerOpen(false);
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const { mutate: addIngredient, isPending: isAdding } = addMutation;

  const handleSubmit = useCallback(() => {
    const name = ingredientName.trim();
    const qty = parseFloat(ingredientQty);
    if (!name) {
      Alert.alert("Missing name", "Please enter an ingredient name.");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Invalid quantity", "Please enter a valid quantity.");
      return;
    }
    addIngredient({ name, quantity: qty, unit: ingredientUnit });
  }, [ingredientName, ingredientQty, ingredientUnit, addIngredient]);

  const filtered = ingredients.filter((i) =>
    (i.global?.name ?? i.name).toLowerCase().includes(search.toLowerCase())
  );

  const formatQuantity = useCallback((item: APIIngredient) => {
    return `${item.quantity} ${item.unit}`;
  }, []);

  const getImageUri = useCallback((item: APIIngredient) => {
    return item.global?.image ?? undefined;
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "My Kitchen" }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading ingredients...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "My Kitchen" }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load ingredients</Text>
          <Text style={styles.errorDetail}>
            {error instanceof Error ? error.message : "Unknown error"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <RefreshCw size={16} color={Colors.light.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "My Kitchen" }} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor={Colors.light.tabIconDefault}
          value={search}
          onChangeText={setSearch}
          testID="kitchen-search"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.light.tint}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {getImageUri(item) ? (
              <Image
                source={{ uri: getImageUri(item) }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.imagePlaceholderText}>
                  {(item.global?.name ?? item.name).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.global?.name ?? item.name}</Text>
              <Text style={styles.qty}>{formatQuantity(item)}</Text>
              {item.global?.category ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.global.category}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No ingredients found</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.addButton} activeOpacity={0.85} testID="add-ingredient" onPress={openModal}>
        <Plus size={24} color={Colors.light.white} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          </Animated.View>

          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Ingredient</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={12}>
                <X size={22} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Salt, Rice, Olive Oil"
                placeholderTextColor={Colors.light.tabIconDefault}
                value={ingredientName}
                onChangeText={setIngredientName}
                autoCapitalize="words"
                autoFocus
                testID="ingredient-name-input"
              />

              <View style={styles.row}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="1"
                    placeholderTextColor={Colors.light.tabIconDefault}
                    value={ingredientQty}
                    onChangeText={setIngredientQty}
                    keyboardType="decimal-pad"
                    testID="ingredient-qty-input"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <TouchableOpacity
                    style={styles.unitSelector}
                    onPress={() => setUnitPickerOpen(!unitPickerOpen)}
                    activeOpacity={0.7}
                    testID="ingredient-unit-selector"
                  >
                    <Text style={styles.unitSelectorText}>{ingredientUnit}</Text>
                    <ChevronDown size={16} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {unitPickerOpen && (
                <View style={styles.unitGrid}>
                  {UNIT_OPTIONS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.unitChip,
                        u === ingredientUnit && styles.unitChipActive,
                      ]}
                      onPress={() => {
                        setIngredientUnit(u);
                        setUnitPickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          u === ingredientUnit && styles.unitChipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, isAdding && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isAdding}
                activeOpacity={0.8}
                testID="ingredient-submit"
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color={Colors.light.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Add to Kitchen</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 6,
  },
  errorDetail: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.white,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.cardBg,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.tint,
  },
  imagePlaceholderText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  qty: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  categoryBadge: {
    marginTop: 4,
    backgroundColor: Colors.light.cardBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textTransform: "capitalize" as const,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "80%" as const,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  unitSelector: {
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unitSelectorText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  unitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  unitChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  unitChipTextActive: {
    color: Colors.light.white,
  },
  submitBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
});
