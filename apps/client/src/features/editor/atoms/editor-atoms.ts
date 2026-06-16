import { atom } from "jotai";
import { Editor } from "@tiptap/core";
import { PageEditMode } from "@/features/user/types/user.types.ts";

export const pageEditorAtom = atom<Editor | null>(null);

export const titleEditorAtom = atom<Editor | null>(null);

export const readOnlyEditorAtom = atom<Editor | null>(null);

export const yjsConnectionStatusAtom = atom<string>("");

export const showAiMenuAtom = atom(false);

export const showLinkMenuAtom = atom(false);

// Current page's edit mode — initialized from the user's saved preference on
// first load, can be toggled locally without persisting to the server.
export const currentPageEditModeAtom = atom<PageEditMode>(PageEditMode.Edit);

// Editor selection bridge — synced from page editor's selectionUpdate event
export interface EditorSelection {
  from: number;
  to: number;
  text: string;
}

// Simple writable atom for editor selection
export const editorSelectionAtom = atom<EditorSelection | null, [EditorSelection | null], void>(
  null,
  (_get, set, update) => set(editorSelectionAtom, update),
);

// Pending editor operation from chat (for apply / future diff preview)
export interface EditorOperation {
  id: string;
  type: "replace_selection" | "append" | "prepend" | "replace_all";
  content: string; // markdown content
  source: "chat" | "inline";
  selectionFrom?: number;
  selectionTo?: number;
}

// Simple writable atom for pending editor operation
export const pendingEditorOperationAtom = atom<EditorOperation | null, [EditorOperation | null], void>(
  null,
  (_get, set, update) => set(pendingEditorOperationAtom, update),
);
