import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
  selectedConversationId: string | null;
}

const initialState: UiState = {
  sidebarOpen: true,
  selectedConversationId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    selectConversation(state, action: PayloadAction<string | null>) {
      state.selectedConversationId = action.payload;
    },
  },
});

export const { setSidebarOpen, toggleSidebar, selectConversation } = uiSlice.actions;
export default uiSlice.reducer;