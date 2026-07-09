import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../../contexts/ThemeContext";
import { auth, db } from "../../firebaseConfig";
import {
  Border,
  FontFamily,
  FontSize,
  Padding,
} from "../../styles/GlobalStyles";

/* Gamification fields (tier/games/reviews) have no backend yet — placeholder
   until a match-history system exists. Identity/contact fields below are real. */
const STATS_PLACEHOLDER = {
  tier: "Bronze",
  nextTier: "Silver",
  gamesPlayed: 0,
  gamesNeeded: 30,
  positive: 0,
  negative: 0,
  totalGames: 0,
};

type UserProfile = {
  fullName: string;
  city: string;
  photoURL: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalConditions: string;
};

const RECENT_GAMES = [
  {
    id: "1",
    opponent: "Sudesh Deshan",
    date: "2026-03-25",
    venue: "Sport Zone",
    area: "Colombo 9",
    sport: "🏸",
    result: "won",
  },
  {
    id: "2",
    opponent: "Sudesh Deshan",
    date: "2026-03-29",
    venue: "Sport Zone",
    area: "Colombo 9",
    sport: "🎾",
    result: "lost",
  },
];

export default function ProfilePage() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const u = snap.data() as any;
        setProfile({
          fullName: u.fullName ?? "Player",
          city: u.city ?? "Location not set",
          photoURL: u.photoURL ?? null,
          emergencyContactName: u.emergencyContactName ?? "Not set",
          emergencyContactPhone: u.emergencyContactPhone ?? "Not set",
          medicalConditions: u.medicalConditions ?? "None",
        });
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const progress = STATS_PLACEHOLDER.gamesPlayed / STATS_PLACEHOLDER.gamesNeeded;

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.background}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.background}
        />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
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
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="person-circle-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="menu-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarBox}>
              {profile?.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={32} color={colors.textSecondary} />
                </View>
              )}
            </View>

            <Text style={styles.profileName}>{profile?.fullName ?? "Player"}</Text>
            <Text style={styles.profileLocation}>{profile?.city ?? "Location not set"}</Text>

            {/* Tier progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressTier}>{STATS_PLACEHOLDER.tier}</Text>
              <Text style={styles.progressGoal}>
                {STATS_PLACEHOLDER.gamesNeeded - STATS_PLACEHOLDER.gamesPlayed} games to gold
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{STATS_PLACEHOLDER.gamesPlayed} games</Text>
              <Text style={styles.progressLabel}>{STATS_PLACEHOLDER.gamesNeeded}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Review stats */}
            <View style={styles.reviewRow}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewValue}>{STATS_PLACEHOLDER.positive}</Text>
                <Text style={styles.reviewLabel}>Positive</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewValue, styles.reviewNegative]}>
                  {STATS_PLACEHOLDER.negative}
                </Text>
                <Text style={styles.reviewLabel}>Negative</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewItem}>
                <Text style={styles.reviewValue}>{STATS_PLACEHOLDER.totalGames}</Text>
                <Text style={styles.reviewLabel}>Games</Text>
              </View>
            </View>

            {/* Edit button */}
            <TouchableOpacity
              style={styles.editBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/edit-profile")}
            >
              <Ionicons name="pencil" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Appearance Card ── */}
          <View style={styles.appearanceCard}>
            <View style={styles.appearanceLeft}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.accent}
              />
              <Text style={styles.appearanceLabel}>
                {isDark ? "Dark Mode" : "Light Mode"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.surfaceBorder, true: colors.accentSoft }}
              thumbColor={colors.accent}
            />
          </View>

          {/* ── Emergency Information Card ── */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="heart" size={16} color={colors.danger} />
              <Text style={styles.emergencyTitle}>Emergency Information</Text>
            </View>

            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyKey}>Emergency Contact</Text>
              <Text style={styles.emergencyValue}>{profile?.emergencyContactName ?? "Not set"}</Text>
            </View>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyKey}>Contact Phone</Text>
              <Text style={styles.emergencyValue}>{profile?.emergencyContactPhone ?? "Not set"}</Text>
            </View>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyKey}>Medical Conditions</Text>
              <Text style={styles.emergencyValue}>{profile?.medicalConditions ?? "None"}</Text>
            </View>

            {/* View Emergency Contacts link */}
            <TouchableOpacity
              style={styles.emergencyLink}
              activeOpacity={0.8}
              onPress={() => router.push("/emergency")}
            >
              <Ionicons name="call" size={16} color={colors.accent} />
              <Text style={styles.emergencyLinkText}>View Emergency Contacts</Text>
            </TouchableOpacity>
          </View>

          {/* ── Recent Games ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Games</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View all  ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gamesList}>
            {RECENT_GAMES.map((game) => (
              <View key={game.id} style={styles.gameCard}>
                {/* Sport emoji */}
                <View style={styles.gameSportBox}>
                  <Text style={styles.gameSportEmoji}>{game.sport}</Text>
                </View>

                {/* Info */}
                <View style={styles.gameInfo}>
                  <Text style={styles.gameOpponent}>
                    <Text style={styles.gameVs}>vs  </Text>
                    {game.opponent}
                  </Text>
                  <View style={styles.gameMeta}>
                    <Text style={styles.gameMetaText}>📅 {game.date}</Text>
                    <Text style={styles.gameMetaText}>
                      📍 {game.venue}{"\n"}   {game.area}
                    </Text>
                  </View>
                </View>

                {/* Result badge */}
                <View style={styles.resultBadge}>
                  <Text style={styles.resultIcon}>
                    {game.result === "won" ? "🏠" : "❤️"}
                  </Text>
                  <Text style={[
                    styles.resultText,
                    game.result === "won" ? styles.resultTextWon : styles.resultTextLost,
                  ]}>
                    {game.result === "won" ? "won" : "Lost"}
                  </Text>
                </View>
              </View>
            ))}
          </View>

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
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },

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
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  /* ── Profile Card ── */
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
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

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  reviewItem: { alignItems: "center", gap: 2 },
  reviewValue: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "700",
  },
  reviewNegative: { color: colors.danger },
  reviewLabel: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },
  reviewDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: "stretch",
  },

  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  /* ── Appearance Card ── */
  appearanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  appearanceLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  appearanceLabel: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },

  /* ── Emergency Card ── */
  emergencyCard: {
    borderRadius: Border.br_16,
    borderWidth: 1.5,
    borderColor: colors.danger,
    padding: Padding.padding_16,
    marginBottom: 24,
    gap: 10,
    backgroundColor: colors.dangerSoft,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  emergencyTitle: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  emergencyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emergencyKey: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  emergencyValue: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
    textAlign: "right",
  },
  emergencyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  emergencyLinkText: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },

  /* ── Section header ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },
  viewAll: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },

  /* ── Games ── */
  gamesList: { gap: 10 },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  gameSportBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  gameSportEmoji: { fontSize: 20 },
  gameInfo: { flex: 1, gap: 4 },
  gameOpponent: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  gameVs: { color: colors.textSecondary, fontWeight: "400" },
  gameMeta: { flexDirection: "row", gap: 12 },
  gameMetaText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: 10,
    lineHeight: 15,
  },
  resultBadge: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  resultIcon: { fontSize: 14 },
  resultText: {
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "700",
  },
  resultTextWon: { color: colors.accent },
  resultTextLost: { color: colors.danger },
});
