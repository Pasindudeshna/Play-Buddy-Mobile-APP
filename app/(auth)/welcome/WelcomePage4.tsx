import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import * as React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Border, Color, FontFamily, FontSize } from "../../../styles/GlobalStyles";

const steps = [
  {
    step: "01",
    title: "Set Your Preferences",
    description: "Choose sport, date, time, area and skill level",
  },
  {
    step: "02",
    title: "Find the Perfect Buddy",
    description: "Our engine finds the perfect play buddies near you",
  },
  {
    step: "03",
    title: "Browse Nearby Courts",
    description: "Browse nearby courts and vote for your favourite",
  },
  {
    step: "04",
    title: "Split Costs Securely",
    description: "Fair cost splitting with secure in-app payment",
  },
  {
    step: "05",
    title: "Show Up and Play",
    description: "Show up, play hard, rate each other and track scores",
  },
];

export default function WelcomePage4() {
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

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>How it Works</Text>
          <Text style={styles.subtitle}>Five simple steps to your next game</Text>

          <View style={styles.stepsList}>
            {steps.map((item, index) => (
              <View key={item.step} style={styles.stepRow}>
                {/* Left column: circle + connector line */}
                <View style={styles.leftColumn}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNumber}>{item.step}</Text>
                  </View>
                  {index < steps.length - 1 && <View style={styles.connector} />}
                </View>

                {/* Right column: text */}
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Pagination */}
        <View style={styles.pagination}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Buttons */}
         {/* Back / Next buttons */}
                <View style={styles.buttons}>
                  <Link href="/welcome/WelcomePage3" asChild>
                    <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
                      <Text style={styles.secondaryButtonText}>‹ Back</Text>
                    </TouchableOpacity>
                  </Link>
                  <Link href="/welcome/WelcomePage5" asChild>
                    <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                      <Text style={styles.primaryButtonText}>Next ›</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
      </SafeAreaView>
    </View>
  );
}

const CIRCLE_SIZE = 56;
const CONNECTOR_WIDTH = 2;

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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  title: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 32,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: Color.colorGray200,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    marginBottom: 32,
  },
  stepsList: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: CIRCLE_SIZE,
  },
  leftColumn: {
    alignItems: "center",
    width: CIRCLE_SIZE,
    marginRight: 20,
  },
  stepCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: Color.colorMediumspringgreen,
    backgroundColor: "rgba(69, 255, 179, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: FontSize.fs_20,
  },
  connector: {
    width: CONNECTOR_WIDTH,
    flex: 1,
    minHeight: 40,
    backgroundColor: "rgba(69, 255, 179, 0.35)",
    marginVertical: 4,
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 36,
  },
  stepTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 4,
  },
  stepDescription: {
    color: Color.colorGray200,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    lineHeight: 20,
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
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: Border.br_20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
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