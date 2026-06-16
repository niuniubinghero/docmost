import { useEffect, useCallback } from "react";

type ShortcutHandlers = {
  onCtrlK?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "k") {
          e.preventDefault();
          handlers.onCtrlK?.();
        }
      }
      if (e.key === "Escape") {
        handlers.onEscape?.();
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
