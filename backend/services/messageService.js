// services/messageService.js - COMPREHENSIVE MESSAGING SERVICE
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Deal = require('../models/Deal');
const Campaign = require('../models/Campaign');
const uploadService = require('./uploadService');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');
const { getIO } = require('../socket/chatSocket');

class MessageService {
  constructor() {
    this.io = null;
    this.initSocket();
  }

  initSocket() {
    try {
      this.io = getIO();
    } catch (error) {
      console.warn('Socket.io not available for real-time messaging');
    }
  }

  // Get conversations for a user
  async getUserConversations(userId, userType, options = {}) {
    const { page = 1, limit = 20, search = '', unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    let query = {
      'participants.user_id': userId
    };

    if (unreadOnly) {
      query['participants.unread_count'] = { $gt: 0 };
    }

    if (search) {
      query.$or = [
        { 'campaign.title': { $regex: search, $options: 'i' } },
        { 'deal.title': { $regex: search, $options: 'i' } }
      ];
    }

    const conversations = await Conversation.find(query)
      .populate('campaign_id', 'title')
      .populate('deal_id', 'title')
      .populate('participants.user_id', 'displayName profilePicture')
      .sort('-last_message_at')
      .skip(skip)
      .limit(limit)
      .lean();

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversation_id: conv._id })
          .sort('-created_at')
          .populate('sender.user_id', 'displayName profilePicture')
          .lean();

        const participant = conv.participants.find(p => 
          p.user_id._id.toString() !== userId.toString()
        );

        return {
          ...conv,
          lastMessage,
          otherParticipant: participant,
          unreadCount: conv.participants.find(p => 
            p.user_id._id.toString() === userId.toString()
          )?.unread_count || 0
        };
      })
    );

    const total = await Conversation.countDocuments(query);

    return {
      conversations: conversationsWithLastMessage,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get messages in a conversation
  async getConversationMessages(conversationId, userId, options = {}) {
    const { page = 1, limit = 50, before = null } = options;
    const skip = (page - 1) * limit;

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user_id': userId
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    let query = { conversation_id: conversationId };

    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender.user_id', 'displayName profilePicture')
      .sort('-created_at')
      .skip(skip)
      .limit(limit)
      .lean();

    // Mark messages as read
    await this.markMessagesAsRead(conversationId, userId);

    return {
      messages: messages.reverse(), // Return in chronological order
      conversation
    };
  }

  // Send a message
  async sendMessage(conversationId, senderId, senderType, content, options = {}) {
    const { attachments = [], messageType = 'text', replyTo = null } = options;

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user_id': senderId
    }).populate('campaign_id deal_id');

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create message
      const message = await Message.create([{
        conversation_id: conversationId,
        sender: {
          user_id: senderId,
          user_type: senderType
        },
        message_type: messageType,
        content,
        attachments,
        reply_to: replyTo,
        created_at: new Date()
      }], { session });

      const newMessage = message[0];

      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        last_message_at: newMessage.created_at,
        last_message: content.substring(0, 100),
        $inc: {
          'participants.$[elem].unread_count': 1
        }
      }, {
        arrayFilters: [{ 'elem.user_id': { $ne: senderId } }],
        session
      });

      // Reset unread count for sender
      await Conversation.findByIdAndUpdate(conversationId, {
        'participants.$[elem].unread_count': 0
      }, {
        arrayFilters: [{ 'elem.user_id': senderId }],
        session
      });

      await session.commitTransaction();
      session.endSession();

      // Populate message data for real-time sending
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender.user_id', 'displayName profilePicture')
        .populate('reply_to')
        .lean();

      // Send real-time message
      if (this.io) {
        // Send to all participants except sender
        conversation.participants.forEach(participant => {
          if (participant.user_id.toString() !== senderId.toString()) {
            this.io.to(`user_${participant.user_id}`).emit('new_message', {
              conversationId,
              message: populatedMessage
            });
          }
        });
      }

      // Send notifications to other participants
      await this.sendMessageNotifications(conversation, populatedMessage, senderId);

      return populatedMessage;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // Send message with file attachments
  async sendMessageWithFiles(conversationId, senderId, senderType, content, files) {
    // Process uploaded files
    const uploadResults = await uploadService.processFiles(files, {
      type: 'message',
      userId: senderId,
      entityId: conversationId,
      entityType: 'conversation'
    });

    if (!uploadResults.success) {
      throw new Error(uploadResults.error || 'File upload failed');
    }

    const attachments = uploadResults.files.map(file => ({
      id: file.id,
      url: file.url,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size
    }));

    return await this.sendMessage(conversationId, senderId, senderType, content, {
      attachments,
      messageType: attachments.length > 0 ? 'file' : 'text'
    });
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    const result = await Conversation.updateOne(
      {
        _id: conversationId,
        'participants.user_id': userId
      },
      {
        'participants.$.unread_count': 0,
        'participants.$.last_read_at': new Date()
      }
    );

    if (result.modifiedCount > 0 && this.io) {
      // Notify other participants that messages were read
      const conversation = await Conversation.findById(conversationId);
      conversation.participants.forEach(participant => {
        if (participant.user_id.toString() !== userId.toString()) {
          this.io.to(`user_${participant.user_id}`).emit('messages_read', {
            conversationId,
            userId
          });
        }
      });
    }

    return result.modifiedCount > 0;
  }

  // Create new conversation
  async createConversation(participants, type, relatedEntity = null) {
    const conversationData = {
      type,
      participants: participants.map(p => ({
        user_id: p.userId,
        user_type: p.userType,
        unread_count: 0,
        joined_at: new Date()
      })),
      participant_count: participants.length,
      created_by: participants[0]
    };

    if (relatedEntity) {
      if (relatedEntity.type === 'campaign') {
        conversationData.campaign_id = relatedEntity.id;
      } else if (relatedEntity.type === 'deal') {
        conversationData.deal_id = relatedEntity.id;
      }
    }

    const conversation = await Conversation.create(conversationData);

    // Send notifications to participants
    participants.forEach(async (participant) => {
      if (participant.userId !== participants[0].userId) {
        await notificationService.createNotification(
          participant.userId,
          'new_conversation',
          'New Conversation Started',
          `You have been added to a new ${type} conversation`,
          { conversationId: conversation._id }
        );
      }
    });

    return conversation;
  }

  // Delete message
  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is sender or has admin privileges
    if (message.sender.user_id.toString() !== userId.toString()) {
      const user = await User.findById(userId);
      if (!user || !['admin', 'super_admin'].includes(user.role)) {
        throw new Error('Not authorized to delete this message');
      }
    }

    // Soft delete
    await Message.findByIdAndUpdate(messageId, {
      deleted: true,
      deleted_at: new Date(),
      deleted_by: userId
    });

    // Delete associated files
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.id) {
          await uploadService.deleteFile(attachment.id);
        }
      }
    }

    // Send real-time update
    if (this.io) {
      this.io.to(`conversation_${message.conversation_id}`).emit('message_deleted', {
        messageId,
        conversationId: message.conversation_id
      });
    }

    return true;
  }

  // Send notifications for new message
  async sendMessageNotifications(conversation, message, senderId) {
    const otherParticipants = conversation.participants.filter(
      p => p.user_id.toString() !== senderId.toString()
    );

    for (const participant of otherParticipants) {
      let title = 'New Message';
      let messageContent = message.content;

      if (conversation.campaign_id) {
        title = `New message about ${conversation.campaign_id.title}`;
      } else if (conversation.deal_id) {
        title = `New message about ${conversation.deal_id.title}`;
      }

      await notificationService.createNotification(
        participant.user_id,
        'new_message',
        title,
        messageContent,
        {
          conversationId: conversation._id,
          messageId: message._id,
          senderId
        }
      );
    }
  }

  // Get unread message count
  async getUnreadCount(userId) {
    const result = await Conversation.aggregate([
      {
        $match: {
          'participants.user_id': userId
        }
      },
      {
        $project: {
          unreadCount: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$participants',
                  cond: { $eq: ['$$this.user_id', userId] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUnread: { $sum: '$unreadCount.unread_count' }
        }
      }
    ]);

    return result[0]?.totalUnread || 0;
  }

  // Search messages
  async searchMessages(userId, query, options = {}) {
    const { page = 1, limit = 20, conversationId = null } = options;
    const skip = (page - 1) * limit;

    let searchQuery = {
      content: { $regex: query, $options: 'i' }
    };

    if (conversationId) {
      searchQuery.conversation_id = conversationId;
    } else {
      // Only search in conversations user is part of
      const userConversations = await Conversation.find({
        'participants.user_id': userId
      }).select('_id');
      
      searchQuery.conversation_id = { $in: userConversations.map(c => c._id) };
    }

    const messages = await Message.find(searchQuery)
      .populate('conversation_id')
      .populate('sender.user_id', 'displayName profilePicture')
      .sort('-created_at')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments(searchQuery);

    return {
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new MessageService();
