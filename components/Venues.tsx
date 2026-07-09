import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
} from "firebase/firestore";
import * as React from "react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { callMatchApi } from "../lib/matchApi";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding,
} from "../styles/GlobalStyles";

type VenueOption = {
  id: string;
  name: string;
  address: string | null;
  location: { latitude: number; longitude: number };
  rating: number | null;
  distanceFromMidpointKm: number;
  distanceByPlayerKm?: Record<string, number>;
  votes: Record<string, boolean>;
  voteCount: number;
  source?: "registered" | "places";
};

type MatchDoc = {
  players: string[];
  selectedVenueId: string | null;
};

type VenuesProps = {
  matchId?: string;
};

const castVote = (matchId: string, venueId: string) =>
  callMatchApi("/api/cast-vote", { matchId, venueId });
const confirmVenue = (matchId: string, venueId: string) =>
  callMatchApi("/api/confirm-venue", { matchId, venueId });

export default function Venues({ matchId }: VenuesProps) {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [busyVenueId, setBusyVenueId] = useState<string | null>(null);
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const unsubMatch = onSnapshot(doc(db, "matches", matchId), (snap) => {
      setMatch(snap.exists() ? (snap.data() as MatchDoc) : null);
    });

    const unsubVenues = onSnapshot(
      collection(db, "matches", matchId, "venueOptions"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<VenueOption, "id">) }))
          .sort((a, b) => a.distanceFromMidpointKm - b.distanceFromMidpointKm);
        setVenues(list);
        setLoading(false);
      }
    );

    return () => {
      unsubMatch();
      unsubVenues();
    };
  }, [matchId]);

  const handleVote = async (venueId: string) => {
    if (!matchId || busyVenueId) return;
    setBusyVenueId(venueId);
    try {
      await castVote(matchId, venueId);
    } catch (e: any) {
      alert(e?.message ?? "Couldn't cast vote.");
    } finally {
      setBusyVenueId(null);
    }
  };

  const handleConfirm = async (venueId: string) => {
    if (!matchId || busyVenueId) return;
    setBusyVenueId(venueId);
    try {
      await confirmVenue(matchId, venueId);
    } catch (e: any) {
      alert(e?.message ?? "Couldn't confirm venue.");
    } finally {
      setBusyVenueId(null);
    }
  };

  const openInMaps = (venue: VenueOption) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${venue.location.latitude},${venue.location.longitude}`;
    Linking.openURL(url);
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
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            <Text style={styles.brandB}>B</Text>
            {"  "}PLAY BUDDY
          </Text>
          <View style={styles.topBarIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Text style={styles.menuIcon}>‹</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Page header ── */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderIconBox}>
              <Text style={styles.pageHeaderIcon}>📍</Text>
            </View>
            <View>
              <Text style={styles.pageTitle}>Venue</Text>
              <Text style={styles.pageSubtitle}>
                Vote on a real ground near your matched buddy.
              </Text>
            </View>
          </View>

          {!matchId ? (
            <Text style={styles.emptyText}>No match selected.</Text>
          ) : loading ? (
            <ActivityIndicator size="large" color={Color.colorMediumspringgreen} />
          ) : venues.length === 0 ? (
            <Text style={styles.emptyText}>
              Searching for venues near you both — check back in a moment.
            </Text>
          ) : (
            <View style={styles.venuesList}>
              {venues.map((venue) => {
                const isSelected = match?.selectedVenueId === venue.id;
                const iVoted = myUid ? !!venue.votes?.[myUid] : false;
                const isBusy = busyVenueId === venue.id;

                return (
                  <View
                    key={venue.id}
                    style={[styles.venueCard, isSelected && styles.venueCardSelected]}
                  >
                    <Image
                      style={styles.venueMap}
                      resizeMode="cover"
                      source={{
                        uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${venue.location.latitude},${venue.location.longitude}&zoom=15&size=600x240&maptype=mapnik&markers=${venue.location.latitude},${venue.location.longitude},red-pushpin`,
                      }}
                    />

                    <View style={styles.venueInfo}>
                      <View style={styles.venueHeaderRow}>
                        <Text style={styles.venueName}>{venue.name}</Text>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {venue.source === "registered" && (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedBadgeText}>Registered</Text>
                            </View>
                          )}
                          {isSelected && (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedBadgeText}>Confirmed</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {venue.address && (
                        <Text style={styles.venueArea}>{venue.address}</Text>
                      )}

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Distance</Text>
                        <Text style={styles.infoValue}>
                          {myUid && venue.distanceByPlayerKm?.[myUid] != null
                            ? `${venue.distanceByPlayerKm[myUid]} km from you`
                            : `${venue.distanceFromMidpointKm} km from midpoint`}
                        </Text>
                      </View>

                      {venue.rating != null && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Rating</Text>
                          <Text style={styles.infoValue}>⭐ {venue.rating}</Text>
                        </View>
                      )}

                      <TouchableOpacity onPress={() => openInMaps(venue)}>
                        <Text style={styles.mapsLink}>Open in Google Maps ↗</Text>
                      </TouchableOpacity>

                      <View style={styles.divider} />

                      {/* Buttons */}
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[styles.voteBtn, iVoted && styles.voteBtnActive]}
                          activeOpacity={0.8}
                          disabled={isBusy}
                          onPress={() => handleVote(venue.id)}
                        >
                          <Text style={styles.voteBtnText}>
                            {iVoted ? "Voted ✓" : "Vote"} ({venue.voteCount})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.bookBtn}
                          activeOpacity={0.85}
                          disabled={isBusy || isSelected}
                          onPress={() => handleConfirm(venue.id)}
                        >
                          <Text style={styles.bookBtnText}>
                            {isSelected ? "Confirmed" : "Confirm This"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Bottom padding */}
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

  /* ── Top bar ── */
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
  topBarIcons: { flexDirection: "row", gap: 12 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: { color: Color.colorWhite, fontSize: 16 },

  scrollContent: { paddingHorizontal: 20 },

  /* ── Page header ── */
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    marginBottom: 20,
  },
  pageHeaderIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  pageHeaderIcon: { fontSize: 20 },
  pageTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 22,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    marginTop: 2,
  },

  emptyText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    textAlign: "center",
    marginTop: 24,
  },

  /* ── Venue cards ── */
  venuesList: { gap: 20 },
  venueCard: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.1)",
  },
  venueCardSelected: {
    borderColor: Color.colorMediumspringgreen,
    borderWidth: 1.5,
  },
  venueMap: {
    width: "100%",
    height: 120,
  },

  venueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venueName: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },
  venueArea: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    marginTop: 2,
  },
  selectedBadge: {
    backgroundColor: "rgba(69,255,179,0.15)",
    borderRadius: Border.br_full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Color.colorMediumspringgreen,
  },
  selectedBadgeText: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
    fontWeight: "700",
  },

  venueInfo: {
    padding: Padding.padding_20,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  infoValue: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },

  mapsLink: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 4,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  voteBtn: {
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  voteBtnActive: {
    backgroundColor: "rgba(69,255,179,0.15)",
  },
  voteBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
  bookBtn: {
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 26,
    paddingVertical: 10,
    backgroundColor: "rgba(69,255,179,0.15)",
  },
  bookBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});
