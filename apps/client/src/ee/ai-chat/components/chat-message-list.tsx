import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { IconArrowDown, IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { VisuallyHidden } from "@mantine/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AiChatMessage, AiChatToolCall } from "../types/ai-chat.types";
import ChatMessage from "./chat-message";
import classes from "../styles/ai-chat.module.css";

function ChatMessageErrorFallback() {
  const { t } = useTranslation();
  return (
    <div className={classes.messageErrorFallback}>
      <IconAlertTriangle size={14} />
      <span>{t("Failed to render this message.")}</span>
    </div>
  );
}

type Props = {
  messages: AiChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingToolCalls: AiChatToolCall[];
  onRegenerate?: () => void;
};

const BOTTOM_THRESHOLD_PX = 32;
const SCROLL_UP_THRESHOLD_PX = 5;
const SMOOTH_SCROLL_SETTLE_MS = 600;
const ESTIMATED_ITEM_SIZE = 100;

export default function ChatMessageList({
  messages,
  isStreaming,
  streamingContent,
  streamingToolCalls,
  onRegenerate,
}: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const isAutoScrollingRef = useRef(false);
  const prevScrollTopRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Dedicated status-region announcement for screen readers. Rather than
  // putting aria-live on the whole transcript (which re-fires for every
  // streamed token), announce "AI is thinking…" when streaming starts and
  // the full assistant reply once streaming completes — a single, clean read.
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const wasStreamingRef = useRef(false);

  // Virtual list items
  type VirtualItem = { type: "message"; data: AiChatMessage } | { type: "streaming"; data: null };
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = messages.map((msg) => ({ type: "message", data: msg }));
    if (isStreaming) {
      items.push({ type: "streaming", data: null });
    }
    return items;
  }, [messages, isStreaming]);

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ESTIMATED_ITEM_SIZE,
    overscan: 5,
  });

  useEffect(() => {
    const justStartedStreaming = isStreaming && !wasStreamingRef.current;
    const justFinishedStreaming = !isStreaming && wasStreamingRef.current;

    if (justStartedStreaming) {
      setStatusAnnouncement(t("AI is thinking..."));
    } else if (justFinishedStreaming) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "assistant" && lastMessage.content) {
        // Strip markdown punctuation so screen readers don't read symbols
        // like # * _ ` ~ aloud. A plain-text version is fine — the styled
        // version stays in the DOM for visual users.
        const plainText = lastMessage.content
          .replace(/[#*_`~]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        setStatusAnnouncement(plainText);
      } else {
        setStatusAnnouncement("");
      }
    }

    wasStreamingRef.current = isStreaming;
  }, [isStreaming, messages, t]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;

    isAutoScrollingRef.current = true;
    const target = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: target, behavior });
    prevScrollTopRef.current = target;
    isAtBottomRef.current = true;
    setShowScrollButton(false);

    // Scroll virtual list to end
    if (virtualItems.length > 0) {
      virtualizer.scrollToIndex(virtualItems.length - 1, { align: "end" });
    }

    if (behavior === "smooth") {
      setTimeout(() => {
        isAutoScrollingRef.current = false;
        if (containerRef.current) {
          prevScrollTopRef.current = containerRef.current.scrollTop;
        }
      }, SMOOTH_SCROLL_SETTLE_MS);
    } else {
      isAutoScrollingRef.current = false;
    }
  }, [virtualItems.length, virtualizer]);

  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const scrolledUp =
      currentScrollTop < prevScrollTopRef.current - SCROLL_UP_THRESHOLD_PX;
    prevScrollTopRef.current = currentScrollTop;

    const distanceFromBottom =
      container.scrollHeight - currentScrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;

    if (scrolledUp) {
      isAtBottomRef.current = atBottom;
    } else if (atBottom) {
      isAtBottomRef.current = true;
    }

    setShowScrollButton(!atBottom);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Instant scroll during streaming to keep up with rapid updates
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom("instant");
    }
  }, [streamingContent, streamingToolCalls.length, scrollToBottom]);

  // Smooth scroll for new messages. Always force-scroll when the latest
  // message is from the user (they just sent it), even if they were reading
  // scrollback.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastIsUser = lastMessage?.role === "user";
    if (lastIsUser || isAtBottomRef.current) {
      scrollToBottom("smooth");
      return;
    }

    // No auto-scroll: recompute from actual layout so that chat switches to
    // content that doesn't overflow correctly hide the button even when no
    // scroll event fires.
    const container = containerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, [messages, scrollToBottom]);

  return (
    <div className={classes.messageListWrapper}>
      {/* Single status region for chat announcements. Kept outside the
          scrolling transcript so changes here trigger one polite read per
          state change instead of re-announcing every streamed token. */}
      <VisuallyHidden role="status" aria-live="polite">
        {statusAnnouncement}
      </VisuallyHidden>

      <div
        ref={containerRef}
        className={classes.messageList}
        aria-label={t("Chat transcript")}
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = virtualItems[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === "message" ? (
                  <ErrorBoundary
                    fallback={<ChatMessageErrorFallback />}
                  >
                    <ChatMessage
                      message={item.data}
                      isLastAssistant={
                        !isStreaming &&
                        item.data.role === 'assistant' &&
                        item.data.id === messages[messages.length - 1]?.id
                      }
                      onRegenerate={onRegenerate}
                    />
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary
                    resetKeys={[streamingContent, streamingToolCalls.length]}
                    fallback={<ChatMessageErrorFallback />}
                  >
                    <ChatMessage
                      message={{
                        id: "streaming",
                        chatId: "",
                        role: "assistant",
                        content: null,
                        toolCalls: null,
                        metadata: null,
                        createdAt: new Date().toISOString(),
                      }}
                      isStreaming
                      streamingContent={streamingContent}
                      streamingToolCalls={streamingToolCalls}
                    />
                  </ErrorBoundary>
                )}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>
      {showScrollButton && (
        <button
          type="button"
          aria-label={t("Scroll to bottom")}
          className={classes.scrollToBottomButton}
          onClick={() => scrollToBottom("smooth")}
        >
          <IconArrowDown size={16} stroke={2} />
        </button>
      )}
    </div>
  );
}
