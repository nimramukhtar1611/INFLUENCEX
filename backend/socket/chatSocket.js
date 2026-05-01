const Message      = require('../models/Message');
const { Conversation } = require('../models/Conversation');
const User         = require('../models/User');
const jwtService   = require('../services/jwtService');

let io;

// ==================== JWT VERIFICATION MIDDLEWARE ====================
const verifySocketToken = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    console.log('Socket token received:', token ? 
      token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token using secure JWT service
    const user = await jwtService.getUserFromToken(token);
    
    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.tokenJti = jwtService.decodeToken(token)?.jti; // Store for potential blacklisting
    
    console.log(`🔐 Socket authenticated: user=${user.email} (${user.userType})`);
    next();
  } catch (error) {
    console.error('Socket JWT verification error:', error.message);
    return next(new Error(error.message || 'Authentication failed'));
  }
};

// ==================== INITIALIZE ====================
const initializeSocket = (socketIo) => {
  io = socketIo;

  // Apply JWT verification middleware to all connections
  io.use(verifySocketToken);

  io.on('connection', async (socket) => {
    const userId = socket.userId; // Get from verified socket
    
    console.log(`✅ Socket connected: user=${userId} socket=${socket.id}`);

    // Join user's personal room
    socket.join(`user_${userId}`);

    // Join admin room if user is an admin
    if (socket.user?.userType === 'admin') {
      socket.join('admins');
      console.log(`👨‍💼 Admin joined admins room: ${socket.user.email}`);
    }

    // Mark user as online
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
      .catch(err => console.error('User online update error:', err.message));

    // Notify contacts
    socket.broadcast.emit('user:online', { userId });

    // ==================== JOIN CONVERSATION ====================
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        // Verify access — Conversation schema uses snake_case participants
        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: { $elemMatch: { user_id: userId, is_active: true } }
        });
        if (!conv) return socket.emit('error', { message: 'Access denied' });

        socket.join(`conversation_${conversationId}`);

        // Mark unread messages as delivered — FIX: camelCase fields
        await Message.updateMany(
          {
            conversationId,
            senderId:             { $ne: userId },
            'deliveredTo.userId': { $ne: userId }
          },
          {
            $addToSet: { deliveredTo: { userId, deliveredAt: new Date() } }
          }
        );

        // Notify sender — FIX: camelCase event data
        socket.to(`conversation_${conversationId}`).emit('messages_delivered', {
          conversationId,
          userId
        });
      } catch (err) {
        console.error('Join conversation error:', err.message);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ==================== LEAVE CONVERSATION ====================
    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // ==================== SEND MESSAGE ====================
    socket.on('send_message', async (data, callback) => {
      try {
        const {
          conversationId,
          content,
          attachments = [],
          replyTo,         // FIX: was reply_to / repliedTo
          dealId,
          contentType = 'text'   // FIX: was message_type
        } = data;

        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: { $elemMatch: { user_id: userId, is_active: true } }
        });
        if (!conv) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Conversation not found' });
          }
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // FIX: all camelCase fields
        const message = new Message({
          conversationId,
          senderId:    userId,
          content,
          contentType,
          attachments,
          replyTo:     replyTo   || undefined,
          dealId:      dealId    || undefined,
          readBy:      [{ userId, readAt: new Date() }],
          deliveredTo: [{ userId, deliveredAt: new Date() }]
        });

        await message.save();
        await conv.updateLastMessage(message);

        // Populate for broadcast
        await message.populate('senderId', 'fullName email userType profilePicture brandName');
        if (replyTo) await message.populate('replyTo');

        // Broadcast to room
        io.to(`conversation_${conversationId}`).emit('new_message', message);

        // Update unread counts for other participants
        const otherParticipants = conv.participants.filter(
          p => p.user_id.toString() !== userId.toString() && p.is_active
        );

        for (const participant of otherParticipants) {
          const participantId = participant.user_id.toString();

          // Increment unread count in Conversation (Conversation uses snake_case Map)
          await Conversation.updateOne(
            { _id: conversationId },
            { $inc: { [`unread_count.${participantId}`]: 1 } }
          );

          // Notify participant's personal room
          io.to(`user_${participantId}`).emit('notification:message', {
            conversationId,
            messageId: message._id,
            senderId:  userId,
            content:   content?.substring(0, 100)
          });
        }

        if (typeof callback === 'function') {
          callback({ success: true, message });
        }
      } catch (err) {
        console.error('Send message socket error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Failed to send message' });
        }
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==================== MARK AS READ ====================
    socket.on('mark_read', async ({ conversationId, messageIds }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        // FIX: camelCase readBy
        await Message.updateMany(
          {
            _id:             { $in: messageIds },
            conversationId,
            'readBy.userId': { $ne: userId }
          },
          {
            $addToSet: { readBy: { userId, readAt: new Date() } }
          }
        );

        // Reset unread count in Conversation
        await Conversation.updateOne(
          { _id: conversationId },
          { $set: { [`unread_count.${userId}`]: 0 } }
        );

        // Notify room
        socket.to(`conversation_${conversationId}`).emit('messages_read', {
          messageIds,
          userId,
          conversationId,
          readAt: new Date()
        });
      } catch (err) {
        console.error('Mark read error:', err.message);
      }
    });

    // ==================== TYPING ====================
    socket.on('typing:start', async ({ conversationId }) => {
      const user = await User.findById(userId).select('fullName');
      socket.to(`conversation_${conversationId}`).emit('typing:update', {
        userId,
        fullName:       user?.fullName || 'Someone',
        isTyping:       true,
        conversationId
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('typing:update', {
        userId,
        isTyping:       false,
        conversationId
      });
    });

    // ==================== ADD REACTION ====================
    socket.on('add_reaction', async ({ messageId, reaction }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        await message.addReaction(userId, reaction);

        io.to(`conversation_${message.conversationId}`).emit('message_reaction', {
          messageId,
          userId,
          reaction,
          conversationId: message.conversationId
        });
      } catch (err) {
        console.error('Reaction error:', err.message);
      }
    });

    // ==================== DELETE MESSAGE ====================
    socket.on('delete_message', async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // FIX: senderId (camelCase)
        if (message.senderId.toString() !== userId.toString()) return;

        // FIX: isDeleted (camelCase)
        message.isDeleted   = true;
        message.content     = 'This message has been deleted';
        message.attachments = [];
        await message.save();

        io.to(`conversation_${message.conversationId}`).emit('message_deleted', {
          messageId,
          conversationId: message.conversationId
        });
      } catch (err) {
        console.error('Delete message error:', err.message);
      }
    });

    // ==================== EDIT MESSAGE ====================
    socket.on('edit_message', async ({ messageId, content }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // FIX: senderId (camelCase)
        if (message.senderId.toString() !== userId.toString()) return;

        // FIX: editHistory, isEdited (camelCase)
        message.editHistory.push({ content: message.content, editedAt: new Date() });
        message.content  = content;
        message.isEdited = true;
        await message.save();

        io.to(`conversation_${message.conversationId}`).emit('message_edited', {
          messageId,
          content,
          conversationId: message.conversationId,
          editedAt: new Date()
        });
      } catch (err) {
        console.error('Edit message error:', err.message);
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', async () => {
      try {
        console.log(`❌ Socket disconnected: user=${userId} socket=${socket.id}`);
        
        // Update user offline status with error handling
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() })
          .catch(err => console.error('User offline update error:', err.message));
        
        // Notify other users
        socket.broadcast.emit('user:offline', { userId, lastSeen: new Date() });
        
        // Clean up any user-specific data if needed
        // Leave all conversation rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('conversation_')) {
            socket.leave(room);
          }
        });
        
      } catch (error) {
        console.error('Socket disconnect error:', error);
      }
    });

    // ==================== PING (keep-alive) ====================
    socket.on('ping', () => socket.emit('pong'));
  });
};

// ==================== EXPORTED HELPERS ====================
const getIO = () => io;

const sendToConversation = (conversationId, event, data) => {
  if (!io) return;
  io.to(`conversation_${conversationId}`).emit(event, data);
};

const sendToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user_${userId}`).emit(event, data);
};

const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admins').emit(event, data);
  }
};

// Set global socket service for controllers to use
global.socketService = {
  emitToAdmins,
  sendToUser,
  sendToConversation,
  getIO
};

module.exports = { 
  initializeSocket, 
  getIO, 
  sendToConversation, 
  sendToUser, 
  emitToAdmins 
};