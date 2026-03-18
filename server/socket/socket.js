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
