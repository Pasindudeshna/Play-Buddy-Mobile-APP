import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import * as React from "react";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding
} from "../../../styles/GlobalStyles";
import { PageDots, StepIndicator } from "./SignupAccount";

/* Sport data */
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

export default function SignupSports() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["badminton", "table_tennis", "tennis"])
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpdateSports = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      if (selected.size === 0) {
        alert("Please select at least one sport.");
        return;
      }

      // 💾 Update user document with sports preferences
      await updateDoc(doc(db, "users", user.uid), {
        sportsPreferences: Array.from(selected),
        updatedAt: new Date(),
      });

      alert("Sports preferences saved!");
      
      // Move to next screen
      router.push("../registration/SignupMedical");
    } catch (error) {
      alert(error.message);
      console.log(error);
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

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>
            <Text style={styles.brandB}>B</Text>
            {"  "}PLAY BUDDY
          </Text>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.joinText}>
            Join{" "}
            <Text style={styles.joinBrand}>PLAY BUDDY</Text>
          </Text>
          <Text style={styles.subtitle}>Complete your profile to start finding buddies</Text>
        </View>

        {/* Step Indicator */}
        <StepIndicator currentStep={2} />

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sports Preferences</Text>
          <Text style={styles.cardSubtitle}>Select all sports you play and set your skill level for each</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sportsList}
          >
            {SPORTS.map((sport) => {
              const isSelected = selected.has(sport.id);
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.sportCard, isSelected && styles.sportCardSelected]}
                  onPress={() => toggle(sport.id)}
                  activeOpacity={0.8}
                >
                  {/* Left: emoji bubble */}
                  <View style={[styles.emojiBox, isSelected && styles.emojiBoxSelected]}>
                    <Text style={styles.emoji}>{sport.emoji}</Text>
                  </View>

                  {/* Label */}
                  <Text style={[styles.sportLabel, isSelected && styles.sportLabelSelected]}>
                    {sport.label}
                  </Text>

                  {/* Checkmark if selected */}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.85}
            onPress={handleUpdateSports}
          >
            <Text style={styles.continueBtnText}>Continue  ›</Text>
          </TouchableOpacity>
        </View>

        {/* Dots */}
        <PageDots total={4} current={2} />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  header: { marginTop: 16, marginBottom: 8 },
  brand: {
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  brandB: { color: Color.colorMediumspringgreen },

  titleBlock: { marginTop: 12, marginBottom: 16 },
  joinText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: 28,
    fontWeight: "700",
  },
  joinBrand: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.ethnocentric,
    fontSize: 28,
    letterSpacing: 1,
  },
  subtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    marginTop: 4,
  },

  card: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    marginTop: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
  },
  cardTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginTop: 2,
    marginBottom: 12,
  },

  sportsList: {
    gap: 10,
    paddingBottom: 8,
  },

  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 14,
  },
  sportCardSelected: {
    backgroundColor: "rgba(69,255,179,0.08)",
    borderColor: Color.colorMediumspringgreen,
  },

  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiBoxSelected: {
    backgroundColor: "rgba(69,255,179,0.15)",
  },
  emoji: { fontSize: 20 },

  sportLabel: {
    flex: 1,
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "600",
  },
  sportLabelSelected: {
    color: Color.colorWhite,
  },

  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    color: Color.colorBlack,
    fontSize: 12,
    fontWeight: "700",
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  backText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  continueBtn: {
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  continueBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});