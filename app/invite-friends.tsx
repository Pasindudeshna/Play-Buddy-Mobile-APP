import { router } from "expo-router";
import InviteFriends from "../components/InviteFriends";

export default function InviteFriendsScreen() {
  return <InviteFriends onBack={() => router.back()} />;
}
