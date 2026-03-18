import { createSlice } from '@reduxjs/toolkit';

const postSlice = createSlice({
  name: 'posts',
  initialState: {
    feed: [],
    explore: [],
    loading: false,
    hasMore: true,
    page: 1,
  },
  reducers: {
    setFeed: (state, action) => {
      state.feed = action.payload;
    },
    addPost: (state, action) => {
      state.feed.unshift(action.payload);
    },
    updatePost: (state, action) => {
      const idx = state.feed.findIndex(p => p._id === action.payload._id);
      if (idx !== -1) {
        state.feed[idx] = action.payload;
      }
    },
    removePost: (state, action) => {
      state.feed = state.feed.filter(p => p._id !== action.payload);
    },
    toggleLikeOptimistic: (state, action) => {
      const { postId, userId } = action.payload;
      const post = state.feed.find(p => p._id === postId);
      if (post) {
        const liked = post.likes.includes(userId);
        post.likes = liked
          ? post.likes.filter(id => id !== userId)
          : [...post.likes, userId];
      }
    }
  }
});

export const { setFeed, addPost, updatePost, removePost, toggleLikeOptimistic } = postSlice.actions;
export default postSlice.reducer;
