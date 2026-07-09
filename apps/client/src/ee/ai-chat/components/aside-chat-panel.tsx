import { useState, useEffect, useCallback } from "react";
import { ActionIcon, Popover, Tooltip, UnstyledButton, Button, Text } from "@mantine/core";
import {
  IconPlus,
  IconChevronDown,
  IconArrowsDiagonal,
  IconX,
  IconSparkles,
  IconFileText,
  IconLanguage,
  IconSearch,
  IconRefresh,
  IconWifiOff,
  IconLock,
  IconClock,
  IconSettings,
  IconServer,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Editor } from "@tiptap/core";
import { asideStateAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom";
import { editorSelectionAtom } from "@/features/editor/atoms/editor-atoms";
import { usePageQuery } from "@/features/page/queries/page-query";
import { extractPageSlugId } from "@/lib";
import { useChatStream } from "../hooks/use-chat-stream";
import { useChatInfoQuery } from "../queries/ai-chat-query";
import ChatMessageList from "./chat-message-list";
import ChatInput from "./chat-input";
import AsideChatHistory from "./aside-chat-history";
import type { ChatAttachment, PageMention } from "../types/ai-chat.types";
import classes from "../styles/aside-chat-panel.module.css";

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

type QuickAction = {
  icon: React.ReactNode;
  label: string;
  prompt: string;
};

interface AsideChatPanelProps {
  editor?: Editor | null;
}

export default function AsideChatPanel({ editor }: AsideChatPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, setAsideState] = useAtom(asideStateAtom);
  const editorSelection = useAtomValue(editorSelectionAtom);
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contextPages, setContextPages] = useState<PageMention[]>([]);
  const { pageSlug } = useParams();
  const slugId = extractPageSlugId(pageSlug);
  const { data: page } = usePageQuery({ pageId: slugId });

  const chatInfoQuery = useChatInfoQuery(chatId);
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
  } = useChatStream(chatId, {
    onChatCreated: (newChatId) => {
      setChatId(newChatId);
    },
  });

  useEffect(() => {
    if (page) {
      setContextPages((prev) => {
        const hasPage = prev.some((p) => p.id === page.id);
        if (hasPage) return prev;
        return [{ id: page.id, title: page.title || "", slugId: page.slugId }];
      });
    }
  }, [page]);

  const handleRemoveContextPage = useCallback((pageId: string) => {
    setContextPages((prev) => prev.filter((p) => p.id !== pageId));
  }, []);

  useEffect(() => {
    if (chatInfoQuery.data?.messages) {
      hydrateFromServer(chatInfoQuery.data.messages);
    }
  }, [chatInfoQuery.data, hydrateFromServer]);

  // Drop the open chatId if the current user lost access to it (404/403 on
  // the info fetch). Reverts the panel to a fresh chat instead of presenting
  // an input tied to a chat the user does not own.
  useEffect(() => {
    if (chatId && chatInfoQuery.isError) {
      setChatId(undefined);
    }
  }, [chatId, chatInfoQuery.isError]);

  const handleNewChat = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      event.preventDefault();
      setChatId(undefined);
      if (page) {
        setContextPages([
          { id: page.id, title: page.title || "", slugId: page.slugId },
        ]);
      }
    },
    [page],
  );

  const handleSelectChat = useCallback((selectedChatId: string) => {
    setChatId(selectedChatId);
    setHistoryOpen(false);
  }, []);

  const handleExpand = useCallback(() => {
    if (chatId) {
      navigate(`/ai/chat/${chatId}`);
    } else {
      navigate("/ai");
    }
    setAsideState({ tab: "", isAsideOpen: false });
  }, [chatId, navigate, setAsideState]);

  const handleClose = useCallback(() => {
    setAsideState({ tab: "", isAsideOpen: false });
  }, [setAsideState]);

  const handleSend = useCallback(
    (content: string, mentions: PageMention[], attachments: ChatAttachment[]) => {
      const contextPageId = contextPages.length > 0 ? contextPages[0].id : undefined;
      // Include selected text from editor as context
      const selectionText = editorSelection?.text;
      sendMessage(content, mentions, attachments, contextPageId, contextPages, selectionText);
    },
    [sendMessage, contextPages, editorSelection],
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      const contextPageId = contextPages.length > 0 ? contextPages[0].id : undefined;
      sendMessage(prompt, [], [], contextPageId, contextPages);
    },
    [sendMessage, contextPages],
  );

  const hasMessages = messages.length > 0 || isStreaming;

  const quickActions: QuickAction[] = [
    { icon: <IconFileText size={16} />, label: t("Summarize this page"), prompt: t("ai.quick_summarize", "Summarize this page") },
    { icon: <IconLanguage size={16} />, label: t("Translate this page"), prompt: t("ai.quick_translate", "Translate this page") },
    { icon: <IconSearch size={16} />, label: t("Analyze for insights"), prompt: t("ai.quick_analyze", "Analyze this page for insights") },
  ];

  return (
    <div className={classes.panel}>
      <div className={classes.toolbar}>
        <Popover
          opened={historyOpen}
          onChange={setHistoryOpen}
          position="bottom-start"
          width={280}
          shadow="md"
        >
          <Popover.Target>
            <UnstyledButton
              className={classes.titleButton}
              onClick={() => setHistoryOpen((o) => !o)}
            >
              <span className={classes.titleText}>
                {chatInfoQuery.data?.chat?.title || t("New chat")}
              </span>
              <IconChevronDown size={16} stroke={1.75} />
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown>
            <AsideChatHistory activeChatId={chatId} onSelect={handleSelectChat} />
          </Popover.Dropdown>
        </Popover>

        <div className={classes.toolbarSpacer} />

        <Tooltip label={t("New chat")} openDelay={250}>
          <ActionIcon
            component="a"
            href="/ai"
            variant="subtle"
            color="dark"
            aria-label={t("New chat")}
            onClick={handleNewChat}
          >
            <IconPlus size={20} stroke={1.75} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={t("Open full page")} openDelay={250}>
          <ActionIcon
            variant="subtle"
            color="dark"
            aria-label={t("Open full page")}
            onClick={handleExpand}
          >
            <IconArrowsDiagonal size={18} stroke={1.5} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label={t("Close")} openDelay={250}>
          <ActionIcon
            variant="subtle"
            color="dark"
            aria-label={t("Close")}
            onClick={handleClose}
          >
            <IconX size={20} stroke={1.75} />
          </ActionIcon>
        </Tooltip>
      </div>

{error && (() => {
        const category = classifyError(errorCode, error);
        const config = ERROR_CONFIG[category];
        const IconComponent = config.icon;
        return (
          <div className={classes.errorBanner} data-error-category={category}>
            <div className={classes.errorIcon}>
              <IconComponent size={14} />
            </div>
            <div className={classes.errorContent}>
              <Text size="xs" fw={500}>{t(config.titleKey)}</Text>
              <Text size="xs" c="dimmed" mt={2}>{error}</Text>
              {isRetryable && (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconRefresh size={12} />}
                  onClick={() => {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg?.content) sendMessage(lastUserMsg.content);
                  }}
                  mt="xs"
                >
                  {t("Retry")}
                </Button>
              )}
            </div>
          </div>
        );
      })()}

      {hasMessages ? (
        <>
          <div className={classes.messages} data-aside-chat>
            <ChatMessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingToolCalls={streamingToolCalls}
              onRegenerate={regenerate}
            />
          </div>
        </>
      ) : (
        <div className={classes.emptyState}>
          <div className={classes.emptyStateIconWrapper}>
            <IconSparkles size={28} stroke={1.5} />
          </div>
          <div className={classes.emptyStateTitle}>{t("How can I help you today?")}</div>
          <div className={classes.emptyStateSubtitle}>{t("Ask me to summarize, translate, or edit this page")}</div>
          <div className={classes.quickActions}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={classes.quickAction}
                onClick={() => handleQuickAction(action.prompt)}
              >
                <span className={classes.quickActionIcon}>{action.icon}</span>
                <span className={classes.quickActionLabel}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={classes.inputArea}>
        <ChatInput
          isStreaming={isStreaming}
          onSend={handleSend}
          onStop={stopGeneration}
          placeholder={t("Ask anything...")}
          autofocus={false}
          contextPages={contextPages}
          onRemoveContextPage={handleRemoveContextPage}
          variant="flat"
          chatId={chatId}
        />
      </div>
    </div>
  );
}
