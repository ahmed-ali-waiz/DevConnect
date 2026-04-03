import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || null,
    isLoading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem('token', action.payload);
      } else {
        localStorage.removeItem('token');
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    updateProfileOptimistic: (state, action) => {
      if (state.user) {
        Object.assign(state.user, action.payload);
      }
    },
    addFollowing: (state, action) => {
      if (state.user) {
        const userId = action.payload;
        if (!state.user.following) {
          state.user.following = [];
        }
        if (!state.user.following.some(f => (f._id || f) === userId)) {
          state.user.following.push(userId);
        }
      }
    },
    removeFollowing: (state, action) => {
      if (state.user && state.user.following) {
        const userId = action.payload;
        state.user.following = state.user.following.filter(f => (f._id || f) !== userId);
      }
    }
  }
});

export const { setUser, setToken, logout, updateProfileOptimistic, addFollowing, removeFollowing } = authSlice.actions;
export default authSlice.reducer;
