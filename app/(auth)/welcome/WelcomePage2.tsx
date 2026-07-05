import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import * as React from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
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

const sports = [
  { name: "Badminton", status: "0 Active" },
  { name: "Tennis", status: "0 Active" },
  { name: "Table Tennis", status: "0 Active" },
];

export default function WelcomePage2() {
  const statusBarHeight = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={["#080909", "#051B1F"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={["rgba(69, 255, 179, 0.05)", "transparent"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.3 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

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

          {/* ── Centre block: badge + title ── */}
          <View style={styles.centerBlock}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>🏸</Text>
              <Text style={styles.badgeText}>Pick Your Sport</Text>
            </View>

            <Text style={styles.title}>Available</Text>
            <Text style={styles.titleAccent}>Sports</Text>
            <Text style={styles.description}>
              Choose from our growing list of supported sports. More are coming soon!
            </Text>
          </View>

          {/* ── Sport cards ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.cardList}
            showsVerticalScrollIndicator={false}
          >
            {sports.map((sport) => (
              <View key={sport.name} style={styles.card}>
                <Text style={styles.cardName}>{sport.name}</Text>
                <View style={styles.cardStatusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.cardStatus}>{sport.status}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ── Pagination dots ── */}
          <View style={styles.pagination}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.dot, i === 1 && styles.activeDot]} />
            ))}
          </View>

          {/* ── Buttons ── */}
          <View style={styles.buttons}>
            <Link href="/welcome/WelcomePage1" asChild>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
                <Text style={styles.secondaryButtonText}>‹ Back</Text>
              </TouchableOpacity>
            </Link>

            <Link href="/welcome/WelcomePage3" asChild>
              <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Next ›</Text>
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
    marginBottom: Spacing.lg,
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

  /* ── Cards ── */
  scroll: {
    flex: 1,
  },
  cardList: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Color.colorSurface,
    borderRadius: Border.br_20,
    borderWidth: 1,
    borderColor: Color.colorSurfaceBorder,
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
  },
  cardStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(69, 255, 179, 0.08)",
    borderRadius: Border.br_full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Color.colorMediumspringgreen,
    opacity: 0.7,
  },
  cardStatus: {
    color: Color.colorGray200,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },

  /* ── Pagination ── */
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
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
    flexDirection: "row",
    gap: Spacing.md,
  },

  /* Primary — solid green pill */
  primaryButton: {
    flex: 1,
    height: ButtonHeight.md,
    borderRadius: Border.br_full,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  primaryButtonText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /* Secondary — dark pill with green border */
  secondaryButton: {
    flex: 1,
    height: ButtonHeight.md,
    borderRadius: Border.br_full,
    backgroundColor: Color.colorSecondaryButtonBg,
    borderWidth: 1,
    borderColor: Color.colorSecondaryButtonBorder,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  secondaryButtonText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    letterSpacing: 0.3,
  },
});