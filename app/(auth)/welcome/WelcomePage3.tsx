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
import { Border, Color, FontFamily, FontSize } from "../../../styles/GlobalStyles";

// SVG icons via react-native-svg (install if needed: expo install react-native-svg)
import Svg, { Circle, Path, Ellipse, Rect } from "react-native-svg";

function IconPeople({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      {/* Two person silhouettes */}
      <Ellipse cx="10" cy="10" rx="4" ry="4" fill={color} opacity={0.9} />
      <Path d="M2 24c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Ellipse cx="20" cy="10" rx="4" ry="4" fill={color} opacity={0.5} />
      <Path d="M14 24c0-2.8 1.4-5.3 3.6-6.8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}

function IconPin({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 2C9.582 2 6 5.582 6 10c0 6 8 16 8 16s8-10 8-16c0-4.418-3.582-8-8-8z"
        fill={color}
        opacity={0.85}
      />
      <Circle cx="14" cy="10" r="3" fill="#000" opacity={0.5} />
    </Svg>
  );
}

function IconChat({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Path
        d="M4 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-4 4V6z"
        fill={color}
        opacity={0.85}
      />
    </Svg>
  );
}

function IconShield({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 2L4 6v8c0 6 4.5 10.5 10 12 5.5-1.5 10-6 10-12V6L14 2z"
        fill={color}
        opacity={0.85}
      />
      <Path
        d="M9 14l3 3 7-7"
        stroke="#000"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </Svg>
  );
}

function IconStar({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 2l3.09 6.26L24 9.27l-5 4.87 1.18 6.88L14 17.77l-6.18 3.25L9 14.14 4 9.27l6.91-1.01L14 2z"
        fill={color}
        opacity={0.9}
      />
    </Svg>
  );
}

const features = [
  {
    title: "Players Matching",
    description:
      "Players matching based on your skill level, location, preferred sport and schedule.",
    Icon: IconPeople,
    iconColor: "#45ffb3",
    iconBg: "rgba(69, 255, 179, 0.12)",
  },
  {
    title: "Venue Discovery & Voting",
    description:
      "Find nearby courts and grounds. Vote democratically with your group for the best venue.",
    Icon: IconPin,
    iconColor: "#ff4d4d",
    iconBg: "rgba(255, 77, 77, 0.12)",
  },
  {
    title: "In-App Group Chat",
    description:
      "Communicate with your play buddies, coordinate plans and discuss before the game.",
    Icon: IconChat,
    iconColor: "#a78bfa",
    iconBg: "rgba(167, 139, 250, 0.12)",
  },
  {
    title: "KYC Verified Safety",
    description:
      "All players are KYC-verified. Emergency contacts, medical info and ambulance access always available.",
    Icon: IconShield,
    iconColor: "#45ffb3",
    iconBg: "rgba(69, 255, 179, 0.12)",
  },
  {
    title: "Rewards System",
    description: "Earn perks, bonuses, and exclusive deals as you play.",
    Icon: IconStar,
    iconColor: "#facc15",
    iconBg: "rgba(250, 204, 21, 0.12)",
  },
];

export default function WelcomePage3() {
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

        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Everything You Need</Text>
          <Text style={styles.subtitle}>
            From finding a buddy to booking a court — PlayBuddy handles it all
          </Text>

          <View style={styles.featureList}>
            {features.map((feature) => {
              const { Icon, iconColor, iconBg } = feature;
              return (
                <View key={feature.title} style={styles.featureCard}>
                  {/* Icon circle */}
                  <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                    <Icon color={iconColor} />
                  </View>

                  {/* Text */}
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Pagination */}
        <View style={styles.pagination}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Buttons */}
       <View style={styles.buttons}>
                         <Link href="/welcome/WelcomePage2" asChild>
                           <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75}>
                             <Text style={styles.secondaryButtonText}>‹ Back</Text>
                           </TouchableOpacity>
                         </Link>
                         <Link href="/welcome/WelcomePage4" asChild>
                           <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
                             <Text style={styles.primaryButtonText}>Next ›</Text>
                           </TouchableOpacity>
                         </Link>
                       </View>
      </SafeAreaView>
    </View>
  );
}

const ICON_SIZE = 52;

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
    lineHeight: 20,
    marginBottom: 28,
  },
  featureList: {
    gap: 14,
  },
  featureCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Border.br_20,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  featureDescription: {
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