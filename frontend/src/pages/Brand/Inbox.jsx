import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  User,
  Briefcase,
  MessageSquare,
  Smile,
  Award,
  Clock,
  Trash2,
  Reply,
  Copy,
  Pin,
  Archive,
  AlertCircle,
  Loader,
  WifiOff,
  DollarSign,
  Eye,
  Bell,
  BellOff,
  XCircle,
  ChevronDown,
  CheckCircle,
  ChevronLeft,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { format, formatDistanceToNow } from 'date-fns';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import EmojiPicker from 'emoji-picker-react';

// Message Bubble Component
const MessageBubble = ({ message, isOwn, onReaction, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'];

  const getStatusIcon = () => {
    if (!isOwn) return null;
    if (message.status === 'sending') return <Clock className="w-4 h-4 text-gray-400" />;
    if (message.readBy?.length > 1) return <CheckCheck className="w-4 h-4 text-blue-500" title="Read" />;
    if (message.deliveredTo?.length > 1) return <CheckCheck className="w-4 h-4 text-gray-400" title="Delivered" />;
    return <Check className="w-4 h-4 text-gray-400" title="Sent" />;
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <Award className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'mr-2' : 'ml-2'}`}>
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 ml-1">
            {message.senderId?.fullName || message.senderId?.displayName || 'Creator'}
          </p>
        )}

        <div className="relative">
          {showActions && !message.isDeleted && (
            <div
              className={`absolute ${
                isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
              } top-0 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10`}
            >
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Smile className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => onReply(message)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Reply className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(message.content)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Copy className="w-4 h-4 text-gray-700" />
              </button>
              {isOwn && (
                <button
                  onClick={() => onDelete(message._id)}
                  className="p-1.5 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          )}

          {showReactions && (
            <div
              className={`absolute ${
                isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
              } top-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20`}
            >
              <div className="flex gap-1">
                {reactions.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      onReaction(message._id, r);
                      setShowReactions(false);
                    }}
                    className="w-8 h-8 hover:bg-gray-100 rounded-lg text-xl hover:scale-110 transition-all"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`rounded-2xl p-3 ${
              message.isDeleted
                ? 'bg-gray-100 text-gray-600 italic'
                : message.contentType === 'deal_offer'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                : isOwn
                ? 'bg-gray-700 text-white'
                : 'bg-white text-gray-900 shadow-sm border border-gray-200'
            }`}
          >
            {!message.isDeleted && message.replyTo && (
              <div className={`mb-2 p-2 rounded-lg text-sm ${isOwn ? 'bg-indigo-700' : 'bg-gray-100'}`}>
                <p className="text-xs opacity-75 mb-1">Replying to:</p>
                <p className="truncate">{message.replyTo.content}</p>
              </div>
            )}

            {message.contentType === 'deal_offer' ? (
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Deal Offer: ${message.metadata?.budget}</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.isDeleted ? 'This message has been deleted' : message.content}
              </p>
            )}

            {message.attachments?.length > 0 && (
              <div className={`mt-3 space-y-2 ${isOwn ? 'bg-indigo-700 rounded-lg p-2' : ''}`}>
                {message.attachments.map((file, i) => (
                  <div key={i}>
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="max-w-full max-h-64 rounded-lg hover:opacity-90 cursor-pointer"
                        onClick={() => window.open(file.url, '_blank')}
                      />
                    ) : file.type === 'video' ? (
                      <video src={file.url} controls className="max-w-full max-h-64 rounded-lg" />
                    ) : (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200 hover:border-[#667eea] transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#667eea]" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{file.filename}</span>
                        <Download className="w-4 h-4 text-gray-400" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {message.reactions?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((r, i) => (
                  <span key={i} className="text-sm bg-white bg-opacity-20 rounded-full px-2 py-0.5">
                    {r.reaction}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            <span title={format(new Date(message.createdAt), 'PPpp')}>
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {isOwn && getStatusIcon()}
            {message.isEdited && !message.isDeleted && <span className="text-gray-400">(edited)</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const BrandInbox = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage: sendSocketMessage,
    startTyping,
    stopTyping,
    markAsRead,
    addReaction,
    deleteMessage,
  } = useSocket();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealDetails, setDealDetails] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedConvSettings, setSelectedConvSettings] = useState(null);
  const [typingUsersState, setTypingUsersState] = useState({});
  const [onlineUsersState, setOnlineUsersState] = useState(new Set());

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadConversations();
    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));
    return () => {
      window.removeEventListener('online', () => setOnlineStatus(true));
      window.removeEventListener('offline', () => setOnlineStatus(false));
    };
  }, []);

  const loadConversations = async (includeArchived = false) => {
    try {
      setLoading(true);
      const res = await api.get('/messages/conversations', { params: { includeArchived } });
      if (res.data?.success) {
        const conversations = res.data.data || [];
        // Fetch actual unread counts from database
        const conversationsWithUnreadCounts = await Promise.all(
          conversations.map(async (conv) => {
            try {
              const unreadRes = await api.get(`/messages/conversations/${conv._id}/unread-count`);
              const unreadCount = unreadRes.data?.success ? unreadRes.data.data.unreadCount : 0;
              return { ...conv, unreadCount };
            } catch (error) {
              console.error(`Failed to get unread count for conversation ${conv._id}:`, error);
              return { ...conv, unreadCount: 0 };
            }
          })
        );
        setConversations(conversationsWithUnreadCounts);
      }
    } catch (e) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    if (selectedConversation) leaveConversation(selectedConversation._id);
    setSelectedConversation(conv);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    joinConversation(conv._id);
    await loadMessages(conv._id);
    markMessagesAsRead(conv._id);
    setConversations(prev =>
      prev.map(c => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Helper function for deal status with standardized colors
  const getDealStatusDisplay = (status) => {
    const statusClass = getStatusColor(status, 'deal', isDark);
    
    const getDealStatusIcon = (status) => {
      switch(status?.toLowerCase()) {
        case 'completed': return CheckCircle;
        case 'in-progress': return Clock;
        default: return AlertCircle;
      }
    };
    
    const StatusIcon = getDealStatusIcon(status);
    const iconColor = getStatusIconColor(status);
    
    return { statusClass, StatusIcon, iconColor };
  };

  const loadMessages = async (conversationId, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const res = await api.get(`/messages/conversations/${conversationId}`, {
        params: { page: pageNum, limit: 50 },
      });
      if (res.data?.success) {
        const newMsgs = res.data.data.messages || [];
        if (pageNum === 1) setMessages(newMsgs);
        else setMessages(prev => [...newMsgs, ...prev]);
        setHasMore(res.data.data.pagination?.hasMore || false);
        setPage(pageNum);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loadingMore && selectedConversation) {
      loadMessages(selectedConversation._id, page + 1);
    }
  };

  // Socket listeners – correct event names (underscore style)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
      setConversations(prev => {
        const updated = prev.map(c =>
          c._id === message.conversationId
            ? {
                ...c,
                lastMessage: message,
                lastMessageAt: new Date(),
                unreadCount:
                  message.senderId?._id !== user?._id ? (c.unreadCount || 0) + 1 : c.unreadCount,
              }
            : c
        );
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt)
        );
      });
      if (selectedConversation?._id === message.conversationId) {
        scrollToBottom();
        if (message.senderId?._id !== user?._id) {
          markMessagesAsRead(message.conversationId, [message._id]);
        }
      } else if (message.senderId?._id !== user?._id) {
        toast.success(`New message from ${message.senderId?.displayName || 'Creator'}`, {
          icon: '💬',
        });
      }
    };

    const handleMessagesDelivered = ({ conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => ({ ...msg, delivered: true })));
      }
    };

    const handleMessagesRead = ({ messageIds, userId, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            messageIds.includes(msg._id)
              ? {
                  ...msg,
                  readBy: [...(msg.readBy || []), { userId, readAt: new Date() }],
                }
              : msg
          )
        );
      }
    };

    const handleMessageReaction = ({ messageId, userId, reaction, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === messageId) {
              const filtered = (msg.reactions || []).filter(r => r.userId !== userId);
              return {
                ...msg,
                reactions: [...filtered, { userId, reaction, createdAt: new Date() }],
              };
            }
            return msg;
          })
        );
      }
    };

    const handleMessageEdited = ({ messageId, content, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, content, isEdited: true } : msg
          )
        );
      }
    };

    const handleMessageDeleted = ({ messageId, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? {
                  ...msg,
                  isDeleted: true,
                  content: 'This message has been deleted',
                  attachments: [],
                }
              : msg
          )
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing:update', ({ userId, fullName, isTyping, conversationId }) => {
      if (selectedConversation?._id === conversationId && userId !== user?._id) {
        setTypingUsersState(prev => ({
          ...prev,
          [conversationId]: isTyping ? { userId, fullName } : null,
        }));
      }
    });
    socket.on('user:online', ({ userId }) =>
      setOnlineUsersState(prev => new Set([...prev, userId]))
    );
    socket.on('user:offline', ({ userId }) =>
      setOnlineUsersState(prev => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      })
    );

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing:update');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [socket, selectedConversation, user]);

  const handleTyping = (value) => {
    setMessageInput(value);
    if (!isTyping && value && selectedConversation) {
      setIsTyping(true);
      startTyping(selectedConversation._id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedConversation) {
        setIsTyping(false);
        stopTyping(selectedConversation._id);
      }
    }, 1000);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !selectedConversation || uploading)
      return;
    try {
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        setUploading(true);
        const formData = new FormData();
        attachments.forEach(f => formData.append('files', f));
        const res = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.success) uploadedAttachments = res.data.data;
        setUploading(false);
      }

      const success = sendSocketMessage({
        conversationId: selectedConversation._id,
        content: messageInput,
        attachments: uploadedAttachments,
        replyTo: replyingTo?._id,
        dealId: selectedConversation.deal_id?._id,
        contentType: 'text',
      });

      if (success) {
        setMessageInput('');
        setAttachments([]);
        setReplyingTo(null);
        if (isTyping && selectedConversation) {
          setIsTyping(false);
          stopTyping(selectedConversation._id);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      } else {
        toast.error('Failed to send. Check your connection.');
      }
    } catch (e) {
      setUploading(false);
      toast.error('Failed to send message.');
    }
  };

  const markMessagesAsRead = async (conversationId, messageIds) => {
    if (!selectedConversation || selectedConversation._id !== conversationId) return;
    
    const unread =
      messageIds ||
      messages
        .filter(
          msg =>
            msg.senderId?._id !== user?._id && !msg.readBy?.some(r => r.userId === user?._id)
        )
        .map(msg => msg._id);
    
    if (unread.length > 0) {
      try {
        // Persist read state to backend
        await api.put(`/messages/conversations/${conversationId}/read`, { messageIds: unread });
        
        // Update local state optimistically
        setMessages(prev =>
          prev.map(msg =>
            unread.includes(msg._id)
              ? {
                  ...msg,
                  readBy: [...(msg.readBy || []), { userId: user?._id, readAt: new Date() }],
                }
              : msg
          )
        );
        
        setConversations(prev =>
          prev.map(c => {
            if (c._id === conversationId) {
              // Calculate actual unread count from updated messages
              const actualUnreadCount = messages.filter(
                msg => msg.senderId?._id !== user?._id && !msg.readBy?.some(r => r.userId === user?._id)
              ).length;
              return { ...c, unreadCount: Math.max(0, actualUnreadCount - unread.length) };
            }
            return c;
          })
        );
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
        // Fallback to socket-based marking if API fails
        markAsRead(conversationId, unread);
      }
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => {
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`${f.name} too large`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = i =>
    setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const scrollToBottom = () =>
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const handleScroll = useCallback(e => {
    if (e.target.scrollTop === 0 && hasMore && !loadingMore && selectedConversation) {
      loadMoreMessages();
    }
  }, [hasMore, loadingMore, selectedConversation]);

  const getOtherParticipant = conv =>
    conv.participants?.find(
      p =>
        p.user_id?._id?.toString() !== user?._id?.toString() &&
        p.user_id?.toString() !== user?._id?.toString()
    );

  const getConversationName = conv => {
    if (conv.isGroup) return conv.name || 'Group Chat';
    const other = getOtherParticipant(conv);
    return other?.user_id?.brandName || other?.user_id?.displayName || other?.user_id?.fullName || 'Brand';
  };

  const getConversationAvatar = conv => {
    const other = getOtherParticipant(conv);
    return other?.user_id?.profilePicture || 'https://via.placeholder.com/40';
  };

  const isUserOnline = conv => {
    const other = getOtherParticipant(conv);
    const otherId = other?.user_id?._id || other?.user_id;
    return otherId && onlineUsersState.has(otherId.toString());
  };

  const formatLastSeen = conv => {
    const other = getOtherParticipant(conv);
    if (!other?.user_id?.lastSeen) return 'Offline';
    return `Last seen ${formatDistanceToNow(new Date(other.user_id.lastSeen), { addSuffix: true })}`;
  };

  const handleArchive = async id => {
    try {
      await api.put(`/messages/conversations/${id}/archive`);
      toast.success('Archived');
      loadConversations();
      if (selectedConversation?._id === id) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleMute = async id => {
    try {
      await api.put(`/messages/conversations/${id}/mute`, {
        duration: 24 * 60 * 60 * 1000,
      });
      toast.success('Muted');
    } catch {
      toast.error('Failed');
    }
  };

  const handleUnmute = async id => {
    try {
      await api.put(`/messages/conversations/${id}/unmute`);
      toast.success('Unmuted');
    } catch {
      toast.error('Failed');
    }
  };

  const handlePin = async id => {
    try {
      await api.put(`/messages/conversations/${id}/pin`);
      toast.success('Pinned');
      loadConversations();
    } catch {
      toast.error('Failed');
    }
  };

  const handleUnpin = async id => {
    try {
      await api.put(`/messages/conversations/${id}/unpin`);
      toast.success('Unpinned');
      loadConversations();
    } catch {
      toast.error('Failed');
    }
  };

  const handleBlock = async userId => {
    try {
      await api.post(`/messages/block/${userId}`);
      toast.success('User blocked');
      loadConversations();
      setSelectedConversation(null);
      setMessages([]);
    } catch {
      toast.error('Failed to block');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getConversationName(conv).toLowerCase();
    const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase());
    if (filter === 'unread') return matchSearch && conv.unreadCount > 0;
    if (filter === 'deals') return matchSearch && conv.deal_id;
    if (filter === 'pinned') return matchSearch && conv.metadata?.is_pinned;
    return matchSearch;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div >
      <div className={`max-w-7xl mx-auto space-y-8 p-6 relative z-10 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {!onlineStatus && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 text-sm z-50 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" /> You are offline.
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Brand <span className="font-bold">Inbox</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage conversations and collaborate with creators.</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Conversations</span>
          <span className="text-xl font-light tracking-tighter mt-1">{conversations.length}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Unread Messages</span>
          <span className="text-xl font-light tracking-tighter mt-1">{totalUnread}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Deals</span>
          <span className="text-xl font-light tracking-tighter mt-1">{conversations.filter(c => c.deal_id).length}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
    <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
  {/* Tactile Filter Toggles */}
  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
    {['all', 'unread', 'deals', 'pinned'].map(f => (
      <button
        key={f}
        onClick={() => setFilter(f)}
        className={`
          relative px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 border shrink-0
          ${filter === f
            ? (isDark 
                ? 'bg-white text-white border-white text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                : 'bg-black border-black text-white shadow-[0_10px_20px_rgba(0,0,0,0.1)]')
            : (isDark 
                ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 shadow-sm')
          }
        `}
      >
        <span className="relative z-10">{f}</span>
        
        {f === 'unread' && totalUnread > 0 && (
          <span className={`
            ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-black animate-pulse
            ${filter === f 
              ? (isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black') 
              : 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'}
          `}>
            {totalUnread}
          </span>
        )}
      </button>
    ))}
  </div>

  {/* Modern Search Input with Depth */}
  <div className="relative w-full lg:max-w-[320px] group">
    <div className={`
      absolute inset-0 rounded-full transition-all duration-500 blur-md opacity-0 group-focus-within:opacity-10 
      ${isDark ? 'bg-white' : 'bg-black'}
    `} />
    
    <div className="relative">
      <Search className={`
        absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-300
        ${isDark ? 'text-zinc-600 group-focus-within:text-white' : 'text-zinc-400 group-focus-within:text-black'}
      `} />
      
      <input
        type="text"
        placeholder="Filter by name or reference..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className={`
          w-full pl-11 pr-5 py-2.5 text-[11px] font-bold tracking-tight rounded-full border transition-all duration-500 focus:outline-none
          ${isDark 
            ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-500 text-zinc-100 placeholder:text-zinc-600' 
            : 'bg-zinc-50/50 border-zinc-100 focus:border-black text-zinc-900 placeholder:text-zinc-400'}
        `}
      />
    </div>
  </div>
</div>

      {/* Conversations List - Full Width */}
      {!selectedConversation ? (
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <div className={`p-4 border-b ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-white'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Conversations</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
                  <p className="text-zinc-500 text-xs font-medium">Loading conversations...</p>
                </div>
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="space-y-2">
                {filteredConversations.map(conv => (
                  <div
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`group p-4 cursor-pointer transition-all rounded-xl ${
                      isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-white'
                    } ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={getConversationAvatar(conv)}
                          alt={getConversationName(conv)}
                          className={`w-10 h-10 rounded-full object-cover ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}
                        />
                        {isUserOnline(conv) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-sm truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            {conv.deal_id?.campaignId?.title || conv.campaign_id?.title || getConversationName(conv)}
                          </h3>
                          {conv.lastMessageAt && (
                            <span className={`text-[10px] whitespace-nowrap ml-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] font-medium mb-1 truncate ${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`}>
                          {getConversationName(conv)}
                        </div>
                        <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {conv.lastMessage?.senderId?._id === user?._id || conv.lastMessage?.senderId === user?._id ? 'You: ' : ''}
                          {conv.lastMessage?.contentType === 'deal_offer'
                            ? '💰 Deal offer'
                            : conv.lastMessage?.content ||
                              (conv.lastMessage?.attachments?.length > 0
                                ? '📷 Photo'
                                : 'No messages yet')}
                        </p>
                        {conv.deal_id && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-1 ${getDealStatusDisplay(conv.deal_id.status).statusClass}`}
                          >
                            <span className="w-1 h-1 rounded-full bg-current mr-1.5 animate-pulse" />
                            ${conv.deal_id.budget} · {conv.deal_id.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 px-4 ${isDark ? 'bg-zinc-900/50' : ''}`}>
                <MessageSquare className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>No conversations</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Start collaborating with creators</p>
               
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full Screen Chat View */
        <div className={`h-[calc(100vh-200px)] rounded-2xl border overflow-hidden flex flex-col ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-white'}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                >
                  <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
                </button>
                <div className="relative">
                  <img
                    src={getConversationAvatar(selectedConversation)}
                    alt={getConversationName(selectedConversation)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isUserOnline(selectedConversation) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {getConversationName(selectedConversation)}
                  </h3>
                  <span
                    className={`text-xs ${
                      typingUsersState[selectedConversation._id]
                        ? 'text-[#667eea] animate-pulse'
                        : isUserOnline(selectedConversation)
                        ? isDark ? 'text-green-400' : 'text-green-600'
                      : isDark ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {typingUsersState[selectedConversation._id]
                      ? `${typingUsersState[selectedConversation._id].fullName} is typing...`
                      : isUserOnline(selectedConversation)
                      ? 'Online'
                      : formatLastSeen(selectedConversation)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.deal_id && (
                  <button
                    onClick={() => {
                      setDealDetails(selectedConversation.deal_id);
                      setShowDealModal(true);
                    }}
                  className={`px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 `}
                  >
                    <Briefcase className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">View Deal</span><span className="md:hidden">Deal</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedConvSettings(selectedConversation);
                    setShowSettingsModal(true);
                  }}
                  className={`p-1.5 md:p-2 rounded-lg ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
                >
                  <MoreVertical className={`w-4 h-4 md:w-5 md:h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </div>
            </div>

            {selectedConversation.deal_id && (
              <div className={`px-3 md:px-4 py-2 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                isDark 
                  ? 'bg-gradient-to-r from-gray-900 to-gray-900 border-gray-800'
                  : 'bg-gradient-to-r from-gray-50 to-gray-50 border-gray-100'
              }`}>
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-1">
                    <Briefcase className={`w-3 h-3 md:w-4 md:h-4  text-gray-700`} />
                    <span className={`text-xs md:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Deal:</span>{' '}
                      {selectedConversation.deal_id.campaignId?.title || 'Campaign'}
                    </span>
                  </div>
                  <span className={`text-xs md:text-sm font-medium text-gray-700`}>
                    ${selectedConversation.deal_id.budget}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getDealStatusDisplay(selectedConversation.deal_id.status).statusClass}`}
                  >
                    {React.createElement(getDealStatusDisplay(selectedConversation.deal_id.status).StatusIcon, { className: `w-3 h-3 ${getDealStatusDisplay(selectedConversation.deal_id.status).iconColor}` })}
                    {selectedConversation.deal_id.status}
                  </span>
                </div>
                <Link
                  to={`/brand/deals/${selectedConversation.deal_id._id}`}
                  className={`text-xs font-medium text-gray-400`}
                >
                  View Details
                </Link>
              </div>
            )}

            <div
              ref={messageContainerRef}
              onScroll={handleScroll}
              className={`flex-1 overflow-y-auto p-4 ${isDark ? 'bg-zinc-900/50' : 'bg-white'}`}
            >
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="text-center">
                    <Loader className="w-6 h-6 animate-spin text-zinc-500 mx-auto mb-2" />
                    <p className="text-zinc-500 text-xs font-medium">Loading more...</p>
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  isOwn={
                    msg.senderId?._id?.toString() === user?._id?.toString() ||
                    msg.senderId?.toString() === user?._id?.toString()
                  }
                  onReaction={addReaction}
                  onDelete={deleteMessage}
                  onReply={setReplyingTo}
                />
              ))}
              {typingUsersState[selectedConversation._id] && (
                <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                    <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>...</span>
                  </div>
                  <div className="rounded-2xl px-4 py-2 shadow-sm">
                    <div className="flex space-x-1">
                      {[0, 150, 300].map(d => (
                        <div
                          key={d}
                          className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-zinc-400' : 'bg-zinc-400'}`}
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyingTo && (
              <div className={`px-4 py-2 border-t flex items-center justify-between ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Reply className={`w-4 h-4 ${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`} />
                  <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    Replying to: {replyingTo.content?.substring(0, 50)}
                    {replyingTo.content?.length > 50 ? '...' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className={`${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className={`px-4 py-2 border-t flex flex-wrap gap-2 ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white'}`}>
                {attachments.map((f, i) => (
                  <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100'}`}>
                    <FileText className="w-3 h-3" />
                    <span>{f.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className={`${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`p-4 border-t ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white'}`}>
              <div className="flex items-end gap-1 md:gap-2">
                <div className="flex-1 relative">
                  <textarea
                    rows="1"
                    value={messageInput}
                    onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={uploading ? 'Uploading...' : 'Type your message...'}
                    disabled={uploading || !onlineStatus}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none max-h-32 disabled:opacity-50 text-sm ${
                      isDark 
                        ? 'bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400 disabled:bg-zinc-800'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-500 disabled:bg-zinc-100'
                    }`}
                    style={{ minHeight: '48px' }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1 z-10">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-1.5 rounded-lg flex items-center justify-center cursor-pointer ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
                    >
                      <Paperclip className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                    </button>
                    <button
                      className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50">
                          <EmojiPicker
                            onEmojiClick={e => {
                              setMessageInput(prev => prev + e.emoji);
                              setShowEmojiPicker(false);
                            }}
                          />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={
                    (!messageInput.trim() && attachments.length === 0) || uploading || !onlineStatus
                  }
                  className="px-3 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {!onlineStatus && (
                <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  <WifiOff className="w-3 h-3" /> You're offline.
                </p>
              )}
            </div>
          </>
        </div>
      )}

      {/* Deal Modal */}
      <Modal isOpen={showDealModal} onClose={() => setShowDealModal(false)} title="Deal Details">
        {dealDetails && (
          <div className="space-y-4">
            <div className="bg-[#667eea]/10 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Campaign</p>
              <p className="font-semibold text-gray-900">{dealDetails.campaignId?.title || 'Campaign'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Budget</p>
                <p className="text-lg font-bold">${dealDetails.budget}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${getDealStatusDisplay(dealDetails.status).statusClass}`}
                >
                  {React.createElement(getDealStatusDisplay(dealDetails.status).StatusIcon, { className: `w-3 h-3 ${getDealStatusDisplay(dealDetails.status).iconColor}` })}
                  {dealDetails.status}
                </span>
              </div>
            </div>
            <Link
              to={`/brand/deals/${dealDetails._id}`}
              className="block w-full bg-zinc-900 border text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-[#000000] transition-colors"
              onClick={() => setShowDealModal(false)}
            >
              Manage Deal
            </Link>
          </div>
        )}
      </Modal>

      {/* Conversation Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Conversation Settings"
      >
        {selectedConvSettings && (
          <div className="space-y-2">
            {[
              { label: 'Pin', icon: Pin, action: () => handlePin(selectedConvSettings._id) },
              { label: 'Archive', icon: Archive, action: () => handleArchive(selectedConvSettings._id) },
              { label: 'Mute', icon: BellOff, action: () => handleMute(selectedConvSettings._id) },
              { label: 'Unmute', icon: Bell, action: () => handleUnmute(selectedConvSettings._id) },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={() => {
                  action();
                  setShowSettingsModal(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-lg text-left"
              >
                <Icon className="w-5 h-5 text-gray-600" />
                <span>{label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                handleBlock(
                  getOtherParticipant(selectedConvSettings)?.user_id?._id ||
                    getOtherParticipant(selectedConvSettings)?.user_id
                );
                setShowSettingsModal(false);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg text-left text-red-600"
            >
              <XCircle className="w-5 h-5" />
              <span>Block User</span>
            </button>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
};

export default BrandInbox;