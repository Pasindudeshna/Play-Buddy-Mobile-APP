import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { auth } from "../firebaseConfig";
import { cancelBooking, subscribeToMyBookings, type Booking } from "../lib/booking";
import { Border, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

export default function MyBookings({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    return subscribeToMyBookings(
      user.uid,
      (list) => {
        setBookings(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  const handleCancel = (booking: Booking) => {
    Alert.alert("Cancel booking?", `${booking.facilityName} on ${booking.date} at ${booking.startTime}`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel booking",
        style: "destructive",
        onPress: async () => {
          setCancellingId(booking.id);
          try {
            await cancelBooking(booking.id);
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const today = new Date().toISOString().slice(0, 10);
  const isUpcoming = (b: Booking) => b.status !== "cancelled" && b.date >= today;

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
          <Text style={styles.title}>My Bookings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : bookings.length === 0 ? (
            <Text style={styles.emptyText}>You haven't booked any grounds yet.</Text>
          ) : (
            bookings.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.facilityName}>{b.facilityName}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      b.status === "cancelled" && styles.statusBadgeCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        b.status === "cancelled" && styles.statusBadgeTextCancelled,
                      ]}
                    >
                      {b.status === "cancelled" ? "Cancelled" : b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  📅 {b.date} · {b.startTime}–{b.endTime}
                </Text>
                <Text style={styles.meta}>
                  {b.totalAmount} {b.currency}
                  {b.status !== "cancelled" && b.paymentStatus === "unpaid" ? " · pay at venue" : ""}
                </Text>

                {isUpcoming(b) && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(b)}
                    disabled={cancellingId === b.id}
                  >
                    <Text style={styles.cancelBtnText}>
                      {cancellingId === b.id ? "Cancelling…" : "Cancel booking"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  facilityName: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },

  statusBadge: {
    borderRadius: Border.br_full,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeCancelled: { backgroundColor: colors.dangerSoft },
  statusBadgeText: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
    fontWeight: "700",
  },
  statusBadgeTextCancelled: { color: colors.danger },

  cancelBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: Border.br_20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: colors.danger,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    fontWeight: "600",
  },
});
