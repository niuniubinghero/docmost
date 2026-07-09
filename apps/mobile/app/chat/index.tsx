import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendMessage } from '../../lib/api/ai';
import { storage } from '../../lib/storage';
import { getApiClient } from '../../lib/api-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      // Create a new chat for each conversation (simplified)
      const chatRes = await getApiClient().post('/ai/chats/create', {
        title: userMsg.content.slice(0, 50),
      });
      const chatId = chatRes.data.id;

      const response = await sendMessage(chatId, userMsg.content);

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE data
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                } else if (parsed.type === 'text' && parsed.text) {
                  assistantContent += parsed.text;
                }
              } catch {}
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: assistantContent || 'Thinking...' }
                : m
            )
          );
        }
      }

      if (!assistantContent) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'No response received.' }
              : m
          )
        );
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${e.message || 'Failed to get response'}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.message, item.role === 'user' ? styles.userMsg : styles.assistantMsg]}>
      <Text style={[styles.messageText, item.role === 'user' && styles.userMsgText]}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Chat</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything..."
          placeholderTextColor="#999"
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={20} color={input.trim() && !sending ? '#fff' : '#999'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  messagesList: {
    padding: 16,
  },
  message: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMsg: {
    backgroundColor: '#228be6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantMsg: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  userMsgText: {
    color: '#fff',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#228be6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#eee',
  },
});
