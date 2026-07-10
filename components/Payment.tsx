import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { auth, db } from "../firebaseConfig";
import { callMatchApi } from "../lib/matchApi";
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
  date: string;
  timeSlot: { start: Timestamp; end: Timestamp };
  selectedVenueId: string | null;
};

type VenueOptionDoc = {
  facilityId: string | null;
};

type CardType = "credit" | "debit";

function formatTime(ts: Timestamp): string {
  return ts.toDate().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function Payment({ matchId }: { matchId: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const myUid = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const [cardType, setCardType] = useState<CardType>("credit");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const matchSnap = await getDoc(doc(db, "matches", matchId));
      if (!matchSnap.exists()) {
        setLoading(false);
        return;
      }
      const matchData = matchSnap.data() as MatchDoc;
      setMatch(matchData);

      if (matchData.selectedVenueId) {
        const venueSnap = await getDoc(
          doc(db, "matches", matchId, "venueOptions", matchData.selectedVenueId)
        );
        const facilityId = venueSnap.exists() ? (venueSnap.data() as VenueOptionDoc).facilityId : null;
        if (facilityId) {
          const facilitySnap = await getDoc(doc(db, "facilities", facilityId));
          if (facilitySnap.exists()) {
            const loadedFacility = {
              id: facilitySnap.id,
              ...(facilitySnap.data() as Omit<Facility, "id">),
            };
            if (isBookable(loadedFacility)) setFacility(loadedFacility);
          }
        }
      }
      setLoading(false);
    })();
  }, [matchId]);

  useEffect(() => {
    return subscribeToBooking(matchBookingId(matchId), setBooking);
  }, [matchId]);

  useEffect(() => {
    if (booking && booking.paymentStatus === "paid") {
      router.replace({ pathname: "/ground-confirmation", params: { matchId } });
    }
  }, [booking, matchId]);

  // No venue confirmed yet, or the confirmed venue has no pricing configured
  // (meetup-only) — there's nothing to charge, so send the player to the
  // ground confirmation screen instead of a payment dead end.
  useEffect(() => {
    if (!loading && match && !facility) {
      router.replace({ pathname: "/ground-confirmation", params: { matchId } });
    }
  }, [loading, match, facility, matchId]);

  const durationHours = match
    ? (match.timeSlot.end.toMillis() - match.timeSlot.start.toMillis()) / 3_600_000
    : 0;
  const playerCount = match?.players.length ?? 2;
  const totalAmount = facility ? Math.round(facility.pricePerHour * durationHours * 100) / 100 : 0;
  const perPlayerAmount = Math.round((totalAmount / playerCount) * 100) / 100;

  const validateCard = (): string | null => {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13) return "Enter a valid card number.";
    const expiryMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expiryMatch || Number(expiryMatch[1]) < 1 || Number(expiryMatch[1]) > 12) {
      return "Enter a valid expiration date (MM/YY).";
    }
    if (cvc.length < 3) return "Enter a valid CVC/CVV.";
    return null;
  };

  const handlePay = async () => {
    if (!match || !facility) return;

    const validationError = validateCard();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPaying(true);
    setError(null);
    try {
      await callMatchApi("/api/pay-booking", { matchId });
      router.replace({ pathname: "/ground-confirmation", params: { matchId } });
    } catch (e: any) {
      setError(e?.message ?? "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
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

  if (!match) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.background} style={styles.background} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Payment</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Match not found.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!facility) {
    // About to redirect to Ground Confirmation (see effect above).
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.background} style={styles.background} />
        <View style={styles.centered}>
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
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment Method</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Heading */}
            <View style={styles.pageHeading}>
              <View style={styles.brandRow}>
                <Text style={styles.brand}>
                  <Text style={styles.brandB}>B</Text>{"  "}PLAY BUDDY
                </Text>
              </View>
              <Text style={styles.pageTitle}>Payment</Text>
              <Text style={styles.pageSubtitle}>Secure checkout</Text>
            </View>

            {/* Booking summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.meta}>Date</Text>
                <Text style={styles.metaStrong}>{match.date}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.meta}>Time</Text>
                <Text style={styles.metaStrong}>{formatTime(match.timeSlot.start)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.meta}>Players</Text>
                <Text style={styles.metaStrong}>{playerCount}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.meta}>Ground Charge</Text>
                <Text style={styles.metaStrong}>
                  {facility.currency} {totalAmount}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.metaBold}>Total</Text>
                <Text style={styles.metaAccent}>
                  {facility.currency} {totalAmount}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.meta}>Per person ({playerCount} players)</Text>
                <Text style={styles.metaAccent}>
                  {facility.currency} {perPlayerAmount}
                </Text>
              </View>
            </View>

            {/* Payment method */}
            <Text style={styles.sectionLabel}>Payment Method</Text>
            <View style={styles.methodPill}>
              <Ionicons name="card-outline" size={18} color={colors.accent} />
              <Text style={styles.methodPillText}>Credit / Debit Card</Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            </View>

            <View style={styles.card}>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, cardType === "credit" && styles.typeBtnActive]}
                  onPress={() => setCardType("credit")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, cardType === "credit" && styles.typeBtnTextActive]}>
                    Credit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, cardType === "debit" && styles.typeBtnActive]}
                  onPress={() => setCardType("debit")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, cardType === "debit" && styles.typeBtnTextActive]}>
                    Debit
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                  maxLength={19}
                />
              </View>

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Expiration Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MM/YY"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      value={expiry}
                      onChangeText={(t) => setExpiry(formatExpiry(t))}
                      maxLength={5}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>CVC/CVV</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      secureTextEntry
                      value={cvc}
                      onChangeText={(t) => setCvc(t.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Refund policy */}
            <View style={styles.refundBox}>
              <Text style={styles.refundTitle}>Refund Policy</Text>
              <Text style={styles.refundText}>
                Refunds are subject to the venue's cancellation policy. Cancel before the game
                begins for a full refund, otherwise a cancellation fee may apply.
              </Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.payBtn, paying && styles.payBtnDisabled]}
              activeOpacity={0.85}
              disabled={paying}
              onPress={handlePay}
            >
              {paying ? (
                <ActivityIndicator size="small" color={colors.accentText} />
              ) : (
                <Text style={styles.payBtnText}>
                  Pay {facility.currency} {perPlayerAmount}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const WARNING = "#d4a017";

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
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
  },

  pageHeading: { alignItems: "center", marginBottom: 20, gap: 4 },
  brandRow: { marginBottom: 8 },
  brand: {
    color: colors.textPrimary,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  brandB: { color: colors.accent },
  pageTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
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
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  metaStrong: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "700",
  },
  metaBold: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  metaAccent: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  sectionLabel: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 10,
  },
  methodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: Border.br_16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  methodPillText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },

  typeToggle: {
    flexDirection: "row",
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_20,
    padding: 4,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    borderRadius: Border.br_16,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: colors.accent },
  typeBtnText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },
  typeBtnTextActive: { color: colors.accentText },

  rowFields: { flexDirection: "row", gap: 12 },
  fieldGroup: { gap: 6, marginTop: 6 },
  label: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_20,
    height: 46,
    paddingHorizontal: Padding.padding_16,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },

  refundBox: {
    backgroundColor: "rgba(212, 160, 23, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.35)",
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    gap: 4,
    marginBottom: 16,
  },
  refundTitle: {
    color: WARNING,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "700",
  },
  refundText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    lineHeight: 16,
  },

  errorText: {
    color: colors.danger,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    textAlign: "center",
    marginBottom: 10,
  },

  payBtn: {
    backgroundColor: colors.accent,
    borderRadius: Border.br_20,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: {
    color: colors.accentText,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
});
