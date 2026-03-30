import { createSlice } from '@reduxjs/toolkit';

const callSlice = createSlice({
  name: 'call',
  initialState: {
    callStatus: 'idle', // idle | calling | ringing | connected | ended
    callType: null, // 'audio' | 'video'
    caller: null, // { _id, name, profilePic }
    receiver: null, // { _id, name, profilePic }
    isIncoming: false,
    isMuted: false,
    isCameraOff: false,
    callDuration: 0,
  },
  reducers: {
    setOutgoingCall: (state, action) => {
      const { receiver, callType } = action.payload;
      state.callStatus = 'calling';
      state.callType = callType;
      state.receiver = receiver;
      state.caller = null;
      state.isIncoming = false;
      state.isMuted = false;
      state.isCameraOff = false;
      state.callDuration = 0;
    },
    setIncomingCall: (state, action) => {
      const { caller, callType } = action.payload;
      state.callStatus = 'ringing';
      state.callType = callType;
      state.caller = caller;
      state.receiver = null;
      state.isIncoming = true;
    },
    // Receiver accepted → transition from ringing overlay to call screen
    acceptIncomingCall: (state) => {
      state.callStatus = 'calling';
    },
    setCallConnected: (state) => {
      state.callStatus = 'connected';
    },
    setCallEnded: (state) => {
      state.callStatus = 'idle';
      state.callType = null;
      state.caller = null;
      state.receiver = null;
      state.isIncoming = false;
      state.isMuted = false;
      state.isCameraOff = false;
      state.callDuration = 0;
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    toggleCamera: (state) => {
      state.isCameraOff = !state.isCameraOff;
    },
    incrementDuration: (state) => {
      state.callDuration += 1;
    },
  },
});

export const {
  setOutgoingCall,
  setIncomingCall,
  acceptIncomingCall,
  setCallConnected,
  setCallEnded,
  toggleMute,
  toggleCamera,
  incrementDuration,
} = callSlice.actions;
export default callSlice.reducer;
