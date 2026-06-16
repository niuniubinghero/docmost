import {
  IconSparkles,
  IconSearch,
  IconFilePlus,
  IconEdit,
  IconFileText,
  IconWorld,
  IconClock,
  IconKeyboard,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useChatsQuery } from "../queries/ai-chat-query";
import { useNavigate } from "react-router-dom";
import ChatInput from "./chat-input";
import type { ChatAttachment, PageMention } from "../types/ai-chat.types";
import classes from "../styles/ai-chat.module.css";

type Suggestion = {
  icon: React.ReactNode;
  text: string;
  prompt: string;
};

type SuggestionItem = {
  icon: React.ReactNode;
  translationKey: string;
  prompt: string;
};

const SUGGESTIONS: SuggestionItem[] = [
  {
    icon: <IconWorld size={16} />,
    translationKey: "Search the web",
    prompt: "Search the web for ",
  },
  {
    icon: <IconSearch size={16} />,
    translationKey: "Search across all pages",
    prompt: "Search for pages about ",
  },
  {
    icon: <IconFilePlus size={16} />,
    translationKey: "Create a new page",
    prompt: "Create a new page titled ",
  },
  {
    icon: <IconFileText size={16} />,
    translationKey: "Summarize a page",
    prompt: "Summarize the page @",
  },
  {
    icon: <IconEdit size={16} />,
    translationKey: "Update page content",
    prompt: "Update the page @",
  },
];

type Props = {
  isStreaming: boolean;
  onSend: (content: string, mentions: PageMention[], attachments: ChatAttachment[]) => void;
  onStop: () => void;
};

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function ChatEmptyState({ isStreaming, onSend, onStop }: Props) {
  const { t } = useTranslation();
  const greetingKey = getGreetingKey();
  const navigate = useNavigate();
  const chatsQuery = useChatsQuery();

  const recentChats = (chatsQuery.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 3);

  const handleSuggestionClick = (prompt: string) => {
    onSend(prompt, [], []);
  };

  const handleRecentChatClick = (chatId: string) => {
    navigate(`/ai/chat/${chatId}`);
  };

  return (
    <div className={classes.emptyState}>
      <IconSparkles size={48} stroke={1.5} className={classes.emptyStateIcon} />
      <div className={classes.emptyStateBrand}>{t("Docmost AI")}</div>
      <h1 className={classes.emptyStateTitle}>
        {t(greetingKey)}, {t("how can I help you today?")}
      </h1>

      <div className={classes.emptyStateInput}>
        <ChatInput
          isStreaming={isStreaming}
          onSend={onSend}
          onStop={onStop}
          placeholder={t("Ask anything... Use @ to mention pages")}
          autofocus
        />
      </div>

      <div className={classes.keyboardHint}>
        <IconKeyboard size={14} />
        <span>{t("Press")} <kbd>Ctrl</kbd> + <kbd>K</kbd> {t("to open AI menu")}</span>
      </div>

      {recentChats.length > 0 && (
        <div className={classes.recentChatsSection}>
          <h2 className={classes.suggestionsLabel}>
            <IconClock size={14} style={{ marginRight: 6, verticalAlign: "middle" }} aria-hidden="true" />
            {t("Recent conversations")}
          </h2>
          <div className={classes.recentChatsList} role="list" aria-label={t("Recent conversations")}>
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={classes.recentChatItem}
                onClick={() => handleRecentChatClick(chat.id)}
                aria-label={chat.title || t("Untitled chat")}
                role="listitem"
              >
                <span className={classes.recentChatTitle}>
                  {chat.title || t("Untitled chat")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={classes.suggestionsSection}>
        <h2 className={classes.suggestionsLabel}>{t("Get started")}</h2>
        <div className={classes.suggestionsGrid} role="group" aria-label={t("Get started")}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.translationKey}
              type="button"
              className={classes.suggestionCard}
              onClick={() => handleSuggestionClick(s.prompt)}
              aria-label={t(s.translationKey)}
            >
              <span className={classes.suggestionIcon} aria-hidden="true">{s.icon}</span>
              <span className={classes.suggestionText}>{t(s.translationKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
