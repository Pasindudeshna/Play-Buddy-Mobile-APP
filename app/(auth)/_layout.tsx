import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome/WelcomePage1" options={{ headerShown: false }} />
      <Stack.Screen name="welcome/WelcomePage2" options={{ headerShown: false }} />
      <Stack.Screen name="welcome/WelcomePage3" options={{ headerShown: false }} />
      <Stack.Screen name="welcome/WelcomePage4" options={{ headerShown: false }} />
      <Stack.Screen name="welcome/WelcomePage5" options={{ headerShown: false }} />
      <Stack.Screen name="welcome/WelcomePage6" options={{ headerShown: false }} />
    </Stack>
  );
}
