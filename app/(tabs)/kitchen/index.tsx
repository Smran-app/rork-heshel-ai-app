import { Stack } from "expo-router";
import { Image } from "expo-image";
import { Plus, RefreshCw } from "lucide-react-native";
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { fetchIngredients, APIIngredient } from "@/lib/api";

export default function KitchenScreen() {
  const [search, setSearch] = useState<string>("");

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
      <TouchableOpacity style={styles.addButton} activeOpacity={0.85} testID="add-ingredient">
        <Plus size={24} color={Colors.light.white} />
      </TouchableOpacity>
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
});
