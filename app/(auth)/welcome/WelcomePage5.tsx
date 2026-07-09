import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import * as React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { Border, Color, FontFamily, FontSize } from "../../../styles/GlobalStyles";

const checklistItems = [
  "Cost transparent breakdown (ground + management + booking fees)",
  "Group voting to choose the best venue",
  "Automatic slot reservation after payment",
  "Refund policy governed by venue rules",
];

function CheckIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="14" r="13" stroke={Color.colorMediumspringgreen} strokeWidth="1.5" fill="none" />
      <Path
        d="M8.5 14.5l4 4 7-8"
        stroke={Color.colorMediumspringgreen}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function WelcomePage5() {
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

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.titleWhite}>Premium Venues,</Text>
            <Text style={styles.titleGreen}>Smart Booking</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Browse top-rated courts and sports halls. Our app agent verifies availability, checks time slots, and handles all booking logistics — so you just show up and play.
          </Text>

          {/* Checklist */}
          <View style={styles.checklist}>
            {checklistItems.map((item) => (
              <View key={item} style={styles.checkRow}>
                <View style={styles.checkIcon}>
                  <CheckIcon />
                </View>
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <Link href="/welcome/WelcomePage6" asChild>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
                <Text style={styles.ctaText}>Find Court Near Me  ›</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>

        {/* Pagination */}
        <View style={styles.pagination}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
        </View>

        {/* Back / Next buttons */}
        <View style={styles.buttons}>
          <Link href="/welcome/WelcomePage4" asChild>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
              <Text style={styles.secondaryButtonText}>‹ Back</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/welcome/WelcomePage6" asChild>
            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Next ›</Text>
            </TouchableOpacity>
          </Link>
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
    paddingBottom: 36,
  },
  header: {
    marginTop: 16,
    marginBottom: 8,
  },
  brand: {
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  titleBlock: {
    marginTop: 32,
    marginBottom: 16,
  },
  titleWhite: {
    color: Color.colorWhite,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 36,
    lineHeight: 44,
  },
  titleGreen: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 36,
    lineHeight: 44,
  },
  subtitle: {
    color: Color.colorGray200,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    lineHeight: 22,
    marginBottom: 32,
  },
  checklist: {
    gap: 24,
    marginBottom: 56,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  checkIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  checkText: {
    flex: 1,
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    lineHeight: 22,
  },
  ctaContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  ctaButton: {
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_full,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  ctaText: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Color.colorMediumspringgreen,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    height: 52,
    borderRadius: Border.br_20,
    backgroundColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: Border.br_20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
});