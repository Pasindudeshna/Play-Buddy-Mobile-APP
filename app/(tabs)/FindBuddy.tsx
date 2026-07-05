import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import MatchFound from "../../components/MatchFound";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import { auth } from "../../firebaseConfig";
import { geocodeAddress, getCurrentCoords } from "../../lib/location";
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

const LOCATIONS = ["Colombo 1", "Colombo 3", "Colombo 5", "Colombo 7", "Colombo 9", "Nugegoda", "Maharagama", "Battaramulla"];

export default function FindBuddy() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string | null>(null);
  const [dateText, setDateText] = useState("");
  const [location, setLocation] = useState("Colombo 9");
  const [radius, setRadius] = useState(5);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const budget = 2500;

  const canSearch = selectedSport && selectedTime && selectedPlayers && dateText.length > 0;

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
  };

  const handleFindBuddy = async () => {
    const timeLabel = getSelectedTimeLabel();
    const user = auth.currentUser;
    if (!canSearch || !timeLabel || !user) return;

    setSearchError(null);
    setSearching(true);

    try {
      const coords =
        (await getCurrentCoords().catch(() => null)) ??
        (await geocodeAddress(location));

      if (!coords) {
        setSearching(false);
        setSearchError("Couldn't determine your location. Please enable location services.");
        return;
      }

      const timeSlot = buildTimeSlot(dateText, timeLabel);
      const newTicketId = await createQueueTicket({
        userId: user.uid,
        sport: selectedSport!,
        date: dateText,
        timeSlot,
        playersNeeded: parseInt(selectedPlayers!, 10),
        coords,
      });

      setTicketId(newTicketId);

      unsubscribeRef.current = subscribeToTicket(newTicketId, (ticket) => {
        if (!ticket) return;
        if (ticket.status === "matched" && ticket.matchId) {
          unsubscribeRef.current?.();
          unsubscribeRef.current = null;
          setSearching(false);
          setMatchId(ticket.matchId);
        } else if (ticket.status === "cancelled" || ticket.status === "expired") {
          unsubscribeRef.current?.();
          unsubscribeRef.current = null;
          setSearching(false);
          setTicketId(null);
          if (ticket.status === "expired") {
            setSearchError("No buddy found nearby yet. Try again in a bit or widen your search.");
          }
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
            Widening the search radius up to 10km. This can take a moment.
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
            <TextInput
              style={styles.dateInput}
              placeholder="mm / dd / yyyy"
              placeholderTextColor={Color.colorGray300}
              value={dateText}
              onChangeText={setDateText}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
            />

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
              style={styles.locationDropdown}
              onPress={() => setShowLocationPicker((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.locationDropdownText}>{location}</Text>
              <Text style={styles.locationDropdownChevron}>⌄</Text>
            </TouchableOpacity>

            {showLocationPicker && (
              <View style={styles.locationPicker}>
                {LOCATIONS.map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={styles.locationOption}
                    onPress={() => { setLocation(loc); setShowLocationPicker(false); }}
                  >
                    <Text style={[
                      styles.locationOptionText,
                      location === loc && styles.locationOptionTextActive,
                    ]}>
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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

          {/* ── Budget ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Budget Per Person</Text>
            <Text style={styles.budgetAmount}>LKR {budget.toLocaleString()}.00</Text>
          </View>

          {/* ── Find Button ── */}
         <TouchableOpacity
            style={[styles.findBtn, !canSearch && styles.findBtnDisabled]}
            activeOpacity={canSearch ? 0.85 : 1}
            onPress={handleFindBuddy}
            >
            <Text style={styles.findBtnIcon}>🔍</Text>
            <Text style={styles.findBtnText}>Find my Play Buddy</Text>
            </TouchableOpacity>

          <Text style={[styles.findHint, searchError && styles.findHintError]}>
            {searchError ?? "Please select a sport, date, time and area to continue"}
          </Text>

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
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
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

  /* Location */
  locationDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_20,
    height: 46,
    paddingHorizontal: 16,
  },
  locationDropdownText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  locationDropdownChevron: {
    color: Color.colorGray300,
    fontSize: 18,
  },
  locationPicker: {
    backgroundColor: Color.color1Gray100,
    borderRadius: Border.br_12,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.15)",
    overflow: "hidden",
    marginTop: -4,
  },
  locationOption: { paddingHorizontal: 16, paddingVertical: 11 },
  locationOptionText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  locationOptionTextActive: { color: Color.colorMediumspringgreen },

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

  /* Budget */
  budgetAmount: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_20,
    fontWeight: "700",
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