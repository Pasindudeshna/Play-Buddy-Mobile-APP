import { router, useLocalSearchParams } from "expo-router";
import GroundConfirmation from "../components/GroundConfirmation";

export default function GroundConfirmationScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  if (!matchId) {
    router.replace("/(tabs)/FindBuddy");
    return null;
  }

  return <GroundConfirmation matchId={matchId} />;
}
