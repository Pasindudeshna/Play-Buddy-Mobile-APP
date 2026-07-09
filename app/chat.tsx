import { useLocalSearchParams } from "expo-router";
import Chat from "../components/Chat";

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  return <Chat matchId={matchId} />;
}

// This is a placeholder for the chat screen. You can customize it as needed.