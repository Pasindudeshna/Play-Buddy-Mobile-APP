import { router } from "expo-router";
import Scoreboard from "../components/Scoreboard";

export default function ScoreboardScreen() {
  return <Scoreboard onBack={() => router.back()} />;
}
