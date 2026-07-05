import { useLocalSearchParams } from "expo-router";
import Chat from "../components/Chat";

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <Chat matchId={matchId} />;
}
