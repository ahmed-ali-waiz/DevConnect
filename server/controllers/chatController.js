import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { uploadToCloudinary } from "../middleware/upload.js";

// @desc    Get user's conversations
// @route   GET /api/v1/chat/conversations
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "name username profilePic")
      .populate("lastMessage.sender", "name username");

    // Add unread count for each conversation
    const convosWithUnread = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await Message.countDocuments({
          conversation: convo._id,
          sender: { $ne: req.user._id },
          readBy: { $nin: [req.user._id] },
        });
        return { ...convo.toObject(), unreadCount };
      })
    );

    res.json(convosWithUnread);
  } catch (error) {
    next(error);
  }
};

// @desc    Create or get existing conversation
// @route   POST /api/v1/chat/conversations
export const createConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate("participants", "name username profilePic");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
      });
      await conversation.populate("participants", "name username profilePic");
    }

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/v1/chat/:conversationId/messages?page=1&limit=30
export const getMessages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Verify user is a participant
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await Message.find({ conversation: req.params.conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name username profilePic");

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: req.params.conversationId,
        sender: { $ne: req.user._id },
        readBy: { $nin: [req.user._id] },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    const total = await Message.countDocuments({ conversation: req.params.conversationId });

    res.json({
      messages: messages.reverse(), // oldest first for chat display
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/v1/chat/:conversationId/messages
export const sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    let imageUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, "devconnect/messages");
      imageUrl = result.secure_url;
    }

    if (!text && !imageUrl) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text: text || "",
      image: imageUrl,
      readBy: [req.user._id],
    });

    conversation.lastMessage = {
      text: text || "📷 Image",
      sender: req.user._id,
      createdAt: new Date(),
    };
    await conversation.save();

    await message.populate("sender", "name username profilePic");

    // Emit via Socket.IO to recipient
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const recipientId = conversation.participants.find((p) => !p.equals(req.user._id));

    if (io && onlineUsers?.get(recipientId?.toString())) {
      io.to(onlineUsers.get(recipientId.toString())).emit("newMessage", {
        message,
        conversationId: conversation._id,
      });
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message (soft delete)
// @route   DELETE /api/v1/chat/:conversationId/messages/:messageId
export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (!message.sender.equals(req.user._id)) return res.status(403).json({ message: "Not authorized" });
    if (message.conversation.toString() !== req.params.conversationId) return res.status(400).json({ message: "Message does not belong to this conversation" });

    message.isDeleted = true;
    message.text = "";
    message.image = "";
    await message.save();

    res.json({ message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete / leave a conversation
// @route   DELETE /api/v1/chat/conversations/:conversationId
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!conversation.participants.includes(req.user._id)) return res.status(403).json({ message: "Access denied" });

    // Delete all messages and the conversation
    await Message.deleteMany({ conversation: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};
