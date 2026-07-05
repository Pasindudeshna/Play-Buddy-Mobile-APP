import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import * as React from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

export default function SignupKYC() {
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedKYC, setAgreedKYC] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

    const uploadImageToCloudinary = async (imageUri) => {
    const data = new FormData();
  
    data.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "upload.jpg",
    });
  
    data.append("upload_preset", "playbuddy");
    data.append("cloud_name", "dyyb2dkgx");
  
    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dyyb2dkgx/image/upload",
      {
        method: "POST",
        body: data,
      }
    );
  
    const result = await res.json();
    return result.secure_url;
  };

  const pickImage = async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (side === "front") setFrontImage(uri);
      else setBackImage(uri);
    }
  };

  const takePhoto = async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (side === "front") setFrontImage(uri);
      else setBackImage(uri);
    }
  };

  const handleImageAction = (side: "front" | "back") => {
    Alert.alert(
      side === "front" ? "ID Front Side" : "ID Back Side",
      "Choose an option",
      [
        { text: "Take Photo", onPress: () => takePhoto(side) },
        { text: "Choose from Library", onPress: () => pickImage(side) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleCompleteSignup = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      setIsUploading(true);

      let frontImageUrl = "";
      let backImageUrl = "";

      // Upload front image to Cloudinary
      if (frontImage) {
        frontImageUrl = await uploadImageToCloudinary(frontImage);
      }

      // Upload back image to Cloudinary
      if (backImage) {
        backImageUrl = await uploadImageToCloudinary(backImage);
      }

      // 💾 Update user document with KYC image URLs from Cloudinary
      await updateDoc(doc(db, "users", user.uid), {
        nicFront: frontImageUrl,
        nicBack: backImageUrl,
        kycCompleted: true,
        updatedAt: new Date(),
      });

      alert("Registration completed successfully!");
      setIsUploading(false);
      
      // Go to home
      router.replace("/");
    } catch (error) {
      setIsUploading(false);
      alert("Upload failed: " + error.message);
      console.log(error);
    }
  };

  const canSubmit =
    agreedTerms && agreedKYC && frontImage && backImage && !isUploading;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
          <StepIndicator currentStep={4} />

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity Verification (KYC)</Text>
            <Text style={styles.cardSubtitle}>Required for player safety and trust</Text>

            {/* Security notice */}
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeIcon}>🛡</Text>
              <Text style={styles.noticeText}>
                Your ID information is encrypted and stored securely. It will only be used for
                identity verification and is never shared with other players.
              </Text>
            </View>

            {/* Front of ID */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Front of ID</Text>
              <Text style={styles.uploadHint}>National ID, Passport, or Driving License</Text>
              <TouchableOpacity
                style={[styles.uploadBox, frontImage && styles.uploadBoxFilled]}
                onPress={() => handleImageAction("front")}
                activeOpacity={0.8}
              >
                {frontImage ? (
                  <>
                    <Image source={{ uri: frontImage }} style={styles.uploadedImage} />
                    <View style={styles.changeOverlay}>
                      <Text style={styles.changeOverlayText}>Tap to change</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadBoxText}>Upload Front Side</Text>
                    <Text style={styles.uploadBoxHint}>Tap to take photo or choose from gallery</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Back of ID */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Back of ID</Text>
              <Text style={styles.uploadHint}>Clear photo of the back side</Text>
              <TouchableOpacity
                style={[styles.uploadBox, backImage && styles.uploadBoxFilled]}
                onPress={() => handleImageAction("back")}
                activeOpacity={0.8}
              >
                {backImage ? (
                  <>
                    <Image source={{ uri: backImage }} style={styles.uploadedImage} />
                    <View style={styles.changeOverlay}>
                      <Text style={styles.changeOverlayText}>Tap to change</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadBoxText}>Upload Back Side</Text>
                    <Text style={styles.uploadBoxHint}>Tap to take photo or choose from gallery</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Upload tips */}
            <View style={styles.tipsList}>
              {[
                "Ensure all text is clearly visible",
                "Avoid glare or shadows on the ID",
                "Make sure all 4 corners are visible",
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Checkboxes */}
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAgreedTerms((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                {agreedTerms && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>
                I agree to the{" "}
                <Text style={styles.checkLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={styles.checkLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAgreedKYC((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreedKYC && styles.checkboxChecked]}>
                {agreedKYC && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkText}>
                I consent to KYC verification and understand my data will be processed accordingly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Nav */}
          <View style={styles.bottomNav}>
            <TouchableOpacity onPress={() => router.back()} disabled={isUploading}>
              <Text style={[styles.backText, isUploading && styles.textDisabled]}>
                {"< Back"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtn, !canSubmit && styles.completeBtnDisabled]}
              activeOpacity={canSubmit ? 0.85 : 1}
              onPress={handleCompleteSignup}
              disabled={!canSubmit}
            >
              {isUploading ? (
                <ActivityIndicator color={Color.colorBlack} size="small" />
              ) : (
                <Text style={styles.completeBtnText}>Complete Sign Up  ›</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Dots */}
          <PageDots total={4} current={3} />

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
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
    marginTop: -6,
  },

  noticeBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(69,255,179,0.08)",
    borderRadius: Border.br_12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.2)",
    alignItems: "flex-start",
  },
  noticeIcon: { fontSize: 16, marginTop: 1 },
  noticeText: {
    flex: 1,
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    lineHeight: 17,
    fontWeight: "600",
  },

  uploadSection: { gap: 4 },
  uploadLabel: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  uploadHint: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    marginBottom: 4,
  },
  uploadBox: {
    height: 140,
    borderRadius: Border.br_12,
    backgroundColor: Color.color1Gray200,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  uploadBoxFilled: {
    borderStyle: "solid",
    borderColor: Color.colorMediumspringgreen,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  uploadIcon: { fontSize: 28 },
  uploadBoxText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
  uploadBoxHint: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  changeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 6,
    alignItems: "center",
  },
  changeOverlayText: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },

  tipsList: { gap: 6, paddingLeft: 4 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Color.colorMediumspringgreen,
  },
  tipText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Color.colorMediumspringgreen,
    borderColor: Color.colorMediumspringgreen,
  },
  checkMark: {
    color: Color.colorBlack,
    fontSize: 11,
    fontWeight: "700",
  },
  checkText: {
    flex: 1,
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    lineHeight: 18,
  },
  checkLink: {
    color: Color.colorMediumspringgreen,
    fontWeight: "600",
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
  completeBtn: {
    backgroundColor: Color.colorMediumspringgreen,
    borderRadius: Border.br_20,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  completeBtnDisabled: {
    opacity: 0.45,
  },
  completeBtnText: {
    color: Color.colorBlack,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
  textDisabled: {
    opacity: 0.5,
  },
});