import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Trash2,
  ChevronDown,
  Plus,
  Check,
  AlertTriangle,
  ShoppingCart,
  Refrigerator,
} from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import {
  extractIngredientsFromImage,
  bulkCreateIngredients,
  ExtractedMatchedIngredient,
  BulkIngredientPayload,
} from "@/lib/api";

const UNIT_OPTIONS = ["pcs", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "pinch"];

interface ReviewIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  image?: string;
  isMatched: boolean;
  category?: string;
}

type ModalStep = "pick" | "scanning" | "review";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ImageScanModal({ visible, onClose }: Props) {
  const [step, setStep] = useState<ModalStep>("pick");
  const [ingredients, setIngredients] = useState<ReviewIngredient[]>([]);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newQty, setNewQty] = useState<string>("1");
  const [newUnit, setNewUnit] = useState<string>("pcs");

  const queryClient = useQueryClient();

  const resetState = useCallback(() => {
    setStep("pick");
    setIngredients([]);
    setEditingUnitId(null);
    setAddingNew(false);
    setNewName("");
    setNewQty("1");
    setNewUnit("pcs");
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const extractMutation = useMutation({
    mutationFn: async ({ uri, from }: { uri: string; from: "list" | "fridge" }) => {
      return extractIngredientsFromImage(uri, from);
    },
    onSuccess: (data) => {
      console.log("[ImageScan] Extract success, matched:", data.matched.length, "unmatched:", data.unmatched.length);
      const items: ReviewIngredient[] = [];

      data.matched.forEach((m: ExtractedMatchedIngredient) => {
        items.push({
          id: `matched-${m.global_ingredient.id}`,
          name: m.global_ingredient.name,
          quantity: 1,
          unit: m.global_ingredient.default_unit || "pcs",
          image: m.global_ingredient.image,
          isMatched: true,
          category: m.global_ingredient.category,
        });
      });

      data.unmatched.forEach((name: string, idx: number) => {
        items.push({
          id: `unmatched-${idx}-${name}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: 1,
          unit: "pcs",
          isMatched: false,
        });
      });

      setIngredients(items);
      setStep("review");
    },
    onError: (err: Error) => {
      console.error("[ImageScan] Extract failed:", err.message);
      Alert.alert("Extraction Failed", err.message || "Could not extract ingredients from image.");
      setStep("pick");
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (items: BulkIngredientPayload[]) => {
      return bulkCreateIngredients(items);
    },
    onSuccess: () => {
      console.log("[ImageScan] Bulk create success");
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      Alert.alert("Added!", `${ingredients.length} ingredients added to your kitchen.`);
      handleClose();
    },
    onError: (err: Error) => {
      console.error("[ImageScan] Bulk create failed:", err.message);
      Alert.alert("Error", err.message || "Failed to save ingredients.");
    },
  });

  const { mutate: extractMutate } = extractMutation;

  const pickAndScan = useCallback(async (from: "list" | "fridge", useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Camera access is required to take a photo.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : ["images"] as any,
          quality: 0.7,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : ["images"] as any,
          quality: 0.7,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) {
        console.log("[ImageScan] User cancelled image picker");
        return;
      }

      const uri = result.assets[0].uri;
      console.log("[ImageScan] Image picked:", uri);
      setStep("scanning");
      extractMutate({ uri, from });
    } catch (err) {
      console.error("[ImageScan] Pick error:", err);
      Alert.alert("Error", "Could not pick image.");
    }
  }, [extractMutate]);

  const showImageSourceAlert = useCallback((from: "list" | "fridge") => {
    if (Platform.OS === "web") {
      pickAndScan(from, false);
      return;
    }
    Alert.alert(
      "Choose Image Source",
      undefined,
      [
        { text: "Camera", onPress: () => pickAndScan(from, true) },
        { text: "Photo Library", onPress: () => pickAndScan(from, false) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [pickAndScan]);

  const removeIngredient = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, qty: string) => {
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed < 0) return;
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: parsed } : i))
    );
  }, []);

  const updateUnit = useCallback((id: string, unit: string) => {
    setIngredients((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unit } : i))
    );
    setEditingUnitId(null);
  }, []);

  const addNewIngredient = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const qty = parseFloat(newQty) || 1;
    setIngredients((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: trimmed,
        quantity: qty,
        unit: newUnit,
        isMatched: false,
      },
    ]);
    setNewName("");
    setNewQty("1");
    setNewUnit("pcs");
    setAddingNew(false);
  }, [newName, newQty, newUnit]);

  const { mutate: bulkMutate, isPending: isBulkPending } = bulkMutation;

  const handleSaveAll = useCallback(() => {
    if (ingredients.length === 0) {
      Alert.alert("No ingredients", "Add at least one ingredient to continue.");
      return;
    }
    const payload: BulkIngredientPayload[] = ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    }));
    bulkMutate(payload);
  }, [ingredients, bulkMutate]);

  const renderPickStep = () => (
    <View style={styles.pickContainer}>
      <View style={styles.pickHeader}>
        <Text style={styles.pickTitle}>Scan Ingredients</Text>
        <Text style={styles.pickSubtitle}>
          Take a photo of your fridge or shopping list to automatically detect ingredients
        </Text>
      </View>

      <TouchableOpacity
        style={styles.scanCard}
        activeOpacity={0.7}
        onPress={() => showImageSourceAlert("fridge")}
        testID="scan-fridge-btn"
      >
        <View style={[styles.scanIconWrap, { backgroundColor: "#E3F2E1" }]}>
          <Refrigerator size={28} color="#4A7C59" />
        </View>
        <View style={styles.scanCardContent}>
          <Text style={styles.scanCardTitle}>Scan Fridge</Text>
          <Text style={styles.scanCardDesc}>
            Take a photo of your fridge and we&apos;ll identify the ingredients
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.scanCard}
        activeOpacity={0.7}
        onPress={() => showImageSourceAlert("list")}
        testID="scan-list-btn"
      >
        <View style={[styles.scanIconWrap, { backgroundColor: "#FFF3D6" }]}>
          <ShoppingCart size={28} color="#D4920B" />
        </View>
        <View style={styles.scanCardContent}>
          <Text style={styles.scanCardTitle}>Scan Shopping List</Text>
          <Text style={styles.scanCardDesc}>
            Upload a photo of your handwritten or printed shopping list
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderScanningStep = () => (
    <View style={styles.scanningContainer}>
      <ActivityIndicator size="large" color={Colors.light.tint} />
      <Text style={styles.scanningTitle}>Analyzing your image...</Text>
      <Text style={styles.scanningSubtitle}>
        Our AI is identifying ingredients from your photo
      </Text>
    </View>
  );

  const renderReviewStep = () => {
    const matched = ingredients.filter((i) => i.isMatched);
    const unmatched = ingredients.filter((i) => !i.isMatched);

    return (
      <ScrollView
        style={styles.reviewScroll}
        contentContainerStyle={styles.reviewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.reviewSubtitle}>
          {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""} detected. Review and adjust before adding to your kitchen.
        </Text>

        {matched.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <Check size={12} color={Colors.light.white} />
              </View>
              <Text style={styles.sectionTitle}>Matched ({matched.length})</Text>
            </View>
            {matched.map((item) => renderIngredientRow(item))}
          </>
        )}

        {unmatched.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBadge, { backgroundColor: Colors.light.accent }]}>
                <AlertTriangle size={12} color={Colors.light.white} />
              </View>
              <Text style={styles.sectionTitle}>Unmatched ({unmatched.length})</Text>
            </View>
            {unmatched.map((item) => renderIngredientRow(item))}
          </>
        )}

        {addingNew ? (
          <View style={styles.addNewCard}>
            <TextInput
              style={styles.addNewInput}
              placeholder="Ingredient name"
              placeholderTextColor={Colors.light.tabIconDefault}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.addNewRow}>
              <TextInput
                style={[styles.addNewInput, { flex: 1 }]}
                placeholder="Qty"
                placeholderTextColor={Colors.light.tabIconDefault}
                value={newQty}
                onChangeText={setNewQty}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.addNewUnitBtn}
                onPress={() => {
                  const idx = UNIT_OPTIONS.indexOf(newUnit);
                  setNewUnit(UNIT_OPTIONS[(idx + 1) % UNIT_OPTIONS.length]);
                }}
              >
                <Text style={styles.addNewUnitText}>{newUnit}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.addNewActions}>
              <TouchableOpacity
                style={styles.addNewCancel}
                onPress={() => setAddingNew(false)}
              >
                <Text style={styles.addNewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addNewConfirm}
                onPress={addNewIngredient}
              >
                <Text style={styles.addNewConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addMoreBtn}
            onPress={() => setAddingNew(true)}
            activeOpacity={0.7}
          >
            <Plus size={18} color={Colors.light.tint} />
            <Text style={styles.addMoreText}>Add ingredient manually</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const renderIngredientRow = (item: ReviewIngredient) => (
    <View key={item.id} style={styles.ingredientCard}>
      <View style={styles.ingredientLeft}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.ingredientImg} contentFit="cover" />
        ) : (
          <View style={[styles.ingredientImg, styles.ingredientImgPlaceholder]}>
            <Text style={styles.ingredientImgText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.ingredientInfo}>
          <Text style={styles.ingredientName} numberOfLines={1}>{item.name}</Text>
          {item.category ? (
            <Text style={styles.ingredientCategory}>{item.category}</Text>
          ) : (
            <Text style={styles.ingredientCategory}>Custom</Text>
          )}
        </View>
      </View>

      <View style={styles.ingredientRight}>
        <TextInput
          style={styles.qtyInput}
          value={String(item.quantity)}
          onChangeText={(t) => updateQuantity(item.id, t)}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={styles.unitBtn}
          onPress={() => setEditingUnitId(editingUnitId === item.id ? null : item.id)}
        >
          <Text style={styles.unitBtnText}>{item.unit}</Text>
          <ChevronDown size={12} color={Colors.light.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeIngredient(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={Colors.light.danger} />
        </TouchableOpacity>
      </View>

      {editingUnitId === item.id && (
        <View style={styles.unitDropdown}>
          {UNIT_OPTIONS.map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitOption, u === item.unit && styles.unitOptionActive]}
              onPress={() => updateUnit(item.id, u)}
            >
              <Text style={[styles.unitOptionText, u === item.unit && styles.unitOptionTextActive]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {step === "pick" ? "Scan Ingredients" : step === "scanning" ? "Scanning..." : "Review Ingredients"}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            testID="close-scan-modal"
          >
            <X size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        {step === "pick" && renderPickStep()}
        {step === "scanning" && renderScanningStep()}
        {step === "review" && renderReviewStep()}

        {step === "review" && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep("pick")}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>Rescan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (ingredients.length === 0 || isBulkPending) && styles.saveBtnDisabled,
              ]}
              onPress={handleSaveAll}
              disabled={ingredients.length === 0 || isBulkPending}
              activeOpacity={0.8}
              testID="save-scanned-ingredients"
            >
              {isBulkPending ? (
                <ActivityIndicator size="small" color={Colors.light.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  Add {ingredients.length} to Kitchen
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.cardBg,
    justifyContent: "center",
    alignItems: "center",
  },
  pickContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pickHeader: {
    marginBottom: 28,
  },
  pickTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  pickSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  scanIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  scanCardContent: {
    flex: 1,
    marginLeft: 16,
  },
  scanCardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  scanCardDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  scanningContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginTop: 20,
  },
  scanningSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  reviewScroll: {
    flex: 1,
  },
  reviewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  reviewSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  ingredientCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  ingredientLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ingredientImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBg,
  },
  ingredientImgPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
  },
  ingredientImgText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  ingredientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  ingredientCategory: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 1,
    textTransform: "capitalize" as const,
  },
  ingredientRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyInput: {
    backgroundColor: Colors.light.cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "600" as const,
    width: 60,
    textAlign: "center",
  },
  unitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  removeBtn: {
    padding: 6,
  },
  unitDropdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBg,
  },
  unitOptionActive: {
    backgroundColor: Colors.light.tint,
  },
  unitOptionText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  unitOptionTextActive: {
    color: Colors.light.white,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.tintLight,
    borderStyle: "dashed",
    borderRadius: 14,
    marginTop: 12,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  addNewCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.light.tintLight,
  },
  addNewInput: {
    backgroundColor: Colors.light.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 8,
  },
  addNewRow: {
    flexDirection: "row",
    gap: 8,
  },
  addNewUnitBtn: {
    backgroundColor: Colors.light.cardBg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addNewUnitText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  addNewActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  addNewCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addNewCancelText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  addNewConfirm: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addNewConfirmText: {
    fontSize: 14,
    color: Colors.light.white,
    fontWeight: "600" as const,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    gap: 10,
  },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    backgroundColor: Colors.light.cardBg,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
});
