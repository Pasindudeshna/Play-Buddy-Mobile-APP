import Ionicons from "@expo/vector-icons/Ionicons";
import * as Contacts from "expo-contacts";
import { LinearGradient } from "expo-linear-gradient";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type ThemeColors } from "../contexts/ThemeContext";
import { Border, FontFamily, FontSize, Padding } from "../styles/GlobalStyles";

const INVITE_MESSAGE =
  "Hey! I've been using Play Buddy to find sports partners and book grounds nearby — you should join!";

type ContactRow = {
  id: string;
  name: string;
  phone: string | null;
};

export default function InviteFriends({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [status, setStatus] = useState<"loading" | "denied" | "ready">("loading");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { status: permission } = await Contacts.requestPermissionsAsync();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      setContacts(
        data
          .filter((c) => c.name)
          .map((c) => ({
            id: c.id ?? c.name!,
            name: c.name!,
            phone: c.phoneNumbers?.[0]?.number ?? null,
          }))
      );
      setStatus("ready");
    })();
  }, []);

  const filteredContacts = search.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : contacts;

  const handleInvite = async (contact: ContactRow) => {
    if (contact.phone) {
      const separator = Platform.OS === "ios" ? "&" : "?";
      const url = `sms:${contact.phone}${separator}body=${encodeURIComponent(INVITE_MESSAGE)}`;
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Fall through to the generic share sheet below.
      }
    }
    await Share.share({ message: INVITE_MESSAGE });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.background}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.background}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Invite Friends</Text>
          <View style={{ width: 36 }} />
        </View>

        {status === "loading" && (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        )}

        {status === "denied" && (
          <View style={styles.centeredContent}>
            <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              Play Buddy needs contacts access to help you invite friends. You can enable it in
              your device settings.
            </Text>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "ready" && (
          <>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts"
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {filteredContacts.length === 0 ? (
                <Text style={styles.emptyText}>No contacts found.</Text>
              ) : (
                filteredContacts.map((c) => (
                  <View key={c.id} style={styles.contactRow}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{c.name}</Text>
                      {c.phone && <Text style={styles.contactPhone}>{c.phone}</Text>}
                    </View>
                    <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite(c)}>
                      <Ionicons name="paper-plane-outline" size={14} color={colors.accentText} />
                      <Text style={styles.inviteBtnText}>Invite</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <View style={{ height: 32 }} />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background[0] },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },

  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  settingsBtn: {
    backgroundColor: colors.accent,
    borderRadius: Border.br_20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingsBtnText: {
    color: colors.accentText,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "700",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: Border.br_20,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
    textAlign: "center",
    marginTop: 24,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: Border.br_16,
    padding: Padding.padding_12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    color: colors.accent,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_15,
    fontWeight: "700",
  },
  contactInfo: { flex: 1 },
  contactName: {
    color: colors.textPrimary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    fontWeight: "600",
  },
  contactPhone: {
    color: colors.textSecondary,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: Border.br_full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inviteBtnText: {
    color: colors.accentText,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_11,
    fontWeight: "700",
  },
});
