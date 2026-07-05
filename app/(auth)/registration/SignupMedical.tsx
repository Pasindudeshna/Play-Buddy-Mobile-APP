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
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Gap,
  Padding,
} from "../../../styles/GlobalStyles";
import { PageDots, StepIndicator } from "./SignupAccount";

export default function SignupMedical() {
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [conditions, setConditions] = useState("");


  const handleUpdateMedical = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      // 💾 Update user document with medical & emergency info
      await updateDoc(doc(db, "users", user.uid), {
        emergencyContactName: contactName,
        emergencyContactPhone: contactPhone,
        bloodType: bloodType,
        medicalConditions: conditions,
        updatedAt: new Date(),
      });

      alert("Medical information saved!");
      
      // Move to next screen (KYC)
      router.push("../registration/Signupkyc");
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
        <StepIndicator currentStep={3} />

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medical & Emergency</Text>
          <Text style={styles.cardSubtitle}>This information helps keep you safe during play</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Emergency Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Color.colorGray300}
              value={contactName}
              onChangeText={setContactName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Emergency Contact Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+94 *********"
              placeholderTextColor={Color.colorGray300}
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Blood Type</Text>
              <TextInput
                style={styles.input}
                placeholder="eg. O+"
                placeholderTextColor={Color.colorGray300}
                value={bloodType}
                onChangeText={setBloodType}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Medical Conditions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any conditions we should know about..."
              placeholderTextColor={Color.colorGray300}
              multiline
              numberOfLines={3}
              value={conditions}
              onChangeText={setConditions}
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
            onPress={handleUpdateMedical}
          >
            <Text style={styles.continueBtnText}>Continue  ›</Text>
          </TouchableOpacity>
        </View>

        {/* Dots */}
        <PageDots total={4} current={3} />

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
  },
  cardSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginTop: 2,
  },

  rowFields: { flexDirection: "row", gap: 12 },
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
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
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