import { onMounted, onUnmounted } from "vue";
import { useHistoryStore } from "@/store/history";

export function useUndoRedoShortcuts() {
  const historyStore = useHistoryStore();

  const handleKeydown = (event: KeyboardEvent): void => {
    // Only handle shortcuts if we're not in an input/textarea/contenteditable
    const activeElement = document.activeElement;
    const isInInput =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement).contentEditable === "true");

    if (isInInput) return;

    // Check for Ctrl key (Windows/Linux) or Cmd key (Mac)
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (isCtrlOrCmd) {
      // Ctrl+Shift+Z = Redo (primary)
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        void historyStore.redo();
        return;
      }

      // Ctrl+Z = Undo (only if shift is NOT pressed)
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        void historyStore.undo();
        return;
      }

      // Alternative redo shortcut: Ctrl+Y
      if (key === "y") {
        event.preventDefault();
        event.stopPropagation();
        void historyStore.redo();
        return;
      }
    }
  };

  onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  return {
    undo: (): Promise<boolean> => historyStore.undo(),
    redo: (): Promise<boolean> => historyStore.redo(),
    canUndo: (): boolean => historyStore.canUndo,
    canRedo: (): boolean => historyStore.canRedo,
  };
}
