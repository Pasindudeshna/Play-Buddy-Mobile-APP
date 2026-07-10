import { router } from "expo-router";
import BookGround from "../components/BookGround";

export default function BookGroundScreen() {
  return (
    <BookGround
      onBack={() => router.back()}
      onViewBookings={() => router.push("/my-bookings")}
    />
  );
}
