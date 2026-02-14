import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Sidebar state
  sidebarOpen: true,
  mobileSidebarOpen: false,

  // Modal state
  activeModal: null,
  modalData: null,

  // Upload progress
  uploadProgress: {},

  // Actions
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  toggleMobileSidebar: () =>
    set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

  setMobileSidebarOpen: (open) =>
    set({ mobileSidebarOpen: open }),

  openModal: (modalId, data = null) =>
    set({ activeModal: modalId, modalData: data }),

  closeModal: () =>
    set({ activeModal: null, modalData: null }),

  setUploadProgress: (fileId, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [fileId]: progress },
    })),

  removeUploadProgress: (fileId) =>
    set((state) => {
      const newProgress = { ...state.uploadProgress };
      delete newProgress[fileId];
      return { uploadProgress: newProgress };
    }),

  clearUploadProgress: () =>
    set({ uploadProgress: {} }),
}));
