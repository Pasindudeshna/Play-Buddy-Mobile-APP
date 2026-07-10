import { router, useLocalSearchParams } from "expo-router";
import Payment from "../components/Payment";

export default function PaymentScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  if (!matchId) {
    router.replace("/(tabs)/FindBuddy");
    return null;
  }

  return <Payment matchId={matchId} />;
}
