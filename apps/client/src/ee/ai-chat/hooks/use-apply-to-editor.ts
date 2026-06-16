import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { marked } from "marked";
import {
  pageEditorAtom,
  editorSelectionAtom,
} from "@/features/editor/atoms/editor-atoms";

export type ApplyOperation = "replace_selection" | "append" | "prepend";

export function useApplyToEditor() {
  const editor = useAtomValue(pageEditorAtom);
  const editorSelection = useAtomValue(editorSelectionAtom);

  const canApply = Boolean(editor);

  const applyToEditor = useCallback(
    (content: string, operation?: ApplyOperation) => {
      if (!editor) return false;

      const html = (marked.parse(content) as string).trim();

      // Determine the default operation based on current selection
      const defaultOp: ApplyOperation =
        editorSelection && editorSelection.from !== editorSelection.to
          ? "replace_selection"
          : "append";
      const op = operation || defaultOp;

      editor.commands.focus();

      switch (op) {
        case "replace_selection": {
          if (editorSelection && editorSelection.from !== editorSelection.to) {
            // Delete the selected range and insert new content
            editor
              .chain()
              .focus()
              .deleteRange({
                from: editorSelection.from,
                to: editorSelection.to,
              })
              .insertContent(html)
              .run();
          } else {
            // No selection, just insert at cursor
            editor.chain().focus().insertContent(html).run();
          }
          break;
        }
        case "append": {
          const docSize = editor.state.doc.content.size;
          editor.chain().focus().insertContentAt(docSize, html).run();
          break;
        }
        case "prepend": {
          editor.chain().focus().insertContentAt(0, html).run();
          break;
        }
      }

      return true;
    },
    [editor, editorSelection],
  );

  const hasSelection =
    Boolean(editorSelection) &&
    editorSelection.from !== editorSelection.to;

  return {
    canApply,
    hasSelection,
    applyToEditor,
  };
}
