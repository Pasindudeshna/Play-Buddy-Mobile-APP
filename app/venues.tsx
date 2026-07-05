import { useLocalSearchParams } from "expo-router";
import Venues from "../components/Venues";

export default function VenuesScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <Venues matchId={matchId} />;
}
