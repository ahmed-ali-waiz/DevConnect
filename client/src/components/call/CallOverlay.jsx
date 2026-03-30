import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

const CallOverlay = () => {
  const { callStatus, callType, caller, isIncoming } = useSelector((state) => state.call);
  const { acceptCall, rejectCall, pendingOfferRef } = useCall();

  const isRinging = callStatus === 'ringing' && isIncoming;

  const handleAccept = () => {
    const pending = pendingOfferRef.current;
    if (pending) {
      acceptCall(pending.offer, pending.fromUserId, pending.callType);
      pendingOfferRef.current = null;
    }
  };

  const handleReject = () => {
    const pending = pendingOfferRef.current;
    if (pending) {
      rejectCall(pending.fromUserId);
      pendingOfferRef.current = null;
    }
  };

  return (
    <AnimatePresence>
      {isRinging && caller && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(3,7,18,0.97) 0%, rgba(15,23,42,0.97) 100%)',
            backdropFilter: 'blur(30px)',
          }}
        >
          {/* Ambient glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-(--accent-primary) opacity-[0.06] blur-[120px]" />

          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* Pulsing rings */}
            <div className="relative mb-8">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-(--accent-primary)"
                animate={{
                  scale: [1, 2.2],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={{
                  width: '128px',
                  height: '128px',
                  top: '-16px',
                  left: '-16px',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-(--accent-secondary)"
                animate={{
                  scale: [1, 2.2],
                  opacity: [0.4, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.5,
                }}
                style={{
                  width: '128px',
                  height: '128px',
                  top: '-16px',
                  left: '-16px',
                }}
              />

              {/* Avatar */}
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-(--accent-primary) shadow-[0_0_40px_rgba(56,189,248,0.3)]">
                  <img
                    src={
                      caller.profilePic ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(caller.name)}&background=0D1117&color=6EE7F7`
                    }
                    alt={caller.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>

            {/* Caller info */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-display font-bold text-white mb-2"
            >
              {caller.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-(--text-muted) mb-12 flex items-center gap-2"
            >
              {callType === 'video' ? (
                <Video size={16} className="text-(--accent-primary)" />
              ) : (
                <Phone size={16} className="text-(--accent-primary)" />
              )}
              <span>
                Incoming {callType === 'video' ? 'video' : 'voice'} call...
              </span>
            </motion.p>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-16"
            >
              {/* Reject */}
              <div className="flex flex-col items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReject}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-shadow"
                >
                  <PhoneOff size={24} />
                </motion.button>
                <span className="text-xs text-(--text-muted) font-medium">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAccept}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:shadow-[0_0_50px_rgba(52,211,153,0.5)] transition-shadow"
                >
                  {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
                </motion.button>
                <span className="text-xs text-(--text-muted) font-medium">Accept</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallOverlay;
