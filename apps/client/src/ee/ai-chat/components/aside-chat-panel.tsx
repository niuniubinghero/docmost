import { useState, useEffect, useCallback } from "react";
import { ActionIcon, Popover, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconPlus,
  IconChevronDown,
  IconArrowsDiagonal,
  IconX,
  IconSparkles,
  IconFileText,
  IconLanguage,
  IconSearch,
} from "@tabler/icons-react";
import { useAtom } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { asideStateAtom } from "@/components/layouts/global/hooks/atoms/sidebar-atom";
import { usePageQuery } from "@/features/page/queries/page-query";
import { extractPageSlugId } from "@/lib";
import { useChatStream } from "../hooks/use-chat-stream";
import { useChatInfoQuery } from "../queries/ai-chat-query";
import ChatMessageList from "./chat-message-list";
import ChatInput from "./chat-input";
import AsideChatHistory from "./aside-chat-history";
import type { ChatAttachment, PageMention } from "../types/ai-chat.types";
import classes from "../styles/aside-chat-panel.module.css";

type QuickAction = {
  icon: React.ReactNode;
  label: string;
  prompt: string;
};

export default function AsideChatPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, setAsideState] = useAtom(asideStateAtom);
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
    sendMessage,
    stopGeneration,
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
      sendMessage(content, mentions, attachments, contextPageId, contextPages);
    },
    [sendMessage, contextPages],
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

      {error && (
        <div style={{ padding: "0 var(--mantine-spacing-sm)" }}>
          <div style={{
            padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
            color: "var(--mantine-color-gray-6)",
            fontSize: "var(--mantine-font-size-xs)",
            borderRadius: "var(--mantine-radius-sm)",
            backgroundColor: "var(--mantine-color-gray-0)",
          }}>
            {error}
          </div>
        </div>
      )}

      {hasMessages ? (
        <>
          <div className={classes.messages} data-aside-chat>
            <ChatMessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingToolCalls={streamingToolCalls}
            />
          </div>
        </>
      ) : (
        <div className={classes.emptyState}>
          <IconSparkles size={36} stroke={1.5} className={classes.emptyStateIcon} />
          <div className={classes.emptyStateTitle}>{t("How can I help you today?")}</div>
          <div className={classes.quickActions}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={classes.quickAction}
                onClick={() => handleQuickAction(action.prompt)}
              >
                <span className={classes.quickActionIcon}>{action.icon}</span>
                {action.label}
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
