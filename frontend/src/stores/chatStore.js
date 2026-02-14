import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  // Active session
  activeSessionId: null,

  // Streaming state
  isStreaming: false,
  streamingContent: '',
  pendingMessage: '',

  // Actions
  setActiveSession: (sessionId) =>
    set({ activeSessionId: sessionId }),

  setStreaming: (status) =>
    set({ isStreaming: status }),

  setStreamingContent: (content) =>
    set({ streamingContent: content }),

  appendStreamContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),

  clearStreamContent: () =>
    set({ streamingContent: '', isStreaming: false }),

  setPendingMessage: (message) =>
    set({ pendingMessage: message }),

  clearPendingMessage: () =>
    set({ pendingMessage: '' }),

  // Reset all state
  reset: () =>
    set({
      activeSessionId: null,
      isStreaming: false,
      streamingContent: '',
      pendingMessage: '',
    }),
}));
