import { create } from 'zustand';

interface EditorState {
  content: any;
  isDirty: boolean;
  isSaving: boolean;

  setContent: (content: any) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  content: null,
  isDirty: false,
  isSaving: false,

  setContent: (content) => set({ content, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  reset: () => set({ content: null, isDirty: false, isSaving: false }),
}));
