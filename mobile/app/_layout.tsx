import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initializePurchases } from '../services/purchases';

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat when app starts
    initializePurchases().catch((error) => {
      console.error('Failed to initialize purchases:', error);
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
    </Stack>
  );
}
