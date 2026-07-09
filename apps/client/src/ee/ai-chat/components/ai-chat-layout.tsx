import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useChatInfoQuery } from "../queries/ai-chat-query";
import { useChatStream } from "../hooks/use-chat-stream";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import ChatMessageList from "./chat-message-list";
import ChatEmptyState from "./chat-empty-state";
import ChatInput from "./chat-input";
import ChatSkeleton from "./chat-skeleton";
import { Button, Group, Text } from "@mantine/core";
import { IconRefresh, IconAlertTriangle, IconWifiOff, IconLock, IconClock, IconSettings, IconServer } from "@tabler/icons-react";
import type { PageMention, ChatAttachment } from "../types/ai-chat.types";
import type { HomeAiPromptInitialState } from "@/features/home/components/home-ai-prompt";
import { useTranslation } from "react-i18next";
import classes from "../styles/ai-chat.module.css";

type ErrorCategory = 'network' | 'auth' | 'rate_limit' | 'server' | 'config' | 'unknown';

function classifyError(errorCode: string | null, error: string | null): ErrorCategory {
  if (!errorCode && error?.toLowerCase().includes('fetch')) return 'network';
  switch (errorCode) {
    case 'TIMEOUT': return 'network';
    case 'AUTH_ERROR': return 'auth';
    case 'RATE_LIMIT': return 'rate_limit';
    case 'NO_PROVIDER':
    case 'MODEL_NOT_FOUND': return 'config';
    case 'PROVIDER_ERROR':
    case 'INTERNAL_ERROR': return 'server';
    default: return 'unknown';
  }
}

const ERROR_CONFIG: Record<ErrorCategory, {
  icon: React.ComponentType<{ size?: number | string }>;
  titleKey: string;
}> = {
  network:     { icon: IconWifiOff,      titleKey: 'Connection error' },
  auth:        { icon: IconLock,         titleKey: 'Authentication required' },
  rate_limit:  { icon: IconClock,        titleKey: 'Rate limit reached' },
  server:      { icon: IconServer,       titleKey: 'Server error' },
  config:      { icon: IconSettings,     titleKey: 'Configuration error' },
  unknown:     { icon: IconAlertTriangle, titleKey: 'Something went wrong' },
};

export default function AiChatLayout() {
  const { chatId } = useParams<{ chatId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const chatInfoQuery = useChatInfoQuery(chatId);
  const lastMessageRef = useRef<string>("");

  // If the URL points at a chat the user does not own, the info fetch 404s.
  // Bounce them back to /ai so they cannot interact with any chat UI (including
  // kicking off orphan uploads) tied to a chat they have no access to.
  useEffect(() => {
    if (chatId && chatInfoQuery.isError) {
      navigate("/ai", { replace: true });
    }
  }, [chatId, chatInfoQuery.isError, navigate]);
  const {
    messages,
    streamingContent,
    streamingToolCalls,
    isStreaming,
    error,
    errorCode,
    isRetryable,
    sendMessage,
    stopGeneration,
    regenerate,
    hydrateFromServer,
  } = useChatStream(chatId);

  const autoSentRef = useRef(false);

  useEffect(() => {
    if (chatInfoQuery.data?.messages) {
      hydrateFromServer(chatInfoQuery.data.messages);
    }
  }, [chatInfoQuery.data, hydrateFromServer]);

  useEffect(() => {
    if (autoSentRef.current || chatId) return;
    const state = location.state as HomeAiPromptInitialState | null;
    if (!state?.initialContent && !state?.initialAttachments?.length) return;

    autoSentRef.current = true;
    lastMessageRef.current = state.initialContent ?? "";
    sendMessage(
      state.initialContent ?? "",
      state.initialMentions ?? [],
      state.initialAttachments ?? [],
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [chatId, location, navigate, sendMessage]);

  // Wrap sendMessage to track last message for retry
  const sendMessageWithTracking = useCallback(
    (content: string, mentions?: PageMention[], attachments?: ChatAttachment[]) => {
      lastMessageRef.current = content;
      sendMessage(content, mentions ?? [], attachments ?? []);
    },
    [sendMessage]
  );

  // Focus input on Ctrl+K
  const handleFocusInput = useCallback(() => {
    const editor = document.querySelector(".tiptap[contenteditable='true']") as HTMLElement;
    if (editor) {
      editor.focus();
    }
  }, []);

  useKeyboardShortcuts({
    onCtrlK: handleFocusInput,
  });

  const hasMessages = messages.length > 0 || isStreaming || !!chatId;

  // While the redirect effect is running (or if the user is still on this
  // component for any reason) never render the chat UI for a forbidden chat.
  if (chatId && chatInfoQuery.isError) {
    return null;
  }

  // Show skeleton while loading chat info
  if (chatId && chatInfoQuery.isLoading) {
    return (
      <div className={classes.main}>
        <ChatSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className={classes.main}>
      {hasMessages ? (
        <>
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            streamingToolCalls={streamingToolCalls}
            onRegenerate={regenerate}
          />
          {error && (() => {
            const category = classifyError(errorCode, error);
            const config = ERROR_CONFIG[category];
            const IconComponent = config.icon;
            return (
              <div
                className={classes.errorMessage}
                role="alert"
                data-error-category={category}
              >
                <div className={classes.errorIcon}>
                  <IconComponent size={16} />
                </div>
                <div className={classes.errorContent}>
                  <Text size="sm" fw={500}>{t(config.titleKey)}</Text>
                  <Text size="sm" c="dimmed" mt={2}>{error}</Text>
                  {isRetryable && lastMessageRef.current && (
                    <Group gap="xs" mt="xs">
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconRefresh size={12} />}
                        onClick={() => sendMessage(lastMessageRef.current)}
                      >
                        {t("Retry")}
                      </Button>
                    </Group>
                  )}
                </div>
              </div>
            );
          })()}
          <div className={classes.inputArea}>
            <ChatInput
              isStreaming={isStreaming}
              onSend={sendMessageWithTracking}
              onStop={stopGeneration}
              chatId={chatId}
            />
          </div>
        </>
      ) : (
        <ChatEmptyState
          isStreaming={isStreaming}
          onSend={sendMessageWithTracking}
          onStop={stopGeneration}
        />
      )}
    </div>
  );
}
