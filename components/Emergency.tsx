import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Padding,
} from "../styles/GlobalStyles";

const HOTLINES = [
  {
    id: "suwaseriya",
    name: "Suwa Seriya",
    desc: "Free national ambulance service",
    number: "1990",
    icon: "medkit" as const,
  },
  {
    id: "police",
    name: "Police Emergency",
    desc: "Police Emergency Call Centre",
    number: "119",
    icon: "shield-checkmark" as const,
  },
];

export default function Emergency({ onBack }: { onBack: () => void }) {
  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      alert(`Could not open the dialer. Please dial ${number} manually.`)
    );
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
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={22} color={Color.colorWhite} />
          </TouchableOpacity>
          <Text style={styles.title}>Emergency</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SOS banner */}
          <View style={styles.sosBanner}>
            <Ionicons name="alert-circle" size={28} color={Color.colorOrangered} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sosTitle}>Need urgent help?</Text>
              <Text style={styles.sosSubtitle}>
                Tap a hotline below to open your phone's dial pad.
              </Text>
            </View>
          </View>

          {/* Hotline cards */}
          <View style={styles.list}>
            {HOTLINES.map((line) => (
              <TouchableOpacity
                key={line.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => call(line.number)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={line.icon} size={24} color={Color.colorMediumspringgreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{line.name}</Text>
                  <Text style={styles.cardDesc}>{line.desc}</Text>
                </View>
                <View style={styles.callBtn}>
                  <Ionicons name="call" size={16} color={Color.colorBlack} />
                  <Text style={styles.callBtnText}>{line.number}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.disclaimer}>
            These numbers connect to Sri Lanka's national emergency services.
            Only call if you have a genuine emergency.
          </Text>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  sosBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: Border.br_16,
    borderWidth: 1.5,
    borderColor: Color.colorOrangered,
    backgroundColor: "rgba(219,34,17,0.06)",
    padding: Padding.padding_16,
    marginBottom: 20,
  },
  sosTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  sosSubtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginTop: 2,
  },

  list: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_16,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.1)",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(69,255,179,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardName: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  cardDesc: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },

  disclaimer: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 16,
  },
});
