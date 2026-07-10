import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { auth } from "../firebaseConfig";
import { subscribeToMatchHistory, type MatchHistoryEntry } from "../lib/matchHistory";
import { Border, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

const SPORT_EMOJI: Record<string, string> = {
  badminton: "🏸",
  table_tennis: "🏓",
  tennis: "🎾",
  cricket: "🏏",
  football: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  swimming: "🏊",
};

const STATUS_LABEL: Record<string, string> = {
  pending_venue: "Choosing venue",
  venue_selected: "Venue confirmed",
};

export default function MatchHistory({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    return subscribeToMatchHistory(
      user.uid,
      (list) => {
        setMatches(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.background}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Match History</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : matches.length === 0 ? (
            <Text style={styles.emptyText}>
              No matches yet — find a buddy to start building your history.
            </Text>
          ) : (
            matches.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/chat", params: { matchId: m.id } })}
              >
                <View style={styles.avatarBox}>
                  {m.opponentPhotoURL ? (
                    <Image source={{ uri: m.opponentPhotoURL }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color={colors.textSecondary} />
                    </View>
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.opponentName}>
                    {SPORT_EMOJI[m.sport] ?? "🏅"} vs {m.opponentName}
                  </Text>
                  <Text style={styles.meta}>
                    {m.date} · {STATUS_LABEL[m.status] ?? m.status}
                  </Text>
                </View>

                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
            ))
          )}
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

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
    marginTop: 40,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  avatarBox: {},
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1, gap: 2 },
  opponentName: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
});
