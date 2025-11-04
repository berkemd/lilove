import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { 
  getOfferings, 
  purchasePackage, 
  restorePurchases,
  hasActiveSubscription,
  getSubscriptionTier 
} from '../services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
    checkSubscriptionStatus();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const offerings = await getOfferings();
      if (offerings) {
        setPackages(offerings.availablePackages);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
      Alert.alert('Error', 'Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const isActive = await hasActiveSubscription();
      setActiveSubscription(isActive);
      
      if (isActive) {
        const tier = await getSubscriptionTier();
        setCurrentTier(tier);
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setPurchasing(pkg.identifier);
      const customerInfo = await purchasePackage(pkg);
      
      if (customerInfo) {
        Alert.alert('Success', 'Subscription activated!');
        await checkSubscriptionStatus();
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message || 'Please try again');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await restorePurchases();
      await checkSubscriptionStatus();
      Alert.alert('Success', 'Purchases restored successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9333EA" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        {activeSubscription && currentTier && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>
              Active: {currentTier}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.packagesContainer}>
        {packages.map((pkg) => (
          <View key={pkg.identifier} style={styles.packageCard}>
            <Text style={styles.packageTitle}>
              {pkg.product.title}
            </Text>
            <Text style={styles.packageDescription}>
              {pkg.product.description}
            </Text>
            <Text style={styles.packagePrice}>
              {pkg.product.priceString}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                purchasing === pkg.identifier && styles.purchaseButtonDisabled
              ]}
              onPress={() => handlePurchase(pkg)}
              disabled={purchasing !== null}
            >
              {purchasing === pkg.identifier ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  Subscribe
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={loading}
      >
        <Text style={styles.restoreButtonText}>
          Restore Purchases
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Subscriptions auto-renew. Cancel anytime from your device settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  activeBadge: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  packagesContainer: {
    padding: 15,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9333EA',
    marginBottom: 15,
  },
  purchaseButton: {
    backgroundColor: '#9333EA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    margin: 20,
    padding: 15,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#9333EA',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
