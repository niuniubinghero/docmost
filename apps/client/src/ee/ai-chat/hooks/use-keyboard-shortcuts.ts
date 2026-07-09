import { useEffect, useRef } from "react";

type ShortcutHandlers = {
  onCtrlK?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "k") {
          e.preventDefault();
          handlersRef.current.onCtrlK?.();
        }
      }
      if (e.key === "Escape") {
        handlersRef.current.onEscape?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
