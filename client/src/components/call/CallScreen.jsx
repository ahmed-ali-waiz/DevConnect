import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { incrementDuration } from '../../store/slices/callSlice';

const CallScreen = () => {
  const dispatch = useDispatch();
  const { callStatus, callType, caller, receiver, isIncoming, isMuted, isCameraOff, callDuration } =
    useSelector((state) => state.call);
  const { endCall, toggleMute, toggleCamera, localStreamRef, remoteStreamRef, streamVersion } = useCall();

  const localVideoElRef = useRef(null);
  const remoteVideoElRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const [showControls, setShowControls] = useState(true);

  const isActive = callStatus === 'calling' || callStatus === 'connected';
  const otherUser = isIncoming ? caller : receiver;

  // Attach streams to video elements whenever streamVersion changes (triggered by CallContext)
  useEffect(() => {
    if (!isActive) return;

    if (localVideoElRef.current && localStreamRef.current) {
      localVideoElRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoElRef.current && remoteStreamRef.current) {
      remoteVideoElRef.current.srcObject = remoteStreamRef.current;
    }
  }, [isActive, streamVersion]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        dispatch(incrementDuration());
      }, 1000);
    }
    return () => {
      clearInterval(durationIntervalRef.current);
    };
  }, [callStatus, dispatch]);

  // Auto-hide controls after 5 seconds
  useEffect(() => {
    if (!isActive) return;
    let timeout;
    const reset = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 5000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('touchstart', reset);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('touchstart', reset);
    };
  }, [isActive]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const StatusDot = () => {
    if (callStatus === 'calling') {
      return (
        <motion.span
          className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      );
    }
    if (callStatus === 'connected') {
      return <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2" />;
    }
    return null;
  };

  return (
    <AnimatePresence>
      {isActive && otherUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex flex-col"
          style={{
            background: callType === 'video'
              ? '#000'
              : 'linear-gradient(160deg, #030712 0%, #0c1220 40%, #111b30 70%, #0a1628 100%)',
          }}
        >
          {/* Video call layout */}
          {callType === 'video' ? (
            <>
              {/* Remote video (full screen) */}
              <video
                ref={remoteVideoElRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Placeholder when no remote video yet */}
              {callStatus === 'calling' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#030712] to-[#0F172A]">
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-(--accent-primary)/50 mb-6 shadow-[0_0_40px_rgba(56,189,248,0.2)]">
                        <img
                          src={
                            otherUser.profilePic ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=0D1117&color=6EE7F7`
                          }
                          alt={otherUser.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>
                    <h3 className="text-xl font-display font-semibold text-white mb-1">{otherUser.name}</h3>
                    <p className="text-(--text-muted) text-sm flex items-center">
                      <StatusDot />
                      Calling...
                    </p>
                  </div>
                </div>
              )}

              {/* Local video (PiP corner) */}
              <div className="absolute top-6 right-6 w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-20 bg-black">
                <video
                  ref={localVideoElRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
                />
                {isCameraOff && (
                  <div className="w-full h-full flex items-center justify-center bg-[#0F172A]">
                    <VideoOff size={24} className="text-(--text-muted)" />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Audio call layout */
            <div className="flex-1 flex flex-col items-center justify-center relative">
              {/* Ambient effects */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-(--accent-primary) opacity-[0.04] blur-[100px]" />
              <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-(--accent-secondary) opacity-[0.04] blur-[100px]" />

              {/* Hidden audio element for remote stream */}
              <audio ref={remoteVideoElRef} autoPlay />

              {/* Sound wave animation for connected state */}
              {callStatus === 'connected' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 opacity-20">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-(--accent-primary) rounded-full"
                      animate={{ height: [8, 32 + Math.random() * 40, 8] }}
                      transition={{
                        duration: 0.8 + Math.random() * 0.4,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Avatar */}
              <motion.div
                animate={callStatus === 'calling' ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mb-8"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden border-3 border-(--accent-primary)/30 shadow-[0_0_50px_rgba(56,189,248,0.15)]">
                  <img
                    src={
                      otherUser.profilePic ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=0D1117&color=6EE7F7`
                    }
                    alt={otherUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              <h2 className="text-2xl font-display font-bold text-white mb-2">{otherUser.name}</h2>
              <div className="flex items-center text-(--text-muted) text-sm">
                <StatusDot />
                {callStatus === 'calling' && 'Calling...'}
                {callStatus === 'connected' && formatDuration(callDuration)}
              </div>
            </div>
          )}

          {/* Top status bar */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4"
                style={{
                  background: callType === 'video'
                    ? 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)'
                    : 'transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img
                      src={
                        otherUser.profilePic ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=0D1117&color=6EE7F7&size=32`
                      }
                      alt={otherUser.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">{otherUser.name}</p>
                    <p className="text-xs text-(--text-muted) flex items-center">
                      <StatusDot />
                      {callStatus === 'calling' && 'Calling...'}
                      {callStatus === 'connected' && formatDuration(callDuration)}
                    </p>
                  </div>
                </div>
                {callType === 'video' && callStatus === 'connected' && (
                  <span className="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    {formatDuration(callDuration)}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute bottom-0 left-0 right-0 z-30 pb-10 pt-20 flex justify-center"
                style={{
                  background: callType === 'video'
                    ? 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)'
                    : 'transparent',
                }}
              >
                <div
                  className="flex items-center gap-4 px-6 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Mute toggle */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isMuted
                        ? 'bg-white/20 text-red-400'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </motion.button>

                  {/* Camera toggle (only for video calls) */}
                  {callType === 'video' && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={toggleCamera}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCameraOff
                          ? 'bg-white/20 text-red-400'
                          : 'bg-white/10 text-white hover:bg-white/15'
                      }`}
                      title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                    >
                      {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </motion.button>
                  )}

                  {/* End call */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] transition-shadow ml-2"
                    title="End call"
                  >
                    <PhoneOff size={22} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallScreen;
