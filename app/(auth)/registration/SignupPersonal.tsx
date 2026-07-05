import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import * as React from "react";
import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";
import { geocodeAddress, getCurrentCoords, saveUserLocation } from "../../../lib/location";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Gap,
  Padding,
} from "../../../styles/GlobalStyles";
import { PageDots, StepIndicator } from "./SignupAccount";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

export default function SignupPersonal() {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const handleUpdatePersonal = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      // 💾 Update user document with personal info
      await updateDoc(doc(db, "users", user.uid), {
        age: parseInt(age) || null,
        gender: gender,
        city: city,
        bio: bio,
        updatedAt: new Date(),
      });

      // 📍 Capture coordinates for matching: prefer live GPS, fall back to
      // geocoding the typed city/area so every user has a location + geohash.
      try {
        const coords = (await getCurrentCoords().catch(() => null)) ||
          (city.trim() ? await geocodeAddress(city.trim()) : null);
        if (coords) {
          await saveUserLocation(user.uid, coords);
        }
      } catch (locationError) {
        console.log("Could not determine user location:", locationError);
      }

      alert("Personal information saved!");

      // Move to next screen
      router.push("../registration/SignupSports");
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
        <StepIndicator currentStep={1} />

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          {/* Age + Gender row */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="25"
                placeholderTextColor={Color.colorGray300}
                keyboardType="number-pad"
                value={age}
                onChangeText={setAge}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowGenderPicker((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={styles.inputText}>{gender}</Text>
              </TouchableOpacity>
              {showGenderPicker && (
                <View style={styles.pickerDropdown}>
                  {GENDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.pickerOption}
                      onPress={() => {
                        setGender(opt);
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        gender === opt && styles.pickerOptionTextActive,
                      ]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>City / Area</Text>
            <TextInput
              style={styles.input}
              placeholder="eg. Colombo 7"
              placeholderTextColor={Color.colorGray300}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Short Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell others about yourself..."
              placeholderTextColor={Color.colorGray300}
              multiline
              numberOfLines={3}
              value={bio}
              onChangeText={setBio}
            />
          </View>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.85}
            onPress={handleUpdatePersonal}
          >
            <Text style={styles.continueBtnText}>Continue  ›</Text>
          </TouchableOpacity>
        </View>

        {/* Dots */}
        <PageDots total={4} current={1} />

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
    gap: Gap.gap_12,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.08)",
  },
  cardTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 4,
  },

  rowFields: {
    flexDirection: "row",
    gap: 12,
  },
  fieldGroup: { gap: 6 },
  label: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  input: {
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_20,
    height: 46,
    paddingHorizontal: Padding.padding_16,
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    justifyContent: "center",
  },
  inputText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  bioInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  pickerDropdown: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: Color.color1Gray100,
    borderRadius: Border.br_12,
    zIndex: 99,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.2)",
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerOptionText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  pickerOptionTextActive: {
    color: Color.colorMediumspringgreen,
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
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