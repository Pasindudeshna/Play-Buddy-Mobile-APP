import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
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
import { auth, db } from "../firebaseConfig";
import { Border, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

type LeaderboardEntry = {
  id: string;
  fullName: string;
  photoURL: string | null;
  points: number;
};

const RANK_COLORS = ["#a855f7", "#facc15", "#38bdf8"]; // 1st purple, 2nd yellow, 3rd blue

export default function Scoreboard({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const myUid = auth.currentUser?.uid;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        setEntries(
          snap.docs.map((d) => {
            const u = d.data() as any;
            return {
              id: d.id,
              fullName: u.fullName ?? "Player",
              photoURL: u.photoURL ?? null,
              points: u.points ?? 0,
            };
          })
        );
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
          <Text style={styles.title}>Scoreboard</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeading}>
            <View style={styles.pageHeadingIconBox}>
              <Ionicons name="trophy" size={20} color={colors.accentText} />
            </View>
            <View>
              <Text style={styles.pageTitle}>Leaderboard</Text>
              <Text style={styles.pageSubtitle}>Ranked by points earned from played matches.</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>No players on the board yet.</Text>
          ) : (
            <View style={styles.list}>
              {entries.map((entry, i) => {
                const rankColor = RANK_COLORS[i];
                const isMe = entry.id === myUid;
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.row,
                      rankColor ? { borderColor: rankColor, borderWidth: 1.5 } : null,
                      isMe && styles.rowMe,
                    ]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        rankColor ? { backgroundColor: rankColor } : styles.rankBadgeDefault,
                      ]}
                    >
                      <Text style={[styles.rankText, rankColor && styles.rankTextOnColor]}>{i + 1}</Text>
                    </View>

                    {entry.photoURL ? (
                      <Image source={{ uri: entry.photoURL }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={18} color={colors.textSecondary} />
                      </View>
                    )}

                    <Text style={styles.name} numberOfLines={1}>
                      {entry.fullName}
                      {isMe ? " (you)" : ""}
                    </Text>

                    <Text style={styles.points}>{entry.points} pts</Text>
                  </View>
                );
              })}
            </View>
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

  pageHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  pageHeadingIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginTop: 2,
    maxWidth: 240,
  },

  emptyText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
    marginTop: 40,
  },

  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  rowMe: {
    borderColor: colors.accent,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  rankBadgeDefault: {
    backgroundColor: colors.surfaceBorder,
  },
  rankText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "700",
  },
  rankTextOnColor: {
    color: "#0b0b0b",
  },
  avatar: { width: 38, height: 38, borderRadius: 10 },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
  points: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});
