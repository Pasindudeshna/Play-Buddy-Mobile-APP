import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import * as React from "react";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Gap,
  Padding,
} from "../../../styles/GlobalStyles";

const STEPS = ["Account", "Personal", "Sports", "Medical &\nEmergency", "KYC"];

export default function SignupAccount() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
  try {

    // 🔐 Create user account
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    // 💾 Save extra data
    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      phone: phone,
      createdAt: new Date(),
    });

    alert("Account Created!");

    // Move next screen
    router.push("../registration/SignupPersonal");

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
        <StepIndicator currentStep={0} />

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Your Account</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Pasindu Fernando"
              placeholderTextColor={Color.colorGray300}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@gmail.com"
              placeholderTextColor={Color.colorGray300}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+94 *********"
              placeholderTextColor={Color.colorGray300}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Min. 8 Characters"
                placeholderTextColor={Color.colorGray300}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "👁" : "🙈"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.85}
              onPress={handleSignup}
            >
              <Text style={styles.continueBtnText}>
                Continue ›
              </Text>
            </TouchableOpacity>
        </View>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account?  </Text>
          <TouchableOpacity>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Dots */}
        <PageDots total={4} current={0} />

      </SafeAreaView>
    </View>
  );
}

/* ── Shared sub-components ── */

export function StepIndicator({ currentStep }: { currentStep: number }) {
  const STEPS = ["Account", "Personal", "Sports", "Medical &\nEmergency", "KYC"];
  return (
    <View style={stepStyles.row}>
      {STEPS.map((label, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <React.Fragment key={i}>
            <View style={[stepStyles.pill, isActive && stepStyles.pillActive, isDone && stepStyles.pillDone]}>
              <Text
                style={[stepStyles.pillText, isActive && stepStyles.pillTextActive]}
                numberOfLines={2}
              >
                {label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[stepStyles.line, isDone && stepStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function PageDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[dotStyles.dot, i === current && dotStyles.dotActive]} />
      ))}
    </View>
  );
}

/* ── Styles ── */

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
  passwordWrapper: { position: "relative" },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 16 },

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

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  loginText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  loginLink: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 0,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Border.br_full,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    minWidth: 52,
  },
  pillActive: {
    backgroundColor: Color.colorMediumspringgreen,
  },
  pillDone: {
    backgroundColor: "rgba(69,255,179,0.15)",
  },
  pillText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: 9,
    textAlign: "center",
  },
  pillTextActive: {
    color: Color.colorBlack,
    fontWeight: "700",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  lineDone: {
    backgroundColor: Color.colorMediumspringgreen,
  },
});

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    backgroundColor: Color.colorMediumspringgreen,
    width: 18,
    borderRadius: 3,
  },
});