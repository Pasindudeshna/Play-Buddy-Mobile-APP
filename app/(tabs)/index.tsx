import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../../contexts/ThemeContext";
import { auth, db } from "../../firebaseConfig";
import { getTierProgress } from "../../lib/points";
import {
  Border,
  FontFamily,
  FontSize,
  Padding
} from "../../styles/GlobalStyles";

const DEFAULT_USER = {
  firstName: "Guest",
  fullName: "Guest User",
  location: "Location not set",
  photoURL: null as string | null,
  points: 0,
};

const QUICK_ACTIONS = [
  { id: "find", icon: "search", title: "Find Buddy", sub: "Find Player Now", route: "/(tabs)/FindBuddy" },
  { id: "score", icon: "trophy", title: "Scoreboard", sub: "View results", route: "/scoreboard" },
  { id: "venues", icon: "location", title: "Book a Ground", sub: "Browse & book courts", route: "/book-ground" },
  { id: "emergency", icon: "shield-checkmark", title: "Emergency", sub: "SOS & contacts", route: "/emergency" },
] as const;

export default function index() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // User not logged in, redirect to login
      router.replace("/(auth)/LoginPage");
      return;
    }

    // 📖 Live-subscribe to the user document so profile changes (e.g. a new
    // profile photo saved in Edit Profile) show up here immediately.
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          setUser({
            firstName: userData.fullName?.split(" ")[0] || "Guest",
            fullName: userData.fullName || "User",
            location: userData.city || "Location not set",
            photoURL: userData.photoURL || null,
            points: userData.points || 0,
          });
        } else {
          setUser(DEFAULT_USER);
        }
        setLoading(false);
      },
      (error) => {
        console.log("Error fetching user data:", error);
        setUser(DEFAULT_USER);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/LoginPage");
    } catch (error) {
      alert("Logout failed: " + error.message);
    }
  };

  const tierProgress = getTierProgress(user.points);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.background}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            <Text style={styles.brandB}>B</Text>
            {"  "}PLAY BUDDY
          </Text>
          <TouchableOpacity style={styles.menuBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Greeting ── */}
          <Text style={styles.greeting}>Hey, {user.firstName} !</Text>

          {/* ── Quick Actions ── */}
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name={action.icon as any} size={22} color={colors.accent} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarBox}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={30} color={colors.textSecondary} />
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{user.fullName}</Text>
            <Text style={styles.profileLocation}>{user.location}</Text>

            {/* Tier progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressTier}>{tierProgress.tier}</Text>
              <Text style={styles.progressGoal}>
                {tierProgress.nextTier
                  ? `${tierProgress.pointsForNextTier! - tierProgress.pointsIntoTier} pts to ${tierProgress.nextTier}`
                  : "Top tier"}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${Math.min(tierProgress.progress * 100, 100)}%` }]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{user.points} pts</Text>
              {tierProgress.pointsForNextTier != null && (
                <Text style={styles.progressLabel}>{tierProgress.pointsForNextTier} pts</Text>
              )}
            </View>

            {/* View Full Profile button */}
            <Link href="/profile" asChild>
              <TouchableOpacity style={styles.profileBtn} activeOpacity={0.85}>
                <Text style={styles.profileBtnText}>View Full Profile</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background[0] },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },

  /* ── Top bar ── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: {
    color: colors.textPrimary,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  brandB: { color: colors.accent },
  menuBtn: { padding: 4 },

  scrollContent: { paddingHorizontal: 20 },

  /* ── Greeting ── */
  greeting: {
    color: colors.textPrimary,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 16,
  },

  /* ── Quick Actions ── */
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    width: "47.5%",
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 2,
  },
  actionSub: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },

  /* ── Profile Card ── */
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 10,
  },
  avatarBox: { marginBottom: 4 },
  avatar: { width: 80, height: 80, borderRadius: 16 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },
  profileLocation: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    marginTop: -4,
  },

  progressRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  progressTier: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },
  progressGoal: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceBorder,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  progressLabels: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },

  profileBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: Border.br_20,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  profileBtnText: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
});
