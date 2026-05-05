// apps/mobile/app/chat/[id].tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore, supabase } from '../../store/auth';
import { api } from '../../utils/api';
import { format, isToday, isYesterday } from 'date-fns';

const COLORS = {
  bg: '#0F172A',
  surface: '#1E293B',
  accent: '#6C63FF',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  myBubble: '#6C63FF',
  theirBubble: '#1E293B',
  border: '#334155',
  inputBg: '#1E293B',
};

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'MMM d, HH:mm');
}

function MessageBubble({ message, isMe }: { message: any; isMe: boolean }) {
  return (
    <View style={[
      styles.messageRow,
      isMe ? styles.messageRowMe : styles.messageRowThem,
    ]}>
      {!isMe && (
        <Image
          source={{ uri: message.sender?.avatar_url || `https://ui-avatars.com/api/?name=${message.sender?.full_name}&background=6C63FF&color=fff` }}
          style={styles.avatarSmall}
        />
      )}
      <View style={[
        styles.bubble,
        isMe ? styles.bubbleMe : styles.bubbleThem,
      ]}>
        {message.type === 'image' && message.image_url ? (
          <Image
            source={{ uri: message.image_url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : message.type === 'location' && message.location_data ? (
          <View style={styles.locationMessage}>
            <Ionicons name="location" size={16} color={isMe ? '#fff' : COLORS.accent} />
            <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>
              {message.location_data.address || 'Shared location'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isMe && { color: '#fff' }]}>
            {message.content}
          </Text>
        )}
        <Text style={[
          styles.messageTime,
          isMe ? styles.messageTimeMe : styles.messageTimeThem,
        ]}>
          {formatMessageTime(message.created_at)}
          {isMe && (
            <Text> {message.is_read ? ' ✓✓' : ' ✓'}</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const res = await api.getMessages(conversationId);
      setMessages(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== user?.id) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = useCallback(async (
    type: 'text' | 'image' | 'location' = 'text',
    extra: any = {}
  ) => {
    const content = type === 'text' ? input.trim() : extra.content || '';
    if (type === 'text' && !content) return;

    setSending(true);
    const optimisticMsg = {
      id: Date.now().toString(),
      conversation_id: conversationId,
      sender_id: user!.id,
      type,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: user,
      ...extra,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');

    try {
      const res = await api.sendMessage({
        conversation_id: conversationId,
        type,
        content: content || (type !== 'text' ? type : ''),
        ...extra,
      });

      // Replace optimistic with real
      setMessages(prev =>
        prev.map(m => m.id === optimisticMsg.id ? res.data : m)
      );
    } catch (err) {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, user, conversationId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Upload to Supabase Storage
      const uri = result.assets[0].uri;
      const fileName = `chat/${conversationId}/${Date.now()}.jpg`;

      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);

      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, formData, { contentType: 'image/jpeg' });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(data.path);

        sendMessage('image', {
          content: 'Image',
          image_url: publicUrl,
        });
      }
    }
  };

  const shareLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const loc = await Location.getCurrentPositionAsync({});
    const [geo] = await Location.reverseGeocodeAsync(loc.coords);

    sendMessage('location', {
      content: 'Location',
      location_data: {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        address: [geo.street, geo.city].filter(Boolean).join(', '),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMe={item.sender_id === user?.id} />
          )}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
          <Ionicons name="image-outline" size={22} color={COLORS.subtext} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.attachBtn} onPress={shareLocation}>
          <Ionicons name="location-outline" size={22} color={COLORS.subtext} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
          placeholderTextColor={COLORS.subtext}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!input.trim() || sending) && styles.sendBtnDisabled,
          ]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 16, gap: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, gap: 8 },
  messageRowMe: { flexDirection: 'row-reverse' },
  messageRowThem: {},
  avatarSmall: { width: 28, height: 28, borderRadius: 14, marginBottom: 16 },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 12,
    paddingBottom: 6,
  },
  bubbleMe: {
    backgroundColor: COLORS.myBubble,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: COLORS.theirBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMe: { color: 'rgba(255,255,255,0.6)' },
  messageTimeThem: { color: COLORS.subtext },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  attachBtn: { padding: 8, marginBottom: 2 },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
