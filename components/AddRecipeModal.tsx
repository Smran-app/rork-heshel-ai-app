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
} from "react-native";
import { Image } from "expo-image";
import { X, Plus, Trash2, Link, Youtube, AlertCircle, Check } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { fetchVideoInfo, VideoInfo } from "@/lib/api";
import { useRecipeQueue } from "@/providers/RecipeQueueProvider";

interface VideoEntry {
  id: string;
  url: string;
  videoId: string | null;
  info: VideoInfo | null;
  isLoading: boolean;
  error: string | null;
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
}

export default function AddRecipeModal({ visible, onClose }: Props) {
  const [entries, setEntries] = useState<VideoEntry[]>([
    { id: "1", url: "", videoId: null, info: null, isLoading: false, error: null },
  ]);
  const { addToQueue } = useRecipeQueue();

  const resetAndClose = useCallback(() => {
    setEntries([{ id: "1", url: "", videoId: null, info: null, isLoading: false, error: null }]);
    onClose();
  }, [onClose]);

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

  const handleSave = useCallback(() => {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Youtube size={22} color={Colors.light.tint} />
            <Text style={styles.headerTitle}>Add Recipes</Text>
          </View>
          <TouchableOpacity
            onPress={resetAndClose}
            style={styles.closeBtn}
            testID="close-add-recipe-modal"
          >
            <X size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Paste YouTube video links and we&apos;ll extract the recipe for you.
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              validEntries.length === 0 && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={validEntries.length === 0}
            testID="save-recipes-btn"
          >
            <Text
              style={[
                styles.saveBtnText,
                validEntries.length === 0 && styles.saveBtnTextDisabled,
              ]}
            >
              Save {validEntries.length > 0 ? `${validEntries.length} recipe${validEntries.length > 1 ? "s" : ""}` : "recipes"}
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
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
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
