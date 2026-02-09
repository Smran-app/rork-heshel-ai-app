import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { X, CheckCircle, AlertCircle, Loader, ImageIcon } from "lucide-react-native";

import Colors from "@/constants/colors";
import { useRecipeQueue, QueueItem } from "@/providers/RecipeQueueProvider";

function QueueItemRow({ item }: { item: QueueItem }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item.status === "processing") {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [item.status]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const isImageType = item.type === "images";

  return (
    <View style={styles.itemRow}>
      {isImageType ? (
        <View style={styles.imageThumbWrap}>
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.itemThumb}
            contentFit="cover"
          />
          <View style={styles.imageCountBadge}>
            <ImageIcon size={8} color={Colors.light.white} />
            <Text style={styles.imageCountText}>{item.imageUris?.length ?? 1}</Text>
          </View>
        </View>
      ) : (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.itemThumb}
          contentFit="cover"
        />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemMessage}>{item.message}</Text>
      </View>
      <View style={styles.itemStatus}>
        {item.status === "processing" && (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Loader size={16} color={Colors.light.tint} />
          </Animated.View>
        )}
        {item.status === "success" && (
          <CheckCircle size={16} color={Colors.light.tint} />
        )}
        {item.status === "error" && (
          <AlertCircle size={16} color={Colors.light.danger} />
        )}
        {item.status === "pending" && (
          <View style={styles.pendingDot} />
        )}
      </View>
    </View>
  );
}

export default function ProcessingQueue() {
  const { queue, dismissAll } = useRecipeQueue();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (queue.length > 0) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [queue.length > 0]);

  if (queue.length === 0) return null;

  const allDone = queue.every((q) => q.status === "success" || q.status === "error");

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {allDone ? "Processing complete" : "Processing recipes..."}
          </Text>
          {allDone && (
            <TouchableOpacity onPress={dismissAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {queue.map((item) => (
          <QueueItemRow key={item.id} item={item} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    right: 12,
    left: 12,
    zIndex: 999,
  },
  card: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  itemThumb: {
    width: 40,
    height: 30,
    borderRadius: 6,
  },
  imageThumbWrap: {
    position: "relative",
  },
  imageCountBadge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.light.tint,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  imageCountText: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: Colors.light.white,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  itemMessage: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  itemStatus: {
    width: 24,
    alignItems: "center",
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tabIconDefault,
  },
});
