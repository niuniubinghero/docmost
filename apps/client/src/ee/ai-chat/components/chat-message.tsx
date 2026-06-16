import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconFile,
  IconPhoto,
  IconFileText,
  IconSparkles,
  IconRefresh,
  IconEdit,
  IconDots,
} from "@tabler/icons-react";
import { markdownToHtml } from "@docmost/editor-ext";
import { CopyButton } from "@/components/common/copy-button";
import type { AiChatMessage, AiChatToolCall } from "../types/ai-chat.types";
import ChatToolGroup from "./chat-tool-group";
import classes from "../styles/chat-message.module.css";
import CopyTextButton from "@/components/common/copy.tsx";

const PAGE_PATH_RE = /\/s\/[^/?#]+\/p\/[^/?#]+/;

const chatSanitizer = DOMPurify();
chatSanitizer.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName !== "A") return;
  const href = node.getAttribute("href") || "";

  // Recover the canonical /s/{slug}/p/{slugId} path if the model wrapped it
  // in a fabricated host (https://s/..., https://yoursite.com/s/..., //s/...).
  const m = href.match(PAGE_PATH_RE);
  if (m) {
    node.setAttribute("href", m[0]);
    node.removeAttribute("target");
    node.removeAttribute("rel");
    return;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

type Props = {
  message: AiChatMessage;
  isStreaming?: boolean;
  streamingContent?: string;
  streamingToolCalls?: AiChatToolCall[];
};

export default function ChatMessage({
  message,
  isStreaming,
  streamingContent,
  streamingToolCalls,
}: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);

  // Process code blocks for syntax highlighting and copy buttons
  useEffect(() => {
    if (!contentRef.current) return;

    const processCodeBlocks = async () => {
      const { default: hljs } = await import("highlight.js");
      const codeBlocks = contentRef.current?.querySelectorAll("pre > code");
      if (!codeBlocks) return;

      codeBlocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre || pre.getAttribute("data-processed")) return;
        pre.setAttribute("data-processed", "true");

        // Get language from class
        const classStr = codeEl.className;
        const langMatch = classStr.match(/language-(\w+)/);
        const language = langMatch?.[1] || "";

        // Apply syntax highlighting
        if (language) {
          try {
            const result = hljs.highlight(codeEl.textContent || "", { language, ignoreIllegals: true });
            codeEl.innerHTML = result.value;
          } catch {
            // Ignore errors
          }
        } else {
          try {
            const result = hljs.highlightAuto(codeEl.textContent || "");
            codeEl.innerHTML = result.value;
          } catch {
            // Ignore errors
          }
        }

        // Add wrapper and copy button
        const wrapper = document.createElement("div");
        wrapper.className = "code-block-wrapper";
        wrapper.style.cssText = "position:relative;margin:12px 0;border-radius:8px;overflow:hidden;background:light-dark(var(--mantine-color-gray-0),var(--mantine-color-dark-6));border:1px solid light-dark(var(--mantine-color-gray-2),var(--mantine-color-dark-4))";

        const header = document.createElement("div");
        header.style.cssText = "display:flex;align-items:center;justify-content:flex-end;padding:4px 8px;background:light-dark(var(--mantine-color-gray-1),var(--mantine-color-dark-5));border-bottom:1px solid light-dark(var(--mantine-color-gray-2),var(--mantine-color-dark-4))";

        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        copyBtn.style.cssText = "display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:4px;background:transparent;cursor:pointer;color:var(--mantine-color-dimmed);transition:background 150ms,color 150ms";
        copyBtn.onmouseenter = () => {
          copyBtn.style.background = "light-dark(var(--mantine-color-gray-2),var(--mantine-color-dark-4))";
          copyBtn.style.color = "light-dark(var(--mantine-color-gray-7),var(--mantine-color-dark-2))";
        };
        copyBtn.onmouseleave = () => {
          copyBtn.style.background = "transparent";
          copyBtn.style.color = "var(--mantine-color-dimmed)";
        };
        copyBtn.onclick = async () => {
          await navigator.clipboard.writeText(codeEl.textContent || "");
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
          }, 2000);
        };

        header.appendChild(copyBtn);
        wrapper.appendChild(header);

        pre.style.cssText = "margin:0;padding:12px 16px;overflow-x:auto;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;line-height:1.5;background:transparent";

        wrapper.appendChild(pre.cloneNode(true));
        pre.replaceWith(wrapper);
      });
    };

    processCodeBlocks();
  }, [message.content, streamingContent]);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (href && (href.startsWith("/s/") || href.startsWith("/p/"))) {
        e.preventDefault();
        navigate(href);
      }
    },
    [navigate],
  );

  if (message.role === "tool") return null;

  const isUser = message.role === "user";
  const content = isStreaming ? streamingContent : message.content;
  const toolCalls = isStreaming ? streamingToolCalls : message.toolCalls;

  if (isUser) {
    const displayContent = (content || "").replace(
      /\n\n<referenced_pages>[\s\S]*<\/referenced_pages>$/,
      "",
    );
    const attachments =
      (message.metadata?.attachments as {
        id: string;
        fileName: string;
        fileExt: string;
      }[]) || [];
    const contextPages =
      (message.metadata?.contextPages as {
        id: string;
        title: string;
      }[]) || [];

    return (
      <div
        className={classes.userMessage}
        role="article"
        aria-label={t("You said:")}
      >
        <div className={classes.userBubble}>
          {contextPages.length > 0 && (
            <div className={classes.messageAttachments}>
              {contextPages.map((page) => (
                <span key={page.id} className={classes.messageAttachmentChip}>
                  <IconFileText size={13} />
                  {page.title || "Untitled"}
                </span>
              ))}
            </div>
          )}
          {attachments.length > 0 && (
            <div className={classes.messageAttachments}>
              {attachments.map((a) => (
                <span key={a.id} className={classes.messageAttachmentChip}>
                  {IMAGE_EXTENSIONS.includes(a.fileExt) ? (
                    <IconPhoto size={13} />
                  ) : (
                    <IconFile size={13} />
                  )}
                  {a.fileName}
                </span>
              ))}
            </div>
          )}
          {displayContent}
        </div>
      </div>
    );
  }

  // Only label the article when there's something meaningful to announce.
  // Tool-only assistant turns (no text) shouldn't announce "Assistant said:" with empty content.
  const hasAnnouncableContent = Boolean(content);

  return (
    <div
      className={classes.assistantMessage}
      role="article"
      aria-label={hasAnnouncableContent ? t("Assistant said:") : undefined}
    >
      <div className={classes.assistantIcon}>
        <IconSparkles size={16} />
      </div>
      <div className={classes.messageContent}>
        {toolCalls && toolCalls.length > 0 && (
          <ChatToolGroup toolCalls={toolCalls} isStreaming={isStreaming} />
        )}
        {content && (
          <div
            ref={contentRef}
            onClick={handleContentClick}
            dangerouslySetInnerHTML={{
              __html: chatSanitizer.sanitize(
                markdownToHtml(content) as string,
                { ADD_ATTR: ["target", "rel"] },
              ),
            }}
          />
        )}
        {isStreaming && (
          <>
            {!content && (
              <span className={classes.processingIndicator}>
                <span className={classes.thinkingDots}>
                  <span className={classes.thinkingDot} />
                  <span className={classes.thinkingDot} />
                  <span className={classes.thinkingDot} />
                </span>
                Thinking...
              </span>
            )}
            {content && <span className={classes.streamingCursor} />}
          </>
        )}
        {!isStreaming && message.content && (
          <div className={classes.messageActions}>
            <Tooltip label={t("Copy")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(message.content || "");
                }}
              >
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("Regenerate")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => {
                  // TODO: Implement regenerate functionality
                }}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("Insert to editor")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => {
                  // TODO: Implement insert to editor functionality
                }}
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
