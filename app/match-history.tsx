import { router } from "expo-router";
import MatchHistory from "../components/MatchHistory";

export default function MatchHistoryScreen() {
  return <MatchHistory onBack={() => router.back()} />;
}
