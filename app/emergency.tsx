import { router } from "expo-router";
import Emergency from "../components/Emergency";

export default function EmergencyScreen() {
  return <Emergency onBack={() => router.back()} />;
}
