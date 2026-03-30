import { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';
import {
  setOutgoingCall,
  setIncomingCall,
  acceptIncomingCall,
  setCallConnected,
  setCallEnded,
  toggleMute as toggleMuteAction,
  toggleCamera as toggleCameraAction,
} from '../store/slices/callSlice';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Ringtone generator using Web Audio API
const createRingtone = () => {
  let ctx = null;
  let intervalId = null;

  const playNote = () => {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  return {
    start: () => {
      playNote();
      intervalId = setInterval(playNote, 2000);
    },
    stop: () => {
      clearInterval(intervalId);
      intervalId = null;
      if (ctx) {
        ctx.close().catch(() => {});
        ctx = null;
      }
    },
  };
};

export const CallProvider = ({ children }) => {
  const dispatch = useDispatch();
  const socket = useSocket();
  const { user } = useSelector((state) => state.auth);
  const callState = useSelector((state) => state.call);

  // Use a ref to track callStatus inside event handlers to avoid stale closures
  const callStatusRef = useRef(callState.callStatus);
  useEffect(() => {
    callStatusRef.current = callState.callStatus;
  }, [callState.callStatus]);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const pendingOfferRef = useRef(null); // Stores { offer, fromUserId, callType } for incoming calls
  const ringtoneRef = useRef(createRingtone());
  const callTimeoutRef = useRef(null);
  const otherUserIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  // State counter that triggers re-renders when streams change
  const [streamVersion, setStreamVersion] = useState(0);
  const bumpStream = useCallback(() => setStreamVersion((v) => v + 1), []);

  // Cleanup helper
  const cleanup = useCallback(() => {
    ringtoneRef.current.stop();
    clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current && typeof peerConnectionRef.current.close === 'function') {
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    remoteStreamRef.current = new MediaStream();
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    otherUserIdRef.current = null;
    bumpStream();
    dispatch(setCallEnded());
  }, [dispatch, bumpStream]);

  // Create peer connection with ICE handling
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && otherUserIdRef.current) {
        socket.emit('iceCandidate', {
          to: otherUserIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      // Trigger re-render so CallScreen attaches remote stream to video element
      bumpStream();
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        ringtoneRef.current.stop();
        clearTimeout(callTimeoutRef.current);
        dispatch(setCallConnected());
      }
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        cleanup();
        toast.error('Call connection lost');
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, dispatch, cleanup, bumpStream]);

  // ──── Outgoing Call ────
  const startCall = useCallback(
    async (receiverUser, callType) => {
      if (callStatusRef.current !== 'idle') {
        toast.error('Already in a call');
        return;
      }
      if (!socket) {
        toast.error('Not connected to server');
        return;
      }

      try {
        const constraints = {
          audio: true,
          video: callType === 'video',
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        otherUserIdRef.current = receiverUser._id;
        dispatch(
          setOutgoingCall({
            receiver: {
              _id: receiverUser._id,
              name: receiverUser.name,
              profilePic: receiverUser.profilePic,
            },
            callType,
          })
        );

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('callUser', {
          to: receiverUser._id,
          offer: pc.localDescription,
          callerInfo: {
            _id: user._id,
            name: user.name,
            profilePic: user.profilePic,
          },
          callType,
        });

        bumpStream();
        ringtoneRef.current.start();

        // Auto-timeout after 30s
        callTimeoutRef.current = setTimeout(() => {
          if (peerConnectionRef.current) {
            socket.emit('endCall', { to: receiverUser._id });
            cleanup();
            toast('No answer', { icon: '📞' });
          }
        }, 30000);
      } catch (err) {
        console.error('Failed to start call:', err);
        if (err.name === 'NotAllowedError') {
          toast.error('Camera/microphone permission denied');
        } else if (err.name === 'NotFoundError') {
          toast.error('Camera/microphone not found');
        } else {
          toast.error('Failed to start call');
        }
        cleanup();
      }
    },
    [socket, user, dispatch, createPeerConnection, cleanup, bumpStream]
  );

  // ──── Accept incoming call ────
  const acceptCall = useCallback(
    async (offer, fromUserId, callType) => {
      try {
        // Transition UI: hide incoming overlay, show call screen
        dispatch(acceptIncomingCall());
        clearTimeout(callTimeoutRef.current);

        const constraints = {
          audio: true,
          video: callType === 'video',
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        otherUserIdRef.current = fromUserId;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Apply any buffered ICE candidates
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('acceptCall', {
          to: fromUserId,
          answer: pc.localDescription,
        });

        ringtoneRef.current.stop();
        bumpStream();
      } catch (err) {
        console.error('Failed to accept call:', err);
        if (err.name === 'NotAllowedError') {
          toast.error('Camera/microphone permission denied');
        } else {
          toast.error('Failed to accept call');
        }
        if (socket) {
          socket.emit('rejectCall', { to: fromUserId });
        }
        cleanup();
      }
    },
    [socket, createPeerConnection, dispatch, cleanup, bumpStream]
  );

  // ──── Reject incoming call ────
  const rejectCall = useCallback(
    (fromUserId) => {
      clearTimeout(callTimeoutRef.current);
      if (socket) {
        socket.emit('rejectCall', { to: fromUserId });
      }
      ringtoneRef.current.stop();
      pendingOfferRef.current = null;
      dispatch(setCallEnded());
    },
    [socket, dispatch]
  );

  // ──── End active call ────
  const endCall = useCallback(() => {
    if (socket && otherUserIdRef.current) {
      socket.emit('endCall', { to: otherUserIdRef.current });
    }
    cleanup();
  }, [socket, cleanup]);

  // ──── Toggle mute ────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        dispatch(toggleMuteAction());
      }
    }
  }, [dispatch]);

  // ──── Toggle camera ────
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        dispatch(toggleCameraAction());
      }
    }
  }, [dispatch]);

  // ──── Socket Listeners ────
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    const handleIncomingCall = ({ from, offer, callerInfo, callType }) => {
      if (callStatusRef.current !== 'idle') {
        // Already in a call, auto-reject
        socket.emit('rejectCall', { to: from });
        return;
      }

      // Store offer data so CallOverlay can pass it to acceptCall
      pendingOfferRef.current = { offer, fromUserId: from, callType };

      dispatch(
        setIncomingCall({
          caller: {
            _id: callerInfo._id,
            name: callerInfo.name,
            profilePic: callerInfo.profilePic,
          },
          callType,
        })
      );
      ringtoneRef.current.start();

      // Auto-reject after 30s
      callTimeoutRef.current = setTimeout(() => {
        ringtoneRef.current.stop();
        pendingOfferRef.current = null;
        dispatch(setCallEnded());
      }, 30000);
    };

    // Call accepted by receiver
    const handleCallAccepted = async ({ answer }) => {
      try {
        if (peerConnectionRef.current && typeof peerConnectionRef.current.setRemoteDescription === 'function') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          // Apply any buffered ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current = [];
        }
      } catch (err) {
        console.error('Error setting remote description:', err);
        cleanup();
        toast.error('Call connection failed');
      }
    };

    // Call rejected by receiver
    const handleCallRejected = () => {
      cleanup();
      toast('Call was declined', { icon: '📞' });
    };

    // Other party ended call
    const handleCallEnded = () => {
      cleanup();
      toast('Call ended', { icon: '📞' });
    };

    // ICE candidate from other party
    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (
          peerConnectionRef.current &&
          typeof peerConnectionRef.current.addIceCandidate === 'function' &&
          peerConnectionRef.current.remoteDescription
        ) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Buffer if remote description not yet set
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('ICE candidate error:', err);
      }
    };

    // Call failed (user offline)
    const handleCallFailed = ({ reason }) => {
      cleanup();
      toast.error(reason || 'Call failed');
    };

    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('callRejected', handleCallRejected);
    socket.on('callEnded', handleCallEnded);
    socket.on('iceCandidate', handleIceCandidate);
    socket.on('callFailed', handleCallFailed);

    return () => {
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('callRejected', handleCallRejected);
      socket.off('callEnded', handleCallEnded);
      socket.off('iceCandidate', handleIceCandidate);
      socket.off('callFailed', handleCallFailed);
    };
  }, [socket, dispatch, cleanup]);

  const value = {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    localStreamRef,
    remoteStreamRef,
    pendingOfferRef,
    streamVersion,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => useContext(CallContext);
