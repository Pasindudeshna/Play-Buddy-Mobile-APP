import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { auth, db } from "../firebaseConfig";
import { callMatchApi, MATCH_API_URL } from "../lib/matchApi";
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

type CheckoutFields = Record<string, string>;

const RETURN_URL_PREFIX = `${MATCH_API_URL}/api/payhere-return`;
const CANCEL_URL_PREFIX = `${MATCH_API_URL}/api/payhere-cancel`;

function formatTime(ts: Timestamp): string {
  return ts.toDate().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** An HTML page that auto-submits a hidden form to PayHere's checkout endpoint — this IS the payment form, hosted by PayHere, not us. */
function buildCheckoutHtml(checkoutUrl: string, fields: CheckoutFields): string {
  const inputs = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtmlAttr(name)}" value="${escapeHtmlAttr(value)}" />`)
    .join("");
  return `<!DOCTYPE html><html><body onload="document.forms[0].submit()">
    <form method="post" action="${escapeHtmlAttr(checkoutUrl)}">${inputs}</form>
  </body></html>`;
}

export default function Payment({ matchId }: { matchId: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const myUid = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const [preparing, setPreparing] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
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

  const handlePay = async () => {
    if (!match || !facility) return;
    setError(null);
    setPreparing(true);
    try {
      const { checkoutUrl, fields } = await callMatchApi("/api/create-payhere-checkout", { matchId });
      setCheckoutHtml(buildCheckoutHtml(checkoutUrl, fields));
    } catch (e: any) {
      setError(e?.message ?? "Couldn't start checkout. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  // Intercepts PayHere's redirect back to our return/cancel pages before the
  // WebView actually loads them — payment confirmation itself always comes
  // from the payhere-notify webhook (see netlify/functions/payhere-notify.mts)
  // updating the booking doc, which the subscribeToBooking effect above picks
  // up; this only closes the checkout sheet and shows the right interim state.
  const handleNavigationRequest = (request: WebViewNavigation): boolean => {
    if (request.url.startsWith(RETURN_URL_PREFIX)) {
      setCheckoutHtml(null);
      setConfirming(true);
      return false;
    }
    if (request.url.startsWith(CANCEL_URL_PREFIX)) {
      setCheckoutHtml(null);
      setError("Payment was cancelled.");
      return false;
    }
    return true;
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Heading */}
          <View style={styles.pageHeading}>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>
                <Text style={styles.brandB}>B</Text>{"  "}PLAY BUDDY
              </Text>
            </View>
            <Text style={styles.pageTitle}>Payment</Text>
            <Text style={styles.pageSubtitle}>Secure checkout via PayHere</Text>
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
            <Text style={styles.methodPillText}>Credit / Debit Card — via PayHere</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          </View>
          <Text style={styles.methodHint}>
            You'll enter your card details on PayHere's secure checkout page. Play Buddy never
            sees or stores your card number.
          </Text>

          {/* Refund policy */}
          <View style={styles.refundBox}>
            <Text style={styles.refundTitle}>Refund Policy</Text>
            <Text style={styles.refundText}>
              Refunds are subject to the venue's cancellation policy. Cancel before the game
              begins for a full refund, otherwise a cancellation fee may apply.
            </Text>
          </View>

          {confirming && (
            <View style={styles.confirmingBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.confirmingText}>Confirming your payment…</Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.payBtn, (preparing || confirming) && styles.payBtnDisabled]}
            activeOpacity={0.85}
            disabled={preparing || confirming}
            onPress={handlePay}
          >
            {preparing ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <Text style={styles.payBtnText}>
                Pay {facility.currency} {perPlayerAmount}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={!!checkoutHtml} animationType="slide" onRequestClose={() => setCheckoutHtml(null)}>
        <SafeAreaView style={styles.checkoutContainer}>
          <View style={styles.checkoutTopBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setCheckoutHtml(null)}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>PayHere Checkout</Text>
            <View style={{ width: 36 }} />
          </View>
          {checkoutHtml && (
            <WebView
              source={{ html: checkoutHtml, baseUrl: MATCH_API_URL }}
              onShouldStartLoadWithRequest={handleNavigationRequest}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.centered}>
                  <ActivityIndicator color={colors.accent} size="large" />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
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
    marginBottom: 8,
  },
  methodPillText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  methodHint: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    lineHeight: 16,
    marginBottom: 16,
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
    color: "#d4a017",
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

  confirmingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },
  confirmingText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
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

  checkoutContainer: { flex: 1, backgroundColor: colors.background[0] },
  checkoutTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
