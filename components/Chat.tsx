import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import {
    Border,
    Color,
    FontFamily,
    FontSize,
    Padding,
} from "../styles/GlobalStyles";

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp | null;
};

type ChatProps = {
  matchId?: string;
};

export default function Chat({ matchId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<Message>>(null);
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!matchId) return;

    const messagesQuery = query(
      collection(db, "matches", matchId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }))
      );
    });

    return unsubscribe;
  }, [matchId]);

  useEffect(() => {
    if (messages.length > 0) {
      // Give the list a tick to render the new row before scrolling
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !matchId || !myUid) return;

    setInput("");
    await addDoc(collection(db, "matches", matchId, "messages"), {
      senderId: myUid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === myUid;
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={styles.bubbleText}>{item.text}</Text>
        </View>
      </View>
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
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.brand}>
              <Text style={styles.brandB}>B</Text>
              {"  "}PLAY BUDDY
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {/* ── Page header ── */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderIcon}>💬</Text>
            <Text style={styles.pageTitle}>Chat</Text>
          </View>

          {/* ── Chat box ── */}
          <View style={styles.chatBox}>
            {!matchId ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No match selected.</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatBoxContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No messages yet. Say hi!
                    </Text>
                  </View>
                }
              />
            )}
          </View>

          {/* ── Input row ── */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Color.colorGray300}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!!matchId}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              activeOpacity={0.8}
              onPress={handleSend}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.colorBlack },
  background: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  /* ── Top bar ── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Border.br_16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backBtnText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  brand: {
    color: Color.colorWhite,
    fontFamily: FontFamily.ethnocentric,
    fontSize: FontSize.fs_13,
    letterSpacing: 1.5,
  },
  brandB: { color: Color.colorMediumspringgreen },
  topBarIcons: { flexDirection: "row", gap: 12 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: { color: Color.colorWhite, fontSize: 16 },

  /* ── Page header ── */
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  pageHeaderIcon: {
    fontSize: 18,
    color: Color.colorWhite,
  },
  pageTitle: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_16,
    fontWeight: "700",
  },

  /* ── Chat box ── */
  chatBox: {
    flex: 1,
    marginHorizontal: 20,
    backgroundColor: Color.colorMediumturquoise,
    borderRadius: Border.br_16,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.1)",
    overflow: "hidden",
  },
  chatBoxContent: {
    padding: Padding.padding_20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: Color.colorGray300,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_12,
  },

  /* ── Message bubbles ── */
  bubbleRow: {
    width: "100%",
    marginBottom: 10,
    flexDirection: "row",
  },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    borderRadius: Border.br_16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "rgba(69,255,179,0.18)",
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.35)",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
    lineHeight: 18,
  },

  /* ── Input row ── */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: Border.br_20,
    borderWidth: 1,
    borderColor: "rgba(69,255,179,0.3)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 18,
    color: Color.colorWhite,
    fontFamily: FontFamily.calSans,
    fontSize: FontSize.fs_13,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Color.colorMediumspringgreen,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: {
    color: Color.colorWhite,
    fontSize: 18,
    transform: [{ rotate: "0deg" }],
  },
});
