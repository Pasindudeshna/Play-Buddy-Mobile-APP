import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import * as React from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding
} from "../../styles/GlobalStyles";

/* ── Mock data ── */
const DEFAULT_USER = {
  firstName: "Guest",
  fullName: "Guest User",
  location: "Location not set",
  tier: "Bronze",
  nextTier: "Silver",
  gamesPlayed: 0,
  gamesNeeded: 10,
  positive: 0,
  negative: 0,
  totalGames: 0,
  avatar: null,
};

const STATS = [
  { label: "Total\nGames", value: "20" },
  { label: "Rating", value: "20" },
  { label: "Positive\nReview", value: "20" },
  { label: "Total\nGames", value: "20" },
];

const QUICK_ACTIONS = [
  { id: "find", icon: "🔍", title: "Find Buddy", sub: "Find Player Now", route: "/find-buddy" },
  { id: "score", icon: "🏆", title: "Scoreboard", sub: "View results", route: "/scoreboard" },
  { id: "venues", icon: "📍", title: "Venues", sub: "Browse courts", route: "/venues" },
  { id: "emergency", icon: "🛡", title: "Emergency", sub: "SOS & contacts", route: "/emergency" },
];

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

export default function index() {
  const [user, setUser] = useState(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          // User not logged in, redirect to login
          router.replace("/(auth)/LoginPage");
          return;
        }

        // 📖 Fetch user document from Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUser({
            firstName: userData.fullName?.split(" ")[0] || "Guest",
            fullName: userData.fullName || "User",
            location: userData.city || "Location not set",
            tier: userData.tier || "Bronze",
            nextTier: userData.nextTier || "Silver",
            gamesPlayed: userData.gamesPlayed || 0,
            gamesNeeded: userData.gamesNeeded || 10,
            positive: userData.positiveReviews || 0,
            negative: userData.negativeReviews || 0,
            totalGames: userData.totalGames || 0,
            avatar: null,
          });
        } else {
          setUser(DEFAULT_USER);
        }
      } catch (error) {
        console.log("Error fetching user data:", error);
        setUser(DEFAULT_USER);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/LoginPage");
    } catch (error) {
      alert("Logout failed: " + error.message);
    }
  };

  const progress = user.gamesPlayed / user.gamesNeeded;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Color.colorMediumspringgreen} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
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
            <Text style={styles.menuIcon}>🚪</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Greeting ── */}
          <Text style={styles.greeting}>Hey, {user.firstName} !</Text>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total\nGames</Text>
              <Text style={styles.statValue}>{user.totalGames}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tier</Text>
              <Text style={styles.statValue}>{user.tier}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Positive\nReview</Text>
              <Text style={styles.statValue}>{user.positive}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Negative\nReview</Text>
              <Text style={styles.statValue}>{user.negative}</Text>
            </View>
          </View>

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
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
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
                <View style={[
                  styles.resultBadge,
                  game.result === "won" ? styles.resultWon : styles.resultLost,
                ]}>
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

          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarBox}>
              {user.avatar ? (
                <Image source={user.avatar} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>

            <Text style={styles.profileName}>{user.fullName}</Text>
            <Text style={styles.profileLocation}>{user.location}</Text>

            {/* Tier progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressTier}>{user.tier}</Text>
              <Text style={styles.progressGoal}>
                {Math.max(0, user.gamesNeeded - user.gamesPlayed)} games to {user.nextTier}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{user.gamesPlayed} games</Text>
              <Text style={styles.progressLabel}>{user.gamesNeeded}</Text>
            </View>

            {/* Review stats */}
            <View style={styles.reviewRow}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewValue}>{user.positive}</Text>
                <Text style={styles.reviewLabel}>Positive</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewValue, styles.reviewNegative]}>{user.negative}</Text>
                <Text style={styles.reviewLabel}>Negative</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewItem}>
                <Text style={styles.reviewValue}>{user.totalGames}</Text>
                <Text style={styles.reviewLabel}>Games</Text>
              </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
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
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  brandB: { color: Color.colorMediumspringgreen },
  menuBtn: { padding: 4 },
  menuIcon: { color: Color.colorWhite, fontSize: 22 },

  scrollContent: { paddingHorizontal: 20 },

  /* ── Greeting ── */
  greeting: {
    color: Color.colorWhite,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 16,
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Color.colorMediumspringgreen,
    gap: 6,
  },
  statLabel: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: 9,
    textAlign: "center",
    lineHeight: 12,
  },
  statValue: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
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
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.1)",
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(69,255,179,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionIcon: { fontSize: 22 },
  actionTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 2,
  },
  actionSub: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },

  /* ── Section header ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },
  viewAll: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },

  /* ── Games ── */
  gamesList: { gap: 10, marginBottom: 20 },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
  },
  gameSportBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(69,255,179,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  gameSportEmoji: { fontSize: 20 },
  gameInfo: { flex: 1, gap: 4 },
  gameOpponent: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  gameVs: { color: Color.colorGray300, fontWeight: "400" },
  gameMeta: { flexDirection: "row", gap: 12 },
  gameMetaText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: 10,
    lineHeight: 15,
  },
  resultBadge: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  resultWon: {},
  resultLost: {},
  resultIcon: { fontSize: 14 },
  resultText: {
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "700",
  },
  resultTextWon: { color: Color.colorMediumspringgreen },
  resultTextLost: { color: Color.colorOrangered },

  /* ── Profile Card ── */
  profileCard: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.1)",
    gap: 10,
  },
  avatarBox: { marginBottom: 4 },
  avatar: { width: 80, height: 80, borderRadius: 16 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Color.colorGainsboro200,
  },
  profileName: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },
  profileLocation: {
    color: Color.colorGray300,
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
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },
  progressGoal: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Color.colorMediumspringgreen,
  },
  progressLabels: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  progressLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 4,
  },
  reviewItem: { alignItems: "center", gap: 2 },
  reviewValue: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "700",
  },
  reviewNegative: { color: Color.colorOrangered },
  reviewLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },
  reviewDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "center",
  },

  profileBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  profileBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
});