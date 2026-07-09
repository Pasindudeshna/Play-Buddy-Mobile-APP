import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import MatchFound from "../../components/MatchFound";
import MultiMatchPicker from "../../components/MultiMatchPicker";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import DateTimePicker from "@react-native-community/datetimepicker";
import LocationPickerMap from "../../components/LocationPickerMap";
import * as Location from "expo-location";
import { auth } from "../../firebaseConfig";
import { getCurrentCoords, type Coords } from "../../lib/location";
import {
  buildTimeSlot,
  cancelQueueTicket,
  createQueueTicket,
  subscribeToTicket,
} from "../../lib/matchQueue";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding,
  Gap,
} from "../../styles/GlobalStyles";

const SPORTS = [
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "table_tennis", label: "Table Tennis", emoji: "🏓" },
];

const TIME_SLOTS = [
  ["06:00", "07:00", "08:00", "09:00", "10:00"],
  ["11:00", "07:00", "08:00", "09:00", "10:00"],
  ["06:00", "07:00", "08:00", "09:00", "10:00"],
];

const PLAYER_OPTIONS = ["01", "02", "03", "04"];

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

const DEFAULT_REGION: Region = {
  latitude: 6.9271,
  longitude: 79.8612,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function FindBuddy() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [radius, setRadius] = useState(5);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [pinCoords, setPinCoords] = useState<Coords | null>(null);
  const [pickedCoords, setPickedCoords] = useState<Coords | null>(null);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [choosingTicketId, setChoosingTicketId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const getValidationMessage = (): string | null => {
    if (!selectedSport) return "Please select a sport.";
    if (!selectedDate) return "Please select a date.";
    if (!selectedTime) return "Please select a time slot.";
    if (!selectedPlayers) return "Please select how many buddies you need.";
    return null;
  };
  const canSearch = getValidationMessage() === null;

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const getSelectedTimeLabel = () => {
    if (!selectedTime) return null;
    const [ri, si] = selectedTime.split("-").map(Number);
    return TIME_SLOTS[ri]?.[si] ?? null;
  };

  const handleOpenMapPicker = async () => {
    const start = pickedCoords ?? (await getCurrentCoords().catch(() => null));
    if (start) {
      const region = { ...DEFAULT_REGION, latitude: start.latitude, longitude: start.longitude };
      setMapRegion(region);
      setPinCoords(start);
    } else {
      setPinCoords({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
    }
    setShowMapPicker(true);
  };

  const handleConfirmPin = async () => {
    if (!pinCoords) return;
    setPickedCoords(pinCoords);
    setShowMapPicker(false);
    try {
      const [place] = await Location.reverseGeocodeAsync(pinCoords);
      const label = place
        ? [place.name, place.street, place.city].filter(Boolean).join(", ")
        : null;
      setPickedLabel(label || "Pinned location");
    } catch {
      setPickedLabel("Pinned location");
    }
  };

  const handleCancelSearch = async () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    if (ticketId) {
      try {
        await cancelQueueTicket(ticketId);
      } catch (e) {
        console.log("Failed to cancel queue ticket:", e);
      }
    }
    setTicketId(null);
    setSearching(false);
    setChoosingTicketId(null);
  };

  const handleFindBuddy = async () => {
    const timeLabel = getSelectedTimeLabel();
    const user = auth.currentUser;
    if (!canSearch || !timeLabel || !selectedDate || !user) return;

    setSearchError(null);
    setSearching(true);

    try {
      const coords = pickedCoords ?? (await getCurrentCoords().catch(() => null));

      if (!coords) {
        setSearching(false);
        setSearchError("Please pick a location on the map or enable GPS.");
        return;
      }

      const timeSlot = buildTimeSlot(selectedDate, timeLabel);
      const newTicketId = await createQueueTicket({
        userId: user.uid,
        sport: selectedSport!,
        date: selectedDate,
        timeSlot,
        playersNeeded: parseInt(selectedPlayers!, 10),
        coords,
        radiusKm: radius,
      });

      setTicketId(newTicketId);

      unsubscribeRef.current = subscribeToTicket(newTicketId, (ticket) => {
        if (!ticket) return;
        if (ticket.status === "matched" && ticket.matchId) {
          unsubscribeRef.current?.();
          unsubscribeRef.current = null;
          setSearching(false);
          setChoosingTicketId(null);
          setMatchId(ticket.matchId);
        } else if (ticket.status === "choosing") {
          setSearching(false);
          setChoosingTicketId(ticket.id);
        } else if (ticket.status === "cancelled" || ticket.status === "expired") {
          unsubscribeRef.current?.();
          unsubscribeRef.current = null;
          setSearching(false);
          setChoosingTicketId(null);
          setTicketId(null);
          if (ticket.status === "expired") {
            setSearchError("No buddy found nearby yet. Try again in a bit or widen your search.");
          }
        } else if (ticket.status === "waiting") {
          setSearching(true);
          setChoosingTicketId(null);
        }
      });
    } catch (e: any) {
      setSearching(false);
      setSearchError(e?.message ?? "Something went wrong while searching.");
      console.log("Find buddy error:", e);
    }
  };

  if (matchId) {
    return (
      <MatchFound
        matchId={matchId}
        onBack={() => {
          setMatchId(null);
          setTicketId(null);
        }}
      />
    );
  }

  if (choosingTicketId) {
    return (
      <MultiMatchPicker
        ticketId={choosingTicketId}
        onBack={handleCancelSearch}
      />
    );
  }

  if (searching) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.background}
        />
        <SafeAreaView style={[styles.safeArea, styles.searchingWrap]}>
          <ActivityIndicator size="large" color={Color.colorMediumspringgreen} />
          <Text style={styles.searchingTitle}>Searching for a buddy…</Text>
          <Text style={styles.searchingSubtitle}>
            Looking within {radius}km of your selected location. This can take a moment.
          </Text>
          <TouchableOpacity style={styles.cancelSearchBtn} onPress={handleCancelSearch}>
            <Text style={styles.cancelSearchBtnText}>Cancel Search</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>

        {/* Top bar */}
        <View style={styles.topBar}>
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Page heading */}
          <View style={styles.pageHeading}>
            <View style={styles.headingIconBox}>
              <Text style={styles.headingIcon}>🔍</Text>
            </View>
            <View>
              <Text style={styles.pageTitle}>Find a Buddy</Text>
              <Text style={styles.pageSubtitle}>
                Set your preferences and we'll find the perfect match
              </Text>
            </View>
          </View>

          {/* ── Select Sport ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Sport</Text>
            <View style={styles.sportsGrid}>
              {SPORTS.map((sport) => {
                const isSelected = selectedSport === sport.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[styles.sportTile, isSelected && styles.sportTileSelected]}
                    onPress={() => setSelectedSport(sport.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                    <Text style={[styles.sportLabel, isSelected && styles.sportLabelSelected]}>
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Date & Time ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Date & Time</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateLabel}>Date</Text>
            </View>
            <TouchableOpacity
              style={styles.dateInput}
              activeOpacity={0.85}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={selectedDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                {selectedDate ? formatDate(selectedDate) : "Select a date"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate ?? new Date()}
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
              <TouchableOpacity
                style={styles.dateDoneBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dateDoneBtnText}>Done</Text>
              </TouchableOpacity>
            )}

            <View style={styles.timeSlotsWrapper}>
              {TIME_SLOTS.map((row, ri) => (
                <View key={ri} style={styles.timeRow}>
                  {row.map((slot, si) => {
                    const key = `${ri}-${si}`;
                    const isActive = selectedTime === key;
                    return (
                      <TouchableOpacity
                        key={si}
                        style={[styles.timeChip, isActive && styles.timeChipActive]}
                        onPress={() => setSelectedTime(key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* ── Players ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Players</Text>
            <View style={styles.playersRow}>
              <Text style={styles.playersIcon}>👥</Text>
              <Text style={styles.playersLabel}>Buddies Needed</Text>
            </View>
            <View style={styles.playerChips}>
              {PLAYER_OPTIONS.map((opt) => {
                const isActive = selectedPlayers === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.playerChip, isActive && styles.playerChipActive]}
                    onPress={() => setSelectedPlayers(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.playerChipText, isActive && styles.playerChipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Location ── */}
          <View style={[styles.card, { zIndex: 10 }]}>
            <Text style={styles.cardTitle}>Location</Text>
            <View style={styles.playersRow}>
              <Text style={styles.playersIcon}>📍</Text>
              <Text style={styles.playersLabel}>Select your location</Text>
            </View>

            <TouchableOpacity
              style={styles.mapPickBtn}
              onPress={handleOpenMapPicker}
              activeOpacity={0.85}
            >
              <Text style={styles.mapPickBtnText}>
                {pickedLabel ? `📍 ${pickedLabel}` : "📍 Pick exact location on map"}
              </Text>
              {pickedCoords && (
                <TouchableOpacity
                  onPress={() => { setPickedCoords(null); setPickedLabel(null); }}
                  hitSlop={8}
                >
                  <Text style={styles.mapPickClear}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.sliderHeader}>
              <Text style={styles.sliderLabel}>Search Radius</Text>
              <Text style={styles.sliderValue}>{radius} km</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={Color.colorMediumspringgreen}
              maximumTrackTintColor="rgba(255,255,255,0.15)"
              thumbTintColor={Color.colorMediumspringgreen}
            />
            <View style={styles.sliderFooter}>
              <Text style={styles.sliderFooterText}>1 km</Text>
              <Text style={styles.sliderFooterText}>30 km</Text>
            </View>
          </View>

          {/* ── Find Button ── */}
         <TouchableOpacity
            style={[styles.findBtn, !canSearch && styles.findBtnDisabled]}
            activeOpacity={canSearch ? 0.85 : 1}
            onPress={handleFindBuddy}
            disabled={!canSearch}
            >
            <Text style={styles.findBtnIcon}>🔍</Text>
            <Text style={styles.findBtnText}>Find my Play Buddy</Text>
            </TouchableOpacity>

          <Text style={[styles.findHint, searchError && styles.findHintError]}>
            {searchError ?? getValidationMessage() ?? "All set — tap Find my Play Buddy!"}
          </Text>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <View style={styles.mapModalContainer}>
          <LocationPickerMap
            key={`${mapRegion.latitude}-${mapRegion.longitude}`}
            initialRegion={mapRegion}
            onPinChange={setPinCoords}
          />

          <SafeAreaView style={styles.mapModalTopBar} pointerEvents="box-none">
            <TouchableOpacity style={styles.mapModalCloseBtn} onPress={() => setShowMapPicker(false)}>
              <Text style={styles.mapModalCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalHint}>Tap or drag the pin to set your spot</Text>
          </SafeAreaView>

          <SafeAreaView style={styles.mapModalBottomBar}>
            <TouchableOpacity
              style={[styles.mapModalConfirmBtn, !pinCoords && styles.findBtnDisabled]}
              activeOpacity={0.85}
              disabled={!pinCoords}
              onPress={handleConfirmPin}
            >
              <Text style={styles.mapModalConfirmBtnText}>Confirm Location</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
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
  topBarRight: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarIcon: { fontSize: 18 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  pageHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  headingIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  headingIcon: { fontSize: 24 },
  pageTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "700",
  },
  pageSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginTop: 2,
    maxWidth: 220,
  },

  card: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.07)",
    gap: 12,
  },
  cardTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },

  /* Sport tiles */
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sportTile: {
    width: "47%",
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_12,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sportTileSelected: {
    borderColor: Color.colorMediumspringgreen,
    backgroundColor: "rgba(69,255,179,0.06)",
  },
  sportEmoji: { fontSize: 32 },
  sportLabel: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
  sportLabelSelected: { color: Color.colorWhite },

  /* Date */
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 },
  dateIcon: { fontSize: 16 },
  dateLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  dateInput: {
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_20,
    height: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  dateInputText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  dateInputPlaceholder: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  dateDoneBtn: {
    alignSelf: "flex-end",
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: -4,
  },
  dateDoneBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },

  /* Time slots */
  timeSlotsWrapper: { gap: 8 },
  timeRow: { flexDirection: "row", gap: 8 },
  timeChip: {
    flex: 1,
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_10,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeChipActive: {
    borderColor: Color.colorMediumspringgreen,
    backgroundColor: "rgba(69,255,179,0.08)",
  },
  timeChipText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
  timeChipTextActive: { color: Color.colorMediumspringgreen },

  /* Players */
  playersRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 },
  playersIcon: { fontSize: 16 },
  playersLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  playerChips: { flexDirection: "row", gap: 10 },
  playerChip: {
    width: 52,
    height: 52,
    borderRadius: Border.br_12,
    backgroundColor: Color.color1Gray200,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  playerChipActive: {
    borderColor: Color.colorMediumspringgreen,
    backgroundColor: "rgba(69,255,179,0.08)",
  },
  playerChipText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "600",
  },
  playerChipTextActive: { color: Color.colorMediumspringgreen },

  /* Map picker trigger */
  mapPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_20,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mapPickBtnText: {
    flex: 1,
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  mapPickClear: {
    color: Color.colorGray300,
    fontSize: 14,
    paddingLeft: 10,
  },

  /* Map picker modal */
  mapModalContainer: { flex: 1, backgroundColor: Color.colorBlack },
  mapModalTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: "flex-start",
    gap: 8,
  },
  mapModalCloseBtn: {
    backgroundColor: "rgba(8,9,9,0.85)",
    borderRadius: Border.br_20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mapModalCloseBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  mapModalHint: {
    alignSelf: "center",
    backgroundColor: "rgba(8,9,9,0.85)",
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    borderRadius: Border.br_20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapModalBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  mapModalConfirmBtn: {
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  mapModalConfirmBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },

  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  sliderValue: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },
  slider: { width: "100%", height: 36, marginTop: -6 },
  sliderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
  },
  sliderFooterText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },

  /* Find button */
  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    height: 54,
    marginTop: 4,
    marginBottom: 10,
  },
  findBtnDisabled: { opacity: 0.45 },
  findBtnIcon: { fontSize: 16 },
  findBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  findHint: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    textAlign: "center",
  },
  findHintError: {
    color: Color.colorOrangered,
  },

  /* Searching state */
  searchingWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  searchingTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "700",
    marginTop: 8,
  },
  searchingSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
  },
  cancelSearchBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  cancelSearchBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
});