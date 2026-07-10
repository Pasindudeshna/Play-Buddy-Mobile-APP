import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
  createBooking,
  generateSlotStartTimes,
  getFullSlotTimes,
  isBookable,
  slotEndTime,
  subscribeToApprovedFacilities,
  type Facility,
} from "../lib/booking";
import { distanceKm, getCurrentCoords, type Coords } from "../lib/location";
import { Border, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

const SPORTS = [
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "table_tennis", label: "Table Tennis", emoji: "🏓" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "cricket", label: "Cricket", emoji: "🏏" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function BookGround({
  onBack,
  onViewBookings,
}: {
  onBack: () => void;
  onViewBookings: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [myCoords, setMyCoords] = useState<Coords | null>(null);

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToApprovedFacilities(
      (list) => {
        setFacilities(list.filter(isBookable));
        setLoadingFacilities(false);
      },
      () => setLoadingFacilities(false)
    );
  }, []);

  useEffect(() => {
    getCurrentCoords()
      .then(setMyCoords)
      .catch(() => setMyCoords(null));
  }, []);

  useEffect(() => {
    if (!selectedFacility) return;
    setLoadingSlots(true);
    setBookingError(null);
    setConfirmedSlot(null);
    getFullSlotTimes(selectedFacility.id, toDateKey(selectedDate))
      .then(setBookedSlots)
      .finally(() => setLoadingSlots(false));
  }, [selectedFacility, selectedDate]);

  const facilitiesWithDistance = facilities.map((f) => ({
    facility: f,
    distanceKm: myCoords ? distanceKm(myCoords, f.location) : null,
  }));

  const filteredFacilities = (
    sportFilter
      ? facilitiesWithDistance.filter(({ facility }) => facility.sports.includes(sportFilter))
      : facilitiesWithDistance
  ).sort((a, b) => {
    if (a.distanceKm == null || b.distanceKm == null) return 0;
    return a.distanceKm - b.distanceKm;
  });

  const slots = selectedFacility
    ? generateSlotStartTimes(
        selectedFacility.openingTime,
        selectedFacility.closingTime,
        selectedFacility.slotDurationMinutes
      )
    : [];

  const handleBookSlot = async (startTime: string) => {
    const user = auth.currentUser;
    if (!user || !selectedFacility) return;

    setBookingSlot(startTime);
    setBookingError(null);
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const u = userSnap.exists() ? (userSnap.data() as any) : {};
      await createBooking({
        facility: selectedFacility,
        userId: user.uid,
        userName: u.fullName ?? "Player",
        userPhone: u.phone ?? "",
        date: toDateKey(selectedDate),
        startTime,
      });
      setConfirmedSlot(startTime);
      setBookedSlots((prev) => new Set(prev).add(startTime));
    } catch (error: any) {
      setBookingError(error.message ?? "Couldn't book this slot.");
    } finally {
      setBookingSlot(null);
    }
  };

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
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => (selectedFacility ? setSelectedFacility(null) : onBack())}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedFacility ? selectedFacility.name : "Book a Ground"}</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={onViewBookings}>
            <Ionicons name="receipt-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {!selectedFacility ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.sportFilterRow}>
              <TouchableOpacity
                style={[styles.sportChip, !sportFilter && styles.sportChipActive]}
                onPress={() => setSportFilter(null)}
              >
                <Text style={[styles.sportChipText, !sportFilter && styles.sportChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {SPORTS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sportChip, sportFilter === s.id && styles.sportChipActive]}
                  onPress={() => setSportFilter(s.id)}
                >
                  <Text style={[styles.sportChipText, sportFilter === s.id && styles.sportChipTextActive]}>
                    {s.emoji} {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingFacilities ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
            ) : filteredFacilities.length === 0 ? (
              <Text style={styles.emptyText}>No approved grounds found yet.</Text>
            ) : (
              filteredFacilities.map(({ facility: f, distanceKm: dist }) => (
                <TouchableOpacity
                  key={f.id}
                  style={styles.facilityCard}
                  activeOpacity={0.85}
                  onPress={() => setSelectedFacility(f)}
                >
                  <View style={styles.facilityNameRow}>
                    <Text style={styles.facilityName}>{f.name}</Text>
                    {dist != null && (
                      <Text style={styles.facilityDistance}>{dist.toFixed(1)} km away</Text>
                    )}
                  </View>
                  <Text style={styles.facilityAddress}>{f.address}</Text>
                  <View style={styles.facilityMetaRow}>
                    <Text style={styles.facilityPrice}>
                      {f.pricePerHour} {f.currency}/hr
                    </Text>
                    <Text style={styles.facilityHours}>
                      {f.openingTime}–{f.closingTime}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.facilityAddress}>{selectedFacility.address}</Text>
            <Text style={styles.facilityPrice}>
              {selectedFacility.pricePerHour} {selectedFacility.currency}/hr
            </Text>

            <TouchableOpacity
              style={styles.dateInput}
              activeOpacity={0.85}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.dateInputText}>{formatDate(selectedDate)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS !== "ios") setShowDatePicker(false);
                  if (event.type !== "dismissed" && date) setSelectedDate(date);
                }}
              />
            )}
            {showDatePicker && Platform.OS === "ios" && (
              <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.dateDoneBtnText}>Done</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionLabel}>Available slots</Text>
            {loadingSlots ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((startTime) => {
                  const isBooked = bookedSlots.has(startTime) && confirmedSlot !== startTime;
                  const isBookingThis = bookingSlot === startTime;
                  const isConfirmed = confirmedSlot === startTime;
                  return (
                    <TouchableOpacity
                      key={startTime}
                      style={[
                        styles.slotChip,
                        isBooked && styles.slotChipBooked,
                        isConfirmed && styles.slotChipConfirmed,
                      ]}
                      disabled={isBooked || isBookingThis || !!confirmedSlot}
                      onPress={() => handleBookSlot(startTime)}
                      activeOpacity={0.8}
                    >
                      {isBookingThis ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : (
                        <Text
                          style={[
                            styles.slotChipText,
                            isBooked && styles.slotChipTextBooked,
                            isConfirmed && styles.slotChipTextConfirmed,
                          ]}
                        >
                          {startTime}–{slotEndTime(startTime, selectedFacility.slotDurationMinutes)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {bookingError && <Text style={styles.errorText}>{bookingError}</Text>}
            {confirmedSlot && (
              <View style={styles.confirmBanner}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                <Text style={styles.confirmBannerText}>
                  Booked {confirmedSlot} on {formatDate(selectedDate)}. Pay at the venue —
                  see My Bookings for details.
                </Text>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
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
    flex: 1,
    textAlign: "center",
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginHorizontal: 8,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  sportFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  sportChip: {
    borderRadius: Border.br_full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sportChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  sportChipText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    fontWeight: "600",
  },
  sportChipTextActive: { color: colors.textPrimary },

  emptyText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
    marginTop: 40,
  },

  facilityCard: {
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 4,
  },
  facilityNameRow: {
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
  facilityDistance: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
  facilityAddress: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  facilityMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  facilityPrice: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  facilityHours: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },

  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_20,
    height: 46,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  dateInputText: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  dateDoneBtn: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderRadius: Border.br_20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  dateDoneBtnText: {
    color: colors.accentText,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },

  sectionLabel: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 10,
  },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    borderRadius: Border.br_10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: "center",
  },
  slotChipBooked: { opacity: 0.4 },
  slotChipConfirmed: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  slotChipText: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    fontWeight: "600",
  },
  slotChipTextBooked: { textDecorationLine: "line-through" },
  slotChipTextConfirmed: { color: colors.accent },

  errorText: {
    color: colors.danger,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    textAlign: "center",
    marginTop: 12,
  },
  confirmBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: Border.br_12,
    padding: 12,
    marginTop: 16,
  },
  confirmBannerText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    lineHeight: 16,
  },
});
