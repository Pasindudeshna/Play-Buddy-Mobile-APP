import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, getDoc, GeoPoint, onSnapshot, Timestamp } from "firebase/firestore";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { distanceKm } from "../lib/location";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding,
} from "../styles/GlobalStyles";

const { width: SW, height: SH } = Dimensions.get("window");

/* ── Confetti particle ── */
const CONFETTI_COLORS = [
  "#45ffb3", "#27e7d4", "#ffffff", "#ffdd57",
  "#ff6b6b", "#a29bfe", "#fd79a8", "#74b9ff",
];
const CONFETTI_COUNT = 60;

function ConfettiParticle({ delay }: { delay: number }) {
  const left = useRef(Math.random() * SW).current;
  const y = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const size = 6 + Math.random() * 8;
  const isCircle = Math.random() > 0.5;
  const duration = 1800 + Math.random() * 1200;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: SH * 0.75,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 6,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(duration * 0.7),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 6],
    outputRange: ["0deg", `${Math.random() > 0.5 ? "" : "-"}${360 + Math.random() * 360}deg`],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top: -20,
        width: size,
        height: isCircle ? size : size * 1.8,
        borderRadius: isCircle ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: y }, { rotate: spin }],
      }}
    />
  );
}

/* ── Party popup modal ── */
function PartyPopup({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      // Auto-dismiss after 2.8s
      const t = setTimeout(onDismiss, 2800);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      {/* Confetti layer */}
      <View style={popupStyles.confettiLayer} pointerEvents="none">
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 18} />
        ))}
      </View>

      {/* Centre card */}
      <View style={popupStyles.overlay}>
        <Animated.View style={[popupStyles.card, { opacity, transform: [{ scale }] }]}>
          <Text style={popupStyles.bigEmoji}>🎉</Text>
          <Text style={popupStyles.title}>Match Found!</Text>
          <Text style={popupStyles.subtitle}>Your play buddy is ready 🏸</Text>
          <TouchableOpacity style={popupStyles.dismissBtn} onPress={onDismiss}>
            <Text style={popupStyles.dismissText}>Let's Go!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ── Main MatchFound screen ── */
type MatchDoc = {
  sport: string;
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  players: string[];
  playerCoords?: Record<string, GeoPoint>;
  status: string;
  selectedVenueId: string | null;
};

type OpponentProfile = {
  name: string;
  tier: string;
  games: number;
  age: string;
  gender: string;
  positive: number;
  negative: number;
  avatar: null;
};

type VenueInfo = { name: string; address: string | null };

const DEFAULT_OPPONENT: OpponentProfile = {
  name: "Play Buddy",
  tier: "Bronze",
  games: 0,
  age: "—",
  gender: "—",
  positive: 0,
  negative: 0,
  avatar: null,
};

function formatSportLabel(sport: string): string {
  return sport
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(start)} - ${fmt(end)}`;
}

type MatchFoundProps = {
  matchId: string;
  onBack?: () => void;
};

export default function MatchFound({ matchId, onBack }: MatchFoundProps) {
  const [partyVisible, setPartyVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [opponent, setOpponent] = useState<OpponentProfile>(DEFAULT_OPPONENT);
  const [venue, setVenue] = useState<VenueInfo | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "matches", matchId), async (snap) => {
      if (!snap.exists()) {
        setMatch(null);
        setLoading(false);
        return;
      }

      const data = snap.data() as MatchDoc;
      setMatch(data);

      const myUid = auth.currentUser?.uid;
      const opponentUid = data.players.find((id) => id !== myUid);
      if (opponentUid) {
        const userSnap = await getDoc(doc(db, "users", opponentUid));
        if (userSnap.exists()) {
          const u = userSnap.data() as any;
          setOpponent({
            name: u.fullName ?? DEFAULT_OPPONENT.name,
            tier: u.tier ?? DEFAULT_OPPONENT.tier,
            games: u.totalGames ?? 0,
            age: u.age ? `${u.age}Y` : DEFAULT_OPPONENT.age,
            gender: u.gender ?? DEFAULT_OPPONENT.gender,
            positive: u.positiveReviews ?? 0,
            negative: u.negativeReviews ?? 0,
            avatar: null,
          });
        }
      }

      if (data.selectedVenueId) {
        const venueSnap = await getDoc(
          doc(db, "matches", matchId, "venueOptions", data.selectedVenueId)
        );
        setVenue(
          venueSnap.exists()
            ? { name: venueSnap.data().name, address: venueSnap.data().address ?? null }
            : null
        );
      } else {
        setVenue(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [matchId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <ActivityIndicator size="large" color={Color.colorMediumspringgreen} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <Text style={styles.matchSubtitle}>This match could not be found.</Text>
        <TouchableOpacity style={[styles.backBtn, { marginTop: 16 }]} onPress={onBack}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const start = match.timeSlot.start.toDate();
  const end = match.timeSlot.end.toDate();
  const sportLabel = formatSportLabel(match.sport);
  const venueLabel = venue
    ? `${venue.name}${venue.address ? `, ${venue.address}` : ""}`
    : "Vote for a venue below";

  const myUid = auth.currentUser?.uid;
  const opponentUid = match.players.find((id) => id !== myUid);
  const myCoords = myUid ? match.playerCoords?.[myUid] : undefined;
  const opponentCoords = opponentUid ? match.playerCoords?.[opponentUid] : undefined;
  const partnerDistanceKm =
    myCoords && opponentCoords
      ? distanceKm(
          { latitude: myCoords.latitude, longitude: myCoords.longitude },
          { latitude: opponentCoords.latitude, longitude: opponentCoords.longitude }
        )
      : null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />

      {/* Party popup fires immediately on mount */}
      <PartyPopup visible={partyVisible} onDismiss={() => setPartyVisible(false)} />

      <SafeAreaView style={styles.safeArea}>
        {/* Top bar */}
        <View style={styles.topBar}>
           <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>
            <Text style={styles.brandB}>B</Text>{"  "}PLAY BUDDY
          </Text>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn}>
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
          {/* Header */}
          <View style={styles.successHeader}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
            <Text style={styles.matchTitle}>Match Found !</Text>
            <Text style={styles.matchSubtitle}>
              We found a player near you who wants to play
            </Text>
            <Text style={styles.matchSport}>{sportLabel}</Text>
          </View>

          {/* Match details pill cards */}
          <View style={styles.detailsCard}>
            {[
              { icon: "📅", text: match.date },
              { icon: "🕐", text: formatTimeRange(start, end) },
              { icon: "📍", text: venueLabel },
              ...(partnerDistanceKm != null
                ? [{ icon: "📏", text: `${Math.round(partnerDistanceKm * 10) / 10} km away` }]
                : []),
            ].map((item, i, arr) => (
              <View key={i} style={[styles.detailPill, i < arr.length - 1 && styles.detailPillBorder]}>
                <Text style={styles.detailPillIcon}>{item.icon}</Text>
                <Text style={styles.detailPillText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Player card */}
          <View style={styles.playerCard}>
            <View style={styles.playerAvatarBox}>
              {opponent.avatar ? (
                <Image source={opponent.avatar} style={styles.playerAvatar} />
              ) : (
                <View style={styles.playerAvatarPlaceholder} />
              )}
            </View>

            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{opponent.name}</Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{opponent.tier}</Text>
              </View>
              <View style={styles.playerMeta}>
                <Text style={styles.playerMetaText}>{opponent.games} games</Text>
                <Text style={styles.playerMetaDot}>·</Text>
                <Text style={styles.playerMetaText}>{opponent.age}</Text>
                <Text style={styles.playerMetaDot}>·</Text>
                <Text style={styles.playerMetaText}>{opponent.gender}</Text>
              </View>
              <View style={styles.reviewBadges}>
                <View style={styles.reviewBadge}>
                  <Text style={styles.thumbUp}>👍</Text>
                  <Text style={styles.reviewPositive}>{opponent.positive}</Text>
                </View>
                <View style={styles.reviewBadge}>
                  <Text style={styles.thumbDown}>👎</Text>
                  <Text style={styles.reviewNegative}>{opponent.negative}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cost card only makes sense once a venue (with its ground fee) is picked */}
          <View style={styles.costCard}>
            <Text style={styles.costTitle}>Cost</Text>
            <View style={styles.costRow}>
              <View style={styles.costItem}>
                <Text style={styles.costValue}>
                  {venue ? "See venue" : "TBD"}
                </Text>
                <Text style={styles.costLabel}>Ground Fee</Text>
              </View>
              <View style={styles.costDivider} />
              <View style={styles.costItem}>
                <Text style={styles.costValue}>{match.players.length}</Text>
                <Text style={styles.costLabel}>Players</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.chatBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/chat", params: { matchId } })}
            >
              <Text style={styles.chatBtnIcon}>💬</Text>
              <Text style={styles.chatBtnText}>Chat First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.voteBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/venues", params: { matchId } })}
            >
              <Text style={styles.voteBtnText}>Vote for Venue</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  loadingWrap: { justifyContent: "center", alignItems: "center" },

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
  topBarRight: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center", alignItems: "center",
  },
  topBarIcon: { fontSize: 18 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  /* Success header */
  successHeader: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  checkCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
  },
  checkIcon: {
    color: Color.colorBlack, fontSize: 28, fontWeight: "900",
  },
  matchTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: 28, fontWeight: "800", marginBottom: 6,
  },
  matchSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13, textAlign: "center",
  },
  matchSport: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16, fontWeight: "700",
    marginTop: 6,
  },

  /* Details card */
  detailsCard: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  detailPillBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  detailPillIcon: { fontSize: 18 },
  detailPillText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },

  /* Player card */
  playerCard: {
    flexDirection: "row",
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
    alignItems: "flex-start",
  },
  playerAvatarBox: {},
  playerAvatar: { width: 64, height: 64, borderRadius: 12 },
  playerAvatarPlaceholder: {
    width: 64, height: 64, borderRadius: 12,
    backgroundColor: Color.colorGainsboro200,
  },
  playerInfo: { flex: 1, gap: 6 },
  playerName: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15, fontWeight: "700",
  },
  tierBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,215,0,0.15)",
    borderRadius: Border.br_full,
    paddingHorizontal: 12, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(255,215,0,0.4)",
  },
  tierText: {
    color: "#FFD700",
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11, fontWeight: "700",
  },
  playerMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  playerMetaText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
  playerMetaDot: { color: Color.colorGray300, fontSize: 10 },
  reviewBadges: { flexDirection: "row", gap: 14 },
  reviewBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  thumbUp: { fontSize: 14 },
  thumbDown: { fontSize: 14 },
  reviewPositive: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13, fontWeight: "700",
  },
  reviewNegative: {
    color: Color.colorOrangered,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13, fontWeight: "700",
  },

  /* Cost card */
  costCard: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
    gap: 14,
  },
  costTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15, fontWeight: "700",
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  costItem: { alignItems: "center", gap: 4 },
  costValue: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16, fontWeight: "700",
  },
  costValueGreen: { color: Color.colorMediumspringgreen },
  costLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
  costDivider: {
    width: 1, height: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  /* Actions */
  actionsRow: { flexDirection: "row", gap: 12 },
  chatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    height: 50,
  },
  chatBtnIcon: { fontSize: 16 },
  chatBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13, fontWeight: "600",
  },
  voteBtn: {
    flex: 1,
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  voteBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13, fontWeight: "700",
  },
  backBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: Border.br_16,
  backgroundColor: "rgba(255,255,255,0.08)",
  marginRight: 12,
},
backBtnText: {
  color: Color.colorWhite,
  fontFamily: FontFamily.calSans,
  fontSize: FontSize.fs_13,
},
});

/* ── Popup styles ── */
const popupStyles = StyleSheet.create({
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    pointerEvents: "none",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: Color.color1Gray100,
    borderRadius: Border.br_20,
    padding: 32,
    alignItems: "center",
    gap: 10,
    width: SW * 0.78,
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
  },
  bigEmoji: { fontSize: 56 },
  title: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    textAlign: "center",
  },
  dismissBtn: {
    marginTop: 8,
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  dismissText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});