import { router, useLocalSearchParams } from "expo-router";
import MatchFound from "../components/MatchFound";

export default function MatchFoundScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  if (!matchId) {
    router.replace("/(tabs)/FindBuddy");
    return null;
  }

  return <MatchFound matchId={matchId} onBack={() => router.back()} />;
}
