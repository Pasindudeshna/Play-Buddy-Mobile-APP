import { Stack } from "expo-router";
import React from "react";

export default function RegistrationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignupAccount" />
      <Stack.Screen name="SignupPersonal" />
      <Stack.Screen name="SignupSports" />
      <Stack.Screen name="SignupMedical" />
    </Stack>
  );
}