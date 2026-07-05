import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import * as React from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Border,
  ButtonHeight,
  Color,
  FontFamily,
  FontSize,
  Spacing,
} from "../../../styles/GlobalStyles";

export default function WelcomePage1() {
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={["#080909", "#051B1F"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle radial glow at bottom */}
      <LinearGradient
        colors={["rgba(69, 255, 179, 0.06)", "transparent"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.3 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top-level View offsets Android status bar, then SafeAreaView handles iOS */}
      <View style={[styles.inner, { paddingTop: statusBarHeight }]}>
        <SafeAreaView style={styles.safeArea}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>B</Text>
              </View>
              <Text style={styles.brand}>PLAY BUDDY</Text>
            </View>
          </View>

          {/* ── Centre block: badge + hero copy ── */}
          <View style={styles.centerBlock}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>⚡</Text>
              <Text style={styles.badgeText}>Find Your Perfect Play Buddy</Text>
            </View>

            <Text style={styles.title}>Never Play</Text>
            <Text style={styles.titleAccent}>Alone Again</Text>
            <Text style={styles.description}>
              Connect with verified sports enthusiasts near you. Find partners,
              book venues, split costs and play your favourite indoor sports — all
              in one app.
            </Text>
          </View>

          {/* ── Spacer fills remaining space ── */}
          <View style={styles.spacer} />

          {/* ── Pagination dots ── */}
          <View style={styles.pagination}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.activeDot]} />
            ))}
          </View>

          {/* ── Buttons ── */}
          <View style={styles.buttons}>
            <Link href="/welcome/WelcomePage2" asChild>
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                <Text style={styles.buttonIconLeft}>▶</Text>
                <Text style={styles.primaryButtonText}>Get Started Free</Text>
                <Text style={styles.buttonIconRight}>◀</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/(auth)/LoginPage" asChild>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
                <Text style={styles.secondaryButtonText}>Login to play</Text>
                <Text style={styles.secondaryArrow}> ›</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080909",
  },
  inner: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    // Fixed bottom padding so buttons are never clipped by gesture bar
    paddingBottom: 40,
  },

  /* ── Header ── */
  header: {
    paddingTop: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: Border.br_6,
    borderWidth: 2,
    borderColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  logoMarkText: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_15,
    lineHeight: 18,
  },
  brand: {
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_15,
    letterSpacing: 1.5,
  },

  /* ── Centre block ── */
  centerBlock: {
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },

  /* ── Badge ── */
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  badgeIcon: {
    fontSize: 12,
    color: Color.colorMediumspringgreen,
  },
  badgeText: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    letterSpacing: 0.2,
  },

  /* ── Hero ── */
  title: {
    color: Color.colorWhite,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: FontSize.fs_36,
    lineHeight: 44,
    textAlign: "center",
  },
  titleAccent: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: FontSize.fs_36,
    lineHeight: 44,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  description: {
    color: Color.colorGray200,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: "88%",
  },

  spacer: {
    flex: 1,
    minHeight: 20,
  },

  /* ── Pagination ── */
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  activeDot: {
    backgroundColor: Color.colorMediumspringgreen,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* ── Buttons ── */
  buttons: {
    gap: Spacing.md,
  },

  /* Primary — solid green pill */
  primaryButton: {
    height: ButtonHeight.md,
    borderRadius: Border.br_full,
    backgroundColor: Color.colorMediumspringgreen,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  primaryButtonText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonIconLeft: {
    color: Color.colorBlack,
    fontSize: 9,
    marginRight: Spacing.sm,
    opacity: 0.7,
  },
  buttonIconRight: {
    color: Color.colorBlack,
    fontSize: 9,
    marginLeft: Spacing.sm,
    opacity: 0.7,
  },

  /* Secondary — dark pill with green border */
  secondaryButton: {
    height: ButtonHeight.md,
    borderRadius: Border.br_full,
    backgroundColor: Color.colorSecondaryButtonBg,
    borderWidth: 1,
    borderColor: Color.colorSecondaryButtonBorder,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  secondaryButtonText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    letterSpacing: 0.3,
  },
  secondaryArrow: {
    color: Color.colorWhite,
    fontSize: FontSize.fs_15,
    lineHeight: 18,
  },
});