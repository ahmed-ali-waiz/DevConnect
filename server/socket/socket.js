const onlineUsers = new Map(); // userId -> socketId

const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User joins — map userId to socketId
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log(`👤 User ${userId} online. Total: ${onlineUsers.size}`);
    });

    // Real-time messaging
    socket.on("sendMessage", ({ message, recipientId }) => {
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newMessage", message);
      }
    });

    // Typing indicators
    socket.on("typing", ({ conversationId, recipientId }) => {
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userTyping", { conversationId });
      }
    });

    socket.on("stopTyping", ({ conversationId, recipientId }) => {
      const recipientSocketId = onlineUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("userStopTyping", { conversationId });
      }
    });

    // ───── WebRTC Signaling ─────

    // Caller sends offer to receiver
    socket.on("callUser", ({ to, offer, callerInfo, callType }) => {
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incomingCall", {
          from: callerInfo._id,
          offer,
          callerInfo,
          callType,
        });
        console.log(`📞 ${callerInfo.name} calling ${to} (${callType})`);
      } else {
        // User is offline
        socket.emit("callFailed", { reason: "User is offline" });
      }
    });

    // Receiver accepts the call with answer SDP
    socket.on("acceptCall", ({ to, answer }) => {
      const callerSocketId = onlineUsers.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit("callAccepted", { answer });
      }
    });

    // Receiver rejects the call
    socket.on("rejectCall", ({ to }) => {
      const callerSocketId = onlineUsers.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected");
      }
    });

    // Either party ends the call
    socket.on("endCall", ({ to }) => {
      const otherSocketId = onlineUsers.get(to);
      if (otherSocketId) {
        io.to(otherSocketId).emit("callEnded");
      }
    });

    // Relay ICE candidates between peers
    socket.on("iceCandidate", ({ to, candidate }) => {
      const otherSocketId = onlineUsers.get(to);
      if (otherSocketId) {
        io.to(otherSocketId).emit("iceCandidate", { candidate });
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      // Find and remove user from online map
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log(`🔌 Socket disconnected: ${socket.id}. Online: ${onlineUsers.size}`);
    });
  });

  return onlineUsers;
};

export default initializeSocket;
