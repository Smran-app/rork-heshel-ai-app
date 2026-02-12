import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import {
  X,
  Check,
  ChefHat,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react-native";
import Colors from "@/constants/colors";
import logo from "@/assets/images/icon.png";
import { useAuth } from "@/providers/AuthProvider";

const BENEFITS = [
  {
    icon: Sparkles,
    title: "Unlimited Recipes",
    description: "Generate as many recipes as you want with AI",
  },
  {
    icon: Zap,
    title: "Faster Cooking",
    description: "Priority processing for your recipe requests",
  },
  {
    icon: ShieldCheck,
    title: "Advanced Filters",
    description: "Filter by dietary needs, pantry ingredients, and more",
  },
  {
    icon: ChefHat,
    title: "Expert Techniques",
    description: "Unlock pro-level cooking tips and hints",
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { isHeshelPro } = useAuth();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    async function loadOfferings() {
      try {
        const offerings = await Purchases.getOfferings();
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e: any) {
        console.error("Error loading offerings", e);
        Alert.alert(
          "Error",
          "Could not load subscription details. Please try again later.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadOfferings();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active["Heshel Pro"]) {
        Alert.alert("Success", "Welcome to Heshel Pro!");
        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Purchase Error", e.message);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active["Heshel Pro"]) {
        Alert.alert("Success", "Purchases restored!");
        router.back();
      } else {
        Alert.alert("Info", "No active subscription found.");
      }
    } catch (e: any) {
      Alert.alert("Error", "Could not restore purchases.");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isHeshelPro) {
    return (
      <View style={styles.center}>
        <Text>You are already a Pro member!</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.light.tint, marginTop: 20 }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: "modal" }} />

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <X size={24} color={Colors.light.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Image source={logo} style={{ width: 80, height: 80 }} />
          </View>
          <Text style={styles.title}>Heshel Pro</Text>
          <Text style={styles.subtitle}>
            Unleash your inner chef with premium features
          </Text>
        </View>

        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <benefit.icon size={20} color={Colors.light.tint} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.light.tint}
            style={{ marginTop: 40 }}
          />
        ) : (
          <View style={styles.packages}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={styles.packageCard}
                onPress={() => handlePurchase(pkg)}
                disabled={isPurchasing}
              >
                <View style={styles.packageInfo}>
                  <Text style={styles.packageName}>{pkg.product.title}</Text>
                  <Text style={styles.packagePrice}>
                    {pkg.product.priceString}
                  </Text>
                </View>
                <View style={styles.buyButton}>
                  <Text style={styles.buyButtonText}>Select</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Subscription will be charged to your iTunes account. You can cancel at
          any time in account settings.
        </Text>
      </ScrollView>

      {isPurchasing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.light.white} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  benefitsList: {
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: Colors.light.white,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.tintLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  benefitDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  packages: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  packagePrice: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: "600",
    marginTop: 4,
  },
  buyButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyButtonText: {
    color: Colors.light.white,
    fontSize: 15,
    fontWeight: "700",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
});
