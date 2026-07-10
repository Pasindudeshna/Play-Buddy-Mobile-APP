import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { auth, db } from "../firebaseConfig";
import {
  isBookable,
  matchBookingId,
  subscribeToBooking,
  type Booking,
  type Facility,
} from "../lib/booking";
import { Border, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

type MatchDoc = {
  players: string[];
  sport: string;
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  selectedVenueId: string | null;
};

type VenueOptionDoc = {
  name: string;
  address: string | null;
  location: { latitude: number; longitude: number };
  facilityId: string | null;
};

const INSTRUCTIONS = [
  "Arrive a few minutes before your slot starts.",
  "Bring your own equipment unless the venue provides it.",
  "Show your confirmation code at the venue if asked.",
  "If your plans change, let your buddy know in chat right away.",
];

function confirmationCode(matchId: string): string {
  return `PB-${matchId.slice(0, 6).toUpperCase()}`;
}

function formatTime(ts: Timestamp): string {
  return ts.toDate().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function GroundConfirmation({ matchId }: { matchId: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const myUid = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [venue, setVenue] = useState<VenueOptionDoc | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [opponentName, setOpponentName] = useState("your buddy");
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    (async () => {
      const matchSnap = await getDoc(doc(db, "matches", matchId));
      if (!matchSnap.exists()) {
        setLoading(false);
        return;
      }
      const matchData = matchSnap.data() as MatchDoc;
      setMatch(matchData);

      const opponentUid = matchData.players.find((p) => p !== myUid);
      if (opponentUid) {
        const userSnap = await getDoc(doc(db, "users", opponentUid));
        if (userSnap.exists()) {
          setOpponentName((userSnap.data() as any).fullName ?? "your buddy");
        }
      }

      if (matchData.selectedVenueId) {
        const venueSnap = await getDoc(
          doc(db, "matches", matchId, "venueOptions", matchData.selectedVenueId)
        );
        if (venueSnap.exists()) {
          const venueData = venueSnap.data() as VenueOptionDoc;
          setVenue(venueData);
          if (venueData.facilityId) {
            const facilitySnap = await getDoc(doc(db, "facilities", venueData.facilityId));
            if (facilitySnap.exists()) {
              const loadedFacility = {
                id: facilitySnap.id,
                ...(facilitySnap.data() as Omit<Facility, "id">),
              };
              // No pricing/hours configured yet (older ground, or owner
              // hasn't set it up) — fall back to the meetup-only view
              // instead of crashing on undefined slot math.
              if (isBookable(loadedFacility)) setFacility(loadedFacility);
            }
          }
        }
      }

      setLoading(false);
    })();
  }, [matchId]);

  useEffect(() => {
    return subscribeToBooking(matchBookingId(matchId), setBooking);
  }, [matchId]);

  const durationHours = match
    ? (match.timeSlot.end.toMillis() - match.timeSlot.start.toMillis()) / 3_600_000
    : 0;
  const totalAmount = facility ? Math.round(facility.pricePerHour * durationHours * 100) / 100 : 0;
  const perPlayerAmount = Math.round((totalAmount / 2) * 100) / 100;

  const openInMaps = () => {
    if (!venue) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.background} style={styles.background} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    );
  }

  if (!match || !venue) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.background} style={styles.background} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No confirmed venue found for this match yet.</Text>
          </View>
        </SafeAreaView>
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
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Ground Booking</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Venue */}
          <View style={styles.card}>
            <Text style={styles.venueName}>{venue.name}</Text>
            {venue.address && <Text style={styles.meta}>{venue.address}</Text>}
            <TouchableOpacity onPress={openInMaps}>
              <Text style={styles.mapsLink}>Open in Google Maps ↗</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.meta}>{match.date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.meta}>
                {formatTime(match.timeSlot.start)} – {formatTime(match.timeSlot.end)}
              </Text>
            </View>
          </View>

          {/* Cost splitting */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cost Splitting</Text>
            {facility ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.meta}>Total ground charge</Text>
                  <Text style={styles.metaStrong}>
                    {totalAmount} {facility.currency}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.meta}>You & {opponentName} each pay</Text>
                  <Text style={styles.metaStrong}>
                    {perPlayerAmount} {facility.currency}
                  </Text>
                </View>
                <Text style={styles.hint}>Split evenly and pay at the venue.</Text>
              </>
            ) : (
              <Text style={styles.hint}>
                This venue isn't managed on Play Buddy, so pricing isn't available here — please
                arrange payment directly with {opponentName} and the venue.
              </Text>
            )}
          </View>

          {/* Player instructions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Before You Go</Text>
            {INSTRUCTIONS.map((line, i) => (
              <View key={i} style={styles.instructionRow}>
                <View style={styles.instructionDot} />
                <Text style={styles.meta}>{line}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => router.push({ pathname: "/chat", params: { matchId } })}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
              <Text style={styles.chatBtnText}>Message {opponentName}</Text>
            </TouchableOpacity>
          </View>

          {/* Reference number, with a Payment button underneath it whenever there's an unpaid bookable ground */}
          <View style={styles.confirmedCard}>
            <Ionicons
              name={booking ? "checkmark-circle" : "information-circle"}
              size={22}
              color={colors.accent}
            />
            <Text style={styles.confirmedTitle}>
              {booking ? "Booking Confirmed" : "Meetup Reference"}
            </Text>
            <Text style={styles.confirmationCode}>{confirmationCode(matchId)}</Text>

            {booking ? (
              <Text style={styles.hint}>
                Reserved under {booking.userName}
                {booking.userId === myUid ? " (you)" : ""}. Show this code at the venue.
              </Text>
            ) : (
              facility && (
                <>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.paymentBtn]}
                    onPress={() => router.push({ pathname: "/payment", params: { matchId } })}
                  >
                    <Text style={styles.confirmBtnText}>Go to Payment</Text>
                  </TouchableOpacity>
                  <Text style={styles.hint}>
                    Either you or {opponentName} can pay — it only needs to happen once.
                  </Text>
                </>
              )
            )}
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },

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
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 8,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
    marginBottom: 2,
  },
  venueName: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  metaStrong: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  mapsLink: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "space-between" },
  hint: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
    lineHeight: 15,
  },

  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  instructionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: Border.br_20,
    paddingVertical: 10,
  },
  chatBtnText: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "700",
  },

  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: Border.br_20,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmBtnDisabled: { opacity: 0.6 },
  paymentBtn: {
    alignSelf: "stretch",
    paddingHorizontal: 32,
    marginTop: 6,
  },
  confirmBtnText: {
    color: colors.accentText,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    textAlign: "center",
  },

  confirmedCard: {
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: Border.br_16,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: Padding.padding_20,
    marginBottom: 14,
  },
  confirmedTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  confirmationCode: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
