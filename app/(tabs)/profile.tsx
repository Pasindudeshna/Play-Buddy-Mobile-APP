import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding,
  Gap,
} from "../../styles/GlobalStyles";

/* ── Mock data ── */
const USER = {
  fullName: "Ashvin Fernando",
  location: "Baththaramulla",
  tier: "Silver",
  nextTier: "Gold",
  gamesPlayed: 10,
  gamesNeeded: 30,
  positive: 10,
  negative: 1,
  totalGames: 10,
  avatar: null,
};

const EMERGENCY = {
  contact: "Sandesh Fernando",
  phone: "+9471-234-5678",
  conditions: "None",
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
  const progress = USER.gamesPlayed / USER.gamesNeeded;

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
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn}>
              {/* Person icon */}
              <Text style={styles.topBarIcon}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={styles.topBarIcon}>☰</Text>
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
              {USER.avatar ? (
                <Image source={USER.avatar} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>

            <Text style={styles.profileName}>{USER.fullName}</Text>
            <Text style={styles.profileLocation}>{USER.location}</Text>

            {/* Tier progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressTier}>{USER.tier}</Text>
              <Text style={styles.progressGoal}>
                {USER.gamesNeeded - USER.gamesPlayed} games to gold
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{USER.gamesPlayed} games</Text>
              <Text style={styles.progressLabel}>{USER.gamesNeeded}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Review stats */}
            <View style={styles.reviewRow}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewValue}>{USER.positive}</Text>
                <Text style={styles.reviewLabel}>Positive</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewValue, styles.reviewNegative]}>
                  {USER.negative}
                </Text>
                <Text style={styles.reviewLabel}>Negative</Text>
              </View>
              <View style={styles.reviewDivider} />
              <View style={styles.reviewItem}>
                <Text style={styles.reviewValue}>{USER.totalGames}</Text>
                <Text style={styles.reviewLabel}>Games</Text>
              </View>
            </View>

            {/* Edit button */}
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          {/* ── Emergency Information Card ── */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Text style={styles.emergencyHeartIcon}>❤️</Text>
              <Text style={styles.emergencyTitle}>Emergency Information</Text>
            </View>

            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyKey}>Emergency Contact</Text>
              <Text style={styles.emergencyValue}>{EMERGENCY.contact}</Text>
            </View>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyKey}>Contact Phone</Text>
              <Text style={styles.emergencyValue}>{EMERGENCY.phone}</Text>
            </View>
            <View style={styles.emergencyRow}>
              <Text style={styles.emergencyKey}>Medical Conditions</Text>
              <Text style={styles.emergencyValue}>{EMERGENCY.conditions}</Text>
            </View>

            {/* View Emergency Contacts link */}
            <TouchableOpacity style={styles.emergencyLink} activeOpacity={0.8}>
              <Text style={styles.emergencyLinkIcon}>📞</Text>
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
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarIcon: { fontSize: 18, color: Color.colorWhite },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  /* ── Profile Card ── */
  profileCard: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
    marginBottom: 16,
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

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 4,
  },

  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "stretch",
  },

  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  editIcon: { fontSize: 18 },

  /* ── Emergency Card ── */
  emergencyCard: {
    borderRadius: Border.br_16,
    borderWidth: 1.5,
    borderColor: Color.colorOrangered,
    padding: Padding.padding_16,
    marginBottom: 24,
    gap: 10,
    backgroundColor: "rgba(219,34,17,0.04)",
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  emergencyHeartIcon: { fontSize: 16 },
  emergencyTitle: {
    color: Color.colorMediumspringgreen,
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
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  emergencyValue: {
    color: Color.colorWhite,
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
  emergencyLinkIcon: { fontSize: 16 },
  emergencyLinkText: {
    color: Color.colorMediumspringgreen,
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
  gamesList: { gap: 10 },
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
  resultTextWon: { color: Color.colorMediumspringgreen },
  resultTextLost: { color: Color.colorOrangered },
});