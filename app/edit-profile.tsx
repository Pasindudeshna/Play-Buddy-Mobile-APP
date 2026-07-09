import { router } from "expo-router";
import EditProfile from "../components/EditProfile";

export default function EditProfileScreen() {
  return <EditProfile onDone={() => router.back()} />;
}
