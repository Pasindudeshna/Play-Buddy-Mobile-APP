import { router } from "expo-router";
import MyBookings from "../components/MyBookings";

export default function MyBookingsScreen() {
  return <MyBookings onBack={() => router.back()} />;
}
