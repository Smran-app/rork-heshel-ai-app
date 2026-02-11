import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Plus,
  Trash2,
  Link,
  Youtube,
  AlertCircle,
  Check,
  ImagePlus,
  Camera,
  Images,
} from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { fetchVideoInfo, VideoInfo } from "@/lib/api";
import { useRecipeQueue } from "@/providers/RecipeQueueProvider";

type RecipeSource = "youtube" | "images";

interface VideoEntry {
  id: string;
  url: string;
  videoId: string | null;
  info: VideoInfo | null;
  isLoading: boolean;
  error: string | null;
}

interface PickedImage {
  id: string;
  uri: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTab?: RecipeSource;
}

export default function AddRecipeModal({ visible, onClose, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<RecipeSource>(initialTab ?? "youtube");
  const [entries, setEntries] = useState<VideoEntry[]>([
    { id: "1", url: "", videoId: null, info: null, isLoading: false, error: null },
  ]);
  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
  const { addToQueue, addImagesToQueue } = useRecipeQueue();

  const resetAndClose = useCallback(() => {
    setEntries([{ id: "1", url: "", videoId: null, info: null, isLoading: false, error: null }]);
    setPickedImages([]);
    setActiveTab(initialTab ?? "youtube");
    onClose();
  }, [onClose, initialTab]);

  const updateEntry = useCallback((id: string, updates: Partial<VideoEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const fetchInfoMutation = useMutation({
    mutationFn: async ({ entryId, videoId }: { entryId: string; videoId: string }) => {
      updateEntry(entryId, { isLoading: true, error: null });
      const info = await fetchVideoInfo(videoId);
      return { entryId, info };
    },
    onSuccess: ({ entryId, info }) => {
      updateEntry(entryId, { info, isLoading: false });
    },
    onError: (err: Error, { entryId }) => {
      updateEntry(entryId, { isLoading: false, error: "Could not fetch video info" });
    },
  });

  const { mutate: fetchVideoMutate } = fetchInfoMutation;

  const handleUrlChange = useCallback(
    (id: string, text: string) => {
      const videoId = extractYouTubeId(text);
      updateEntry(id, { url: text, videoId, error: null, info: null });
      if (videoId) {
        fetchVideoMutate({ entryId: id, videoId });
      } else if (text.length > 10) {
        updateEntry(id, { error: "Not a valid YouTube link" });
      }
    },
    [updateEntry, fetchVideoMutate]
  );

  const addMore = useCallback(() => {
    const newId = String(Date.now());
    setEntries((prev) => [
      ...prev,
      { id: newId, url: "", videoId: null, info: null, isLoading: false, error: null },
    ]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const validEntries = entries.filter((e) => e.videoId && e.info && !e.isLoading);

  const handleSaveYoutube = useCallback(() => {
    if (validEntries.length === 0) {
      Alert.alert("No videos", "Add at least one valid YouTube link to continue.");
      return;
    }
    const queueItems = validEntries.map((e) => ({
      videoId: e.videoId!,
      title: e.info!.title,
      thumbnail: e.info!.thumbnail_url,
    }));
    addToQueue(queueItems);
    resetAndClose();
  }, [validEntries, addToQueue, resetAndClose]);

  const pickImages = useCallback(async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Camera access is required to take a photo.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : ["images"] as any,
          quality: 0.7,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setPickedImages((prev) => [
          ...prev,
          { id: String(Date.now()), uri: result.assets[0].uri },
        ]);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : ["images"] as any,
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 10,
        });
        if (result.canceled || !result.assets?.length) return;
        const newImages = result.assets.map((asset, idx) => ({
          id: `${Date.now()}-${idx}`,
          uri: asset.uri,
        }));
        setPickedImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      console.error("[AddRecipe] Image pick error:", err);
      Alert.alert("Error", "Could not pick images.");
    }
  }, []);

  const showImageSourceAlert = useCallback(() => {
    if (Platform.OS === "web") {
      pickImages(false);
      return;
    }
    Alert.alert(
      "Add Photos",
      undefined,
      [
        { text: "Take Photo", onPress: () => pickImages(true) },
        { text: "Choose from Library", onPress: () => pickImages(false) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [pickImages]);

  const removeImage = useCallback((id: string) => {
    setPickedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleSaveImages = useCallback(() => {
    if (pickedImages.length === 0) {
      Alert.alert("No images", "Add at least one image to create a recipe.");
      return;
    }
    const uris = pickedImages.map((img) => img.uri);
    addImagesToQueue(uris);
    resetAndClose();
  }, [pickedImages, addImagesToQueue, resetAndClose]);

  const handleTabSwitch = useCallback((tab: RecipeSource) => {
    setActiveTab(tab);
  }, []);

  const isYoutubeValid = validEntries.length > 0;
  const isImagesValid = pickedImages.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Recipe</Text>
          <TouchableOpacity
            onPress={resetAndClose}
            style={styles.closeBtn}
            testID="close-add-recipe-modal"
          >
            <X size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "youtube" && styles.tabActive]}
            onPress={() => handleTabSwitch("youtube")}
            activeOpacity={0.7}
            testID="tab-youtube"
          >
            <Youtube size={16} color={activeTab === "youtube" ? Colors.light.white : "#CC0000"} />
            <Text style={[styles.tabText, activeTab === "youtube" && styles.tabTextActive]}>
              YouTube
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "images" && styles.tabActive]}
            onPress={() => handleTabSwitch("images")}
            activeOpacity={0.7}
            testID="tab-images"
          >
            <Images size={16} color={activeTab === "images" ? Colors.light.white : Colors.light.accent} />
            <Text style={[styles.tabText, activeTab === "images" && styles.tabTextActive]}>
              From Images
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "youtube" ? (
          <>
            <Text style={styles.description}>
              Paste YouTube video links and we'll extract the recipe for you.
            </Text>
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {entries.map((entry, index) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryLabel}>Video {index + 1}</Text>
                    {entries.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeEntry(entry.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={16} color={Colors.light.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputRow}>
                    <Link size={16} color={Colors.light.textSecondary} />
                    <TextInput
                      style={styles.input}
                      placeholder="https://youtube.com/watch?v=..."
                      placeholderTextColor={Colors.light.tabIconDefault}
                      value={entry.url}
                      onChangeText={(text) => handleUrlChange(entry.id, text)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      testID={`video-url-input-${index}`}
                    />
                    {entry.isLoading && (
                      <ActivityIndicator size="small" color={Colors.light.tint} />
                    )}
                    {entry.info && !entry.isLoading && (
                      <View style={styles.checkCircle}>
                        <Check size={12} color={Colors.light.white} />
                      </View>
                    )}
                  </View>
                  {entry.error && (
                    <View style={styles.errorRow}>
                      <AlertCircle size={13} color={Colors.light.danger} />
                      <Text style={styles.errorText}>{entry.error}</Text>
                    </View>
                  )}
                  {entry.info && (
                    <View style={styles.previewCard}>
                      <Image
                        source={{ uri: entry.info.thumbnail_url }}
                        style={styles.thumbnail}
                        contentFit="cover"
                      />
                      <View style={styles.previewInfo}>
                        <Text style={styles.previewTitle} numberOfLines={2}>
                          {entry.info.title}
                        </Text>
                        <Text style={styles.previewAuthor}>
                          {entry.info.author_name}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={addMore}
                activeOpacity={0.7}
                testID="add-more-link"
              >
                <Plus size={18} color={Colors.light.tint} />
                <Text style={styles.addMoreText}>Add another link</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={styles.description}>
              Upload photos of a recipe (from a book, handwritten notes, or food) and we'll create a recipe for you.
            </Text>
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {pickedImages.length > 0 && (
                <View style={styles.imageGrid}>
                  {pickedImages.map((img, idx) => (
                    <View key={img.id} style={styles.imageThumbWrap}>
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.imageThumb}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={styles.imageRemoveBtn}
                        onPress={() => removeImage(img.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <X size={12} color={Colors.light.white} />
                      </TouchableOpacity>
                      <View style={styles.imageIndexBadge}>
                        <Text style={styles.imageIndexText}>{idx + 1}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.addImageCard}
                activeOpacity={0.7}
                onPress={showImageSourceAlert}
                testID="add-image-btn"
              >
                <View style={styles.addImageIconWrap}>
                  <ImagePlus size={28} color={Colors.light.tint} />
                </View>
                <View style={styles.addImageContent}>
                  <Text style={styles.addImageTitle}>
                    {pickedImages.length === 0 ? "Add Photos" : "Add More Photos"}
                  </Text>
                  <Text style={styles.addImageSubtitle}>
                    Take a photo or choose from library
                  </Text>
                </View>
                <Plus size={20} color={Colors.light.tint} />
              </TouchableOpacity>

              {pickedImages.length === 0 && (
                <View style={styles.imageTipsCard}>
                  <Text style={styles.imageTipsTitle}>Tips for best results</Text>
                  <View style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>Take clear, well-lit photos</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>Capture the full recipe text or dish</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>Add multiple images for complex recipes</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>Works with handwritten or printed recipes</Text>
                  </View>
                </View>
              )}

              <View style={styles.imageSourceRow}>
                <TouchableOpacity
                  style={styles.imageSourceBtn}
                  activeOpacity={0.7}
                  onPress={() => pickImages(Platform.OS !== "web")}
                  testID="camera-btn"
                >
                  <Camera size={20} color={Colors.light.accent} />
                  <Text style={styles.imageSourceText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageSourceBtn}
                  activeOpacity={0.7}
                  onPress={() => pickImages(false)}
                  testID="gallery-btn"
                >
                  <Images size={20} color={Colors.light.tint} />
                  <Text style={styles.imageSourceText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              activeTab === "youtube" && !isYoutubeValid && styles.saveBtnDisabled,
              activeTab === "images" && !isImagesValid && styles.saveBtnDisabled,
            ]}
            onPress={activeTab === "youtube" ? handleSaveYoutube : handleSaveImages}
            activeOpacity={0.8}
            disabled={activeTab === "youtube" ? !isYoutubeValid : !isImagesValid}
            testID="save-recipes-btn"
          >
            <Text
              style={[
                styles.saveBtnText,
                activeTab === "youtube" && !isYoutubeValid && styles.saveBtnTextDisabled,
                activeTab === "images" && !isImagesValid && styles.saveBtnTextDisabled,
              ]}
            >
              {activeTab === "youtube"
                ? `Save ${validEntries.length > 0 ? `${validEntries.length} recipe${validEntries.length > 1 ? "s" : ""}` : "recipes"}`
                : `Create recipe from ${pickedImages.length > 0 ? `${pickedImages.length} image${pickedImages.length > 1 ? "s" : ""}` : "images"}`}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 8,
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
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: Colors.light.cardBg,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  tabTextActive: {
    color: Colors.light.white,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 14,
    lineHeight: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  entryCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  entryLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.cardBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    height: 48,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.danger,
  },
  previewCard: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: Colors.light.cardBg,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbnail: {
    width: 80,
    height: 60,
  },
  previewInfo: {
    flex: 1,
    padding: 8,
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.text,
    lineHeight: 17,
  },
  previewAuthor: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
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
    marginTop: 4,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  imageThumbWrap: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  imageThumb: {
    width: 100,
    height: 100,
  },
  imageRemoveBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndexBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndexText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  addImageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addImageIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.light.tintLight,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageContent: {
    flex: 1,
  },
  addImageTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  addImageSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  imageTipsCard: {
    backgroundColor: Colors.light.tintLight,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  imageTipsTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.tint,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.tint,
  },
  tipText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  imageSourceRow: {
    flexDirection: "row",
    gap: 12,
  },
  imageSourceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  imageSourceText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  saveBtn: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: Colors.light.cardBg,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  saveBtnTextDisabled: {
    color: Colors.light.tabIconDefault,
  },
});
