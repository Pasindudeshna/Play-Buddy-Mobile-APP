import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import * as React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Border, Color, FontFamily, FontSize } from "../../../styles/GlobalStyles";

export default function WelcomePage6() {
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
          <Text style={styles.brand}>PLAY BUDDY</Text>
        </View>

        {/* Main content — pushed toward lower-middle */}
        <View style={styles.content}>
          <Text style={styles.title}>Ready To Play?</Text>
          <Text style={styles.subtitle}>
            Join thousands of players already finding their perfect game buddies.
          </Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottom}>
          {/* Back / Create Free Account buttons */}
          <View style={styles.buttonsRow}>
            {/* <Link href="/welcome/WelcomePage5" asChild>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
                <Text style={styles.secondaryButtonText}>‹ Back</Text>
              </TouchableOpacity>
            </Link> */}
            <Link href="../registration/SignupAccount" asChild>
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Create Free Account</Text>
              </TouchableOpacity>
            </Link>
          </View>

          
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.colorBlack,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
    justifyContent: "space-between",
  },

  /* ── Header ── */
  header: {
    marginTop: 16,
  },
  brand: {
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },

  /* ── Content block (lower-center feel) ── */
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  title: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 40,
    lineHeight: 48,
    marginBottom: 14,
  },
  subtitle: {
    color: Color.colorGray200,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    lineHeight: 22,
  },

  /* ── Bottom ── */
  bottom: {
    gap: 0,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 0,
  },
  secondaryButton: {
    flex: 1,
    height: 58,
    borderRadius: Border.br_20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    flex: 1.6,
    height: 58,
    marginBottom:70,
    borderRadius: Border.br_20,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  primaryButtonText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
    textAlign: "center",
  },

  /* ── Login to Play (bottom tab style) ── */
  loginRow: {
    alignSelf: "center",
    paddingVertical: 20,
  },
  loginLinkText: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    letterSpacing: 0.3,
  },
});