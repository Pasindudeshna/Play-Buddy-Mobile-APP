import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import * as React from "react";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../firebaseConfig";
import {
  Border,
  Color,
  FontFamily,
  FontSize,
  Gap,
  Padding,
} from "../../styles/GlobalStyles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // 🔐 Sign in with Firebase
      await signInWithEmailAndPassword(auth, email, password);
      
      alert("Login successful!");
      // Navigate to home page
      router.replace("/");
    } catch (error: any) {
      alert("Login failed: " + error.message);
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const canLogin = email.length > 0 && password.length > 0 && !isLoading;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#080909", "rgba(5, 27, 31, 0.97)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brand}>
                <Text style={styles.brandB}>B</Text>
                {"  "}PLAY BUDDY
              </Text>
            </View>

            {/* Title block */}
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Login to find your play buddy</Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@gmail.com"
                  placeholderTextColor={Color.colorGray300}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="••••••••••••"
                    placeholderTextColor={Color.colorGray400}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login button */}
              <TouchableOpacity
                style={[styles.loginBtn, !canLogin && styles.loginBtnDisabled]}
                activeOpacity={canLogin ? 0.85 : 1}
                onPress={handleLogin}
                disabled={!canLogin}
              >
                {isLoading ? (
                  <ActivityIndicator color={Color.colorWhite} size="small" />
                ) : (
                  <Text style={[styles.loginBtnText, !canLogin && styles.loginBtnTextDisabled]}>
                    Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <Link href="../signup/SignupAccount" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 40,
  },

  /* Header */
  header: { marginTop: 16 },
  brand: {
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  brandB: { color: Color.colorMediumspringgreen },

  /* Title */
  titleBlock: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  title: {
    color: Color.colorWhite,
    fontFamily: FontFamily.erasBoldITC,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 46,
    marginBottom: 10,
  },
  subtitle: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },

  /* Card */
  card: {
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    padding: Padding.padding_20,
    gap: Gap.gap_16,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.07)",
  },

  fieldGroup: { gap: 8 },
  label: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: Color.color1Gray200,
    borderRadius: Border.br_20,
    height: 50,
    paddingHorizontal: Padding.padding_16,
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },

  passwordWrapper: { position: "relative" },
  passwordInput: { paddingRight: 50 },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 16 },

  loginBtn: {
    height: 50,
    borderRadius: Border.br_20,
    backgroundColor: Color.colorSlategray,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnDisabled: {
    backgroundColor: Color.colorSlategray,
    opacity: 0.6,
  },
  loginBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  loginBtnTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },

  /* Sign up */
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  signupText: {
    color: Color.colorGray400,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  signupLink: {
    color: Color.colorMediumspringgreen,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },
});