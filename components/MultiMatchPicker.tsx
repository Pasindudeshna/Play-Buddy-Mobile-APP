import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import * as React from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebaseConfig";
import { subscribeToCandidates, selectMatchCandidate, type MatchCandidate } from "../lib/matchQueue";
import { Border, Color, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

type CandidateProfile = {
  name: string;
  tier: string;
  games: number;
};

const DEFAULT_PROFILE: CandidateProfile = { name: "Play Buddy", tier: "Bronze", games: 0 };

type MultiMatchPickerProps = {
  ticketId: string;
  onBack: () => void;
};

export default function MultiMatchPicker({ ticketId, onBack }: MultiMatchPickerProps) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CandidateProfile>>({});
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => subscribeToCandidates(ticketId, setCandidates), [ticketId]);

  useEffect(() => {
    const missing = candidates.filter((c) => !profiles[c.candidateUserId]);
    if (missing.length === 0) return;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (c) => {
          try {
            const snap = await getDoc(doc(db, "users", c.candidateUserId));
            if (!snap.exists()) return [c.candidateUserId, DEFAULT_PROFILE] as const;
            const u = snap.data() as any;
            return [
              c.candidateUserId,
              {
                name: u.fullName ?? DEFAULT_PROFILE.name,
                tier: u.tier ?? DEFAULT_PROFILE.tier,
                games: u.totalGames ?? 0,
              },
            ] as const;
          } catch {
            return [c.candidateUserId, DEFAULT_PROFILE] as const;
          }
        })
      );
      setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [candidates, profiles]);

  const handleChoose = async (candidate: MatchCandidate) => {
    if (choosingId) return;
    setActionError(null);
    setChoosingId(candidate.candidateTicketId);
    try {
      await selectMatchCandidate(ticketId, candidate.candidateTicketId);
      // Success: the parent's ticket listener picks up status:"matched" and swaps views.
    } catch (e: any) {
      setActionError(e?.message ?? "That player just matched with someone else. Pick another.");
    } finally {
      setChoosingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>
            <Text style={styles.brandB}>B</Text>
            {"  "}PLAY BUDDY
          </Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Several buddies found!</Text>
            <Text style={styles.subtitle}>
              {candidates.length} player{candidates.length === 1 ? "" : "s"} match your search — pick one to play with.
            </Text>
          </View>

          {actionError && <Text style={styles.errorText}>{actionError}</Text>}

          {candidates.length === 0 ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color={Color.colorMediumspringgreen} />
              <Text style={styles.emptyText}>Candidates changed — still searching…</Text>
            </View>
          ) : (
            candidates.map((candidate) => {
              const profile = profiles[candidate.candidateUserId] ?? DEFAULT_PROFILE;
              const isBusy = choosingId === candidate.candidateTicketId;
              return (
                <View key={candidate.candidateTicketId} style={styles.card}>
                  <View style={styles.avatarPlaceholder} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{profile.name}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.tierBadge}>
                        <Text style={styles.tierText}>{profile.tier}</Text>
                      </View>
                      <Text style={styles.metaText}>{profile.games} games</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaText}>{candidate.distanceKm} km away</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.chooseBtn, choosingId && styles.chooseBtnDisabled]}
                    activeOpacity={0.85}
                    disabled={!!choosingId}
                    onPress={() => handleChoose(candidate)}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={Color.colorBlack} />
                    ) : (
                      <Text style={styles.chooseBtnText}>Choose</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}

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
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Border.br_16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  header: { alignItems: "center", marginBottom: 20, marginTop: 8, gap: 6 },
  title: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    textAlign: "center",
  },

  errorText: {
    color: Color.colorOrangered,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
    marginBottom: 14,
  },

  emptyWrap: { alignItems: "center", gap: 14, marginTop: 40 },
  emptyText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Color.colorGainsboro200,
  },
  info: { flex: 1, gap: 6 },
  name: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  tierBadge: {
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: Border.br_full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
  },
  tierText: {
    color: "#FFD700",
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
    fontWeight: "700",
  },
  metaText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
  metaDot: { color: Color.colorGray300, fontSize: 10 },

  chooseBtn: {
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 78,
    alignItems: "center",
  },
  chooseBtnDisabled: { opacity: 0.6 },
  chooseBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});
