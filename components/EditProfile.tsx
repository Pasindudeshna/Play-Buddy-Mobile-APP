import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { auth, db } from "../firebaseConfig";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { geocodeAddress, getCurrentCoords, saveUserLocation } from "../lib/location";
import {
  Border,
  FontFamily,
  FontSize,
  Gap,
  Padding,
} from "../styles/GlobalStyles";

const GENDER_OPTIONS = ["Male", "Female", "Other"];

const SPORTS = [
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "table_tennis", label: "Table Tennis", emoji: "🏓" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "cricket", label: "Cricket", emoji: "🏏" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
];

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;
const BLOOD_TYPE_RE = /^(A|B|AB|O)[+-]$/i;

type FieldErrors = {
  fullName?: string;
  phone?: string;
  age?: string;
  city?: string;
  sports?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
};

export default function EditProfile({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [sports, setSports] = useState<Set<string>>(new Set());
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [initialCity, setInitialCity] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const u = snap.data() as any;
          setPhotoURL(u.photoURL ?? null);
          setFullName(u.fullName ?? "");
          setPhone(u.phone ?? "");
          setAge(u.age != null ? String(u.age) : "");
          setGender(u.gender ?? "Male");
          setCity(u.city ?? "");
          setInitialCity(u.city ?? "");
          setBio(u.bio ?? "");
          setSports(new Set<string>(u.sportsPreferences ?? []));
          setEmergencyContactName(u.emergencyContactName ?? "");
          setEmergencyContactPhone(u.emergencyContactPhone ?? "");
          setBloodType(u.bloodType ?? "");
          setMedicalConditions(u.medicalConditions ?? "");
        }
      } catch (error: any) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSport = (id: string) => {
    setSports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadImageToCloudinary(result.assets[0].uri);
      setPhotoURL(url);
    } catch (error: any) {
      alert("Photo upload failed: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      e.fullName = "Enter your full name.";
    }
    if (!PHONE_RE.test(phone.trim())) {
      e.phone = "Enter a valid phone number.";
    }
    const ageNum = Number(age);
    if (!age.trim() || !Number.isFinite(ageNum) || ageNum < 13 || ageNum > 100) {
      e.age = "Enter an age between 13 and 100.";
    }
    if (!city.trim()) {
      e.city = "Enter your city or area.";
    }
    if (sports.size === 0) {
      e.sports = "Select at least one sport.";
    }
    if (!emergencyContactName.trim()) {
      e.emergencyContactName = "Enter an emergency contact name.";
    }
    if (!PHONE_RE.test(emergencyContactPhone.trim())) {
      e.emergencyContactPhone = "Enter a valid contact phone number.";
    }
    if (bloodType.trim() && !BLOOD_TYPE_RE.test(bloodType.trim())) {
      e.bloodType = "Use a format like O+, A-, AB+.";
    }
    return e;
  }, [fullName, phone, age, city, sports, emergencyContactName, emergencyContactPhone, bloodType]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = async () => {
    setSubmitted(true);
    if (hasErrors) return;

    const user = auth.currentUser;
    if (!user) {
      alert("You must be signed in.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: photoURL ?? "",
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: Number(age),
        gender,
        city: city.trim(),
        bio: bio.trim(),
        sportsPreferences: Array.from(sports),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        bloodType: bloodType.trim(),
        medicalConditions: medicalConditions.trim(),
        updatedAt: new Date(),
      });

      // Best-effort location refresh if the city changed, mirroring signup.
      if (city.trim() && city.trim() !== initialCity.trim()) {
        try {
          const coords =
            (await getCurrentCoords().catch(() => null)) ||
            (await geocodeAddress(city.trim()).catch(() => null));
          if (coords) await saveUserLocation(user.uid, coords);
        } catch (locationError) {
          console.log("Could not refresh user location:", locationError);
        }
      }

      onDone();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    error,
    children,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.background}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.background}
        />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.background}
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
            <TouchableOpacity onPress={onDone}>
              <Text style={styles.backText}>{"< Back"}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarBox}
              activeOpacity={0.8}
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
            >
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={36} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.accentText} size="small" />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.accentText} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Personal Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            <Field label="Full Name" error={submitted ? errors.fullName : undefined}>
              <TextInput
                style={styles.input}
                placeholder="Pasindu Fernando"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />
            </Field>

            <Field label="Phone Number" error={submitted ? errors.phone : undefined}>
              <TextInput
                style={styles.input}
                placeholder="+94 *********"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </Field>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Field label="Age" error={submitted ? errors.age : undefined}>
                  <TextInput
                    style={styles.input}
                    placeholder="25"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Gender">
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowGenderPicker((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.inputText}>{gender}</Text>
                  </TouchableOpacity>
                  {showGenderPicker && (
                    <View style={styles.pickerDropdown}>
                      {GENDER_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.pickerOption}
                          onPress={() => {
                            setGender(opt);
                            setShowGenderPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              gender === opt && styles.pickerOptionTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Field>
              </View>
            </View>

            <Field label="City / Area" error={submitted ? errors.city : undefined}>
              <TextInput
                style={styles.input}
                placeholder="eg. Colombo 7"
                placeholderTextColor={colors.textSecondary}
                value={city}
                onChangeText={setCity}
              />
            </Field>

            <Field label="Short Bio (Optional)">
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Tell others about yourself..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={bio}
                onChangeText={setBio}
              />
            </Field>
          </View>

          {/* Sports Preferences */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sports Preferences</Text>
            {submitted && errors.sports && (
              <Text style={styles.errorText}>{errors.sports}</Text>
            )}
            <View style={styles.sportsGrid}>
              {SPORTS.map((sport) => {
                const isSelected = sports.has(sport.id);
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[styles.sportChip, isSelected && styles.sportChipSelected]}
                    onPress={() => toggleSport(sport.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                    <Text
                      style={[styles.sportLabel, isSelected && styles.sportLabelSelected]}
                    >
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Emergency & Medical */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emergency & Medical</Text>

            <Field
              label="Emergency Contact Name"
              error={submitted ? errors.emergencyContactName : undefined}
            >
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={colors.textSecondary}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
              />
            </Field>

            <Field
              label="Emergency Contact Number"
              error={submitted ? errors.emergencyContactPhone : undefined}
            >
              <TextInput
                style={styles.input}
                placeholder="+94 *********"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
              />
            </Field>

            <Field label="Blood Type (Optional)" error={submitted ? errors.bloodType : undefined}>
              <TextInput
                style={styles.input}
                placeholder="eg. O+"
                placeholderTextColor={colors.textSecondary}
                value={bloodType}
                onChangeText={setBloodType}
                autoCapitalize="characters"
              />
            </Field>

            <Field label="Medical Conditions (Optional)">
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Any conditions we should know about..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
              />
            </Field>
          </View>

          {submitted && hasErrors && (
            <Text style={styles.summaryError}>
              Please fix the highlighted fields above.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.accentText} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background[0] },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },

  avatarSection: { alignItems: "center", marginBottom: 16, gap: 6 },
  avatarBox: { position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background[0],
  },
  avatarHint: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    marginBottom: 16,
    gap: Gap.gap_12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
    marginBottom: 4,
  },

  rowFields: { flexDirection: "row", gap: 12 },
  fieldGroup: { gap: 6 },
  label: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_20,
    height: 46,
    paddingHorizontal: Padding.padding_16,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    justifyContent: "center",
  },
  inputText: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  bioInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  errorText: {
    color: colors.danger,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_10,
  },
  summaryError: {
    color: colors.danger,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
    marginBottom: 12,
  },

  pickerDropdown: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_12,
    zIndex: 99,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerOptionText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  pickerOptionTextActive: {
    color: colors.accent,
  },

  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_full,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sportChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  sportEmoji: { fontSize: 14 },
  sportLabel: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    fontWeight: "600",
  },
  sportLabelSelected: { color: colors.textPrimary },

  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: Border.br_20,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: colors.accentText,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});
