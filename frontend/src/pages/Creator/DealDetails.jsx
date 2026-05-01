// pages/Creator/DealDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Edit,
  Send,
  Paperclip,
  Star,
  ThumbsUp,
  Flag,
  Upload,
  Loader,
  RefreshCw,
  XCircle,
  Activity,
  Image as ImageIcon,
  Video,
  Link2,
  Check,
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  Smile,
  ChevronRight
} from 'lucide-react';
import dealService from '../../services/dealService';
import disputeService from '../../services/disputeService';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSocket } from '../../context/SocketContext';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
const normalizeConversationId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id;
    if (typeof value.id === 'string') return value.id;
  }
  return String(value);
};

const getMessageConversationId = (message) => normalizeConversationId(message?.conversationId);

const MetricItem = ({ label, val, isDark }) => (
  <div className="space-y-1">
    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
    <p className={`text-base font-black tabular-nums ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{val}</p>
  </div>
);

const DealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { socket, joinConversation, leaveConversation, sendMessage: sendSocketMessage, markAsRead, addReaction, deleteMessage } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deal, setDeal] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterData, setCounterData] = useState({ budget: '', deadline: '', message: '' });
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [startingAiCounter, setStartingAiCounter] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [counterSuggestion, setCounterSuggestion] = useState(null);
  const [aiCounterAccess, setAiCounterAccess] = useState({ canUse: false, reason: '', plan: 'free', isActive: false });
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeData, setDisputeData] = useState({
    type: 'payment',
    title: '',
    description: ''
  });
  const [acceptingDeal, setAcceptingDeal] = useState(false);
  const [rejectingDeal, setRejectingDeal] = useState(false);
  const [cancellingDeal, setCancellingDeal] = useState(false);

  useEffect(() => {
    fetchDeal();
  }, [id]);

  useEffect(() => {
    if (!conversationId) return;

    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation]);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (message) => {
      if (normalizeConversationId(message?.conversationId) !== conversationId) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((msg) => msg._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });

      const senderId = message?.senderId?._id || message?.senderId;
      if (String(senderId) !== String(user?._id) && message?._id) {
        markAsRead(conversationId, [message._id]);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, conversationId, user, markAsRead]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (message) => {
      if (getMessageConversationId(message) === conversationId) {
        setMessages(prev => {
          if (prev.some((msg) => msg._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        scrollToBottom();
        const senderId = message?.senderId?._id || message?.senderId;
        if (String(senderId) !== String(user?._id)) {
          markMessagesAsRead([message._id]);
        }
      }
    };

    const handleMessagesRead = ({ messageIds, userId, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg =>
          messageIds.includes(msg._id)
            ? { ...msg, readBy: [...(msg.readBy || []), { userId, readAt: new Date() }] }
            : msg
        ));
      }
    };

    const handleMessageReaction = ({ messageId, userId, reaction, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            const filtered = (msg.reactions || []).filter(r => r.userId !== userId);
            return { ...msg, reactions: [...filtered, { userId, reaction, createdAt: new Date() }] };
          }
          return msg;
        }));
      }
    };

    const handleMessageEdited = ({ messageId, content, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, content, isEdited: true } : msg
        ));
      }
    };

    const handleMessageDeleted = ({ messageId, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'This message has been deleted', attachments: [] }
            : msg
        ));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket, conversationId, user]);

  const fetchDeal = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const response = await dealService.getDeal(id);

      if (response?.success) {
        setDeal(response.deal);
        setConversationId(normalizeConversationId(response.deal?.conversationId));
        await loadNegotiationSuggestion();
      } else {
        toast.error(response?.error || 'Failed to load deal');
        navigate('/creator/deals');
      }
    } catch (error) {
      console.error('Fetch deal error:', error);
      toast.error('Failed to load deal');
      navigate('/creator/deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNegotiationSuggestion = async () => {
    try {
      setSuggestionLoading(true);
      const response = await dealService.getNegotiationSuggestion(id);
      if (response?.success) {
        setCounterSuggestion(response.suggestion || null);
        setAiCounterAccess(response.aiCounter || { canUse: false, reason: '', plan: 'free', isActive: false });
      } else {
        setCounterSuggestion(null);
        setAiCounterAccess({ canUse: false, reason: response?.error || '', plan: 'free', isActive: false });
      }
    } catch (error) {
      setCounterSuggestion(null);
      setAiCounterAccess({ canUse: false, reason: 'Failed to load AI suggestion', plan: 'free', isActive: false });
    } finally {
      setSuggestionLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const markMessagesAsRead = (messageIds) => {
    if (conversationId && messageIds.length > 0) {
      markAsRead(conversationId, messageIds);
    }
  };

  const handleTyping = (value) => {
    setMessageInput(value);
    if (!isTyping && value && conversationId) {
      setIsTyping(true);
      socket?.emit('typing:start', { conversationId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && conversationId) {
        setIsTyping(false);
        socket?.emit('typing:stop', { conversationId });
      }
    }, 1000);
  };

  const fetchMessages = async () => {
    try {
      const response = await dealService.getDealMessages(id);
      if (response?.success) {
        setMessages(response.messages || []);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || sendingMessage) return;

    setSendingMessage(true);
    try {
      const content = messageInput.trim();
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        setUploading(true);
        const formData = new FormData();
        attachments.forEach(f => formData.append('files', f));
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json());
        if (uploadRes.success) {
          uploadedAttachments = uploadRes.files;
        }
        setUploading(false);
      }

      const socketSent = await new Promise((resolve) => {
        if (!conversationId) {
          resolve(false);
          return;
        }

        const timeoutId = setTimeout(() => resolve(false), 2000);
        const emitted = sendSocketMessage({
          conversationId,
          content,
          attachments: uploadedAttachments,
          replyTo: replyingTo?._id,
          dealId: id,
          contentType: 'text'
        }, (ack) => {
          clearTimeout(timeoutId);
          resolve(Boolean(ack?.success));
        });

        if (!emitted) {
          clearTimeout(timeoutId);
          resolve(false);
        }
      });

      if (!socketSent) {
        const sentMessage = await dealService.sendMessage(id, content, uploadedAttachments);
        if (!sentMessage) {
          throw new Error('Failed to send message');
        }

        setMessages((prev) => {
          if (prev.some((msg) => msg._id === sentMessage._id)) {
            return prev;
          }
          return [...prev, sentMessage];
        });

        await fetchDeal();
      }

      setMessageInput('');
      setAttachments([]);
      setReplyingTo(null);
      if (isTyping && conversationId) {
        setIsTyping(false);
        socket?.emit('typing:stop', { conversationId });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
      setUploading(false);
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

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const isManualCounterDisabledForActor = (dealState, actorRole) => {
    const settings = dealState?.negotiationSettings || {};
    if (settings?.mode !== 'ai') return false;

    if (actorRole === 'creator') {
      if (typeof settings.aiEnabledByCreator === 'boolean') return settings.aiEnabledByCreator;
      const aiEnabledBy = settings.aiEnabledBy?._id || settings.aiEnabledBy;
      return !aiEnabledBy || String(aiEnabledBy) === String(user?._id);
    }

    if (typeof settings.aiEnabledByBrand === 'boolean') return settings.aiEnabledByBrand;
    return false;
  };

  const handleCounterOffer = async () => {
    const manualLockedForActor = isManualCounterDisabledForActor(deal, 'creator');

    if (manualLockedForActor) {
      toast.error('Manual counter offer is disabled for the user who started AI Counter Dealing');
      return;
    }

    if (!counterData.message) {
      toast.error('Please add a message explaining your counter offer');
      return;
    }

    try {
      setSubmittingCounter(true);
      const response = await dealService.counterOffer(id, {
        budget: counterData.budget ? parseFloat(counterData.budget) : undefined,
        deadline: counterData.deadline || undefined,
        message: counterData.message
      });

      if (response?.success) {
          if (response?.insufficientFunds || response?.aiCounter?.insufficientFunds) {
            toast.error(response?.message || 'Brand funds are insufficient to auto-accept.');
          } else {
            toast.success(response?.message || 'Counter offer sent');
          }
        setShowCounterModal(false);
        setCounterData({ budget: '', deadline: '', message: '' });
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to send counter offer');
      }
    } catch (error) {
      console.error('Counter offer error:', error);
      toast.error('Failed to send counter offer');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleStartAiCounter = async () => {
    try {
      setStartingAiCounter(true);
      const response = await dealService.startAiCounterDealing(id);
      if (response?.success) {
        if (response?.aiCounter?.insufficientFunds || response?.insufficientFunds) {
          toast.error(response?.message || 'AI could not accept due to insufficient brand funds.');
        } else {
          toast.success(response?.message || 'AI Counter Dealing started and counter sent');
        }
        setShowCounterModal(false);
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to start AI counter dealing');
      }
    } catch (error) {
      toast.error('Failed to start AI counter dealing');
    } finally {
      setStartingAiCounter(false);
    }
  };

  const handleAccept = async () => {
    try {
      setAcceptingDeal(true);
      const response = await dealService.acceptDeal(id);
      if (response?.success) {
        toast.success('Deal accepted successfully! You can now start working on deliverables.');
        await fetchDeal();
      } else {
        const errorMsg = response?.error || 'Failed to accept deal';
        toast.error(errorMsg);
        console.error('Deal acceptance error:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Network error while accepting deal';
      toast.error(`Unable to accept deal: ${errorMsg}`);
      console.error('Deal acceptance exception:', error);
    } finally {
      setAcceptingDeal(false);
    }
  };

  const handleCancelDeal = async () => {
    if (!window.confirm('Are you sure you want to cancel this deal? This action cannot be undone.')) return;
    try {
      setCancellingDeal(true);
      const response = await dealService.cancelDeal(id, 'Cancelled by creator');
      if (response?.success) {
        toast.success('Deal cancelled successfully');
        await fetchDeal();
      } else {
        const errorMsg = response?.error || 'Failed to cancel deal';
        toast.error(`Unable to cancel deal: ${errorMsg}`);
        console.error('Deal cancellation error:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Network error while cancelling deal';
      toast.error(`Deal cancellation failed: ${errorMsg}`);
      console.error('Deal cancellation exception:', error);
    } finally {
      setCancellingDeal(false);
    }
  };

  const handleReject = async (reason = 'Deal rejected by creator') => {
    if (!window.confirm('Are you sure you want to reject this deal? This action cannot be undone.')) return;
    try {
      setRejectingDeal(true);
      const response = await dealService.updateDealStatus(id, 'rejected', reason);
      if (response?.success) {
        toast.success('Deal rejected successfully');
        await fetchDeal();
      } else {
        const errorMsg = response?.error || 'Failed to reject deal';
        toast.error(`Unable to reject deal: ${errorMsg}`);
        console.error('Deal rejection error:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Network error while rejecting deal';
      toast.error(`Deal rejection failed: ${errorMsg}`);
      console.error('Deal rejection exception:', error);
    } finally {
      setRejectingDeal(false);
    }
  };

  const handleAcceptCounterOffer = async () => {
    try {
      const response = await dealService.updateDealStatus(id, 'accepted', 'Counter offer accepted');
      if (response?.success) {
        toast.success('Counter offer accepted successfully');
        await fetchDeal();
      } else {
        const errorMsg = response?.error || 'Failed to accept counter offer';
        toast.error(`Unable to accept counter offer: ${errorMsg}`);
        console.error('Counter offer acceptance error:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Network error while accepting counter offer';
      toast.error(`Counter offer acceptance failed: ${errorMsg}`);
      console.error('Counter offer acceptance exception:', error);
    }
  };

  const handleCreateDispute = async () => {
    if (!deal?._id) {
      toast.error('Deal is not available');
      return;
    }

    if (!disputeData.title.trim() || !disputeData.description.trim()) {
      toast.error('Please add a title and description');
      return;
    }

    try {
      setSubmittingDispute(true);
      const response = await disputeService.createDispute({
        dealId: deal._id,
        type: disputeData.type,
        title: disputeData.title.trim(),
        description: disputeData.description.trim(),
        evidence: []
      });

      if (response?.success) {
        toast.success('Issue reported successfully');
        setShowDisputeModal(false);
        setDisputeData({ type: 'payment', title: '', description: '' });
      } else {
        toast.error(response?.error || 'Failed to report issue');
      }
    } catch (error) {
      console.error('Create dispute error:', error);
      toast.error(error?.response?.data?.error || 'Failed to report issue');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'deal', isDark);
  };

  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  const timelineVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const entryVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };
  const MotionLink = motion(Link);
  const getDeliverableStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Deal Not Found</h2>
        <span className="items-center" onClick={() => navigate('/creator/deals')}>
          Back to Deals
        </span>
      </div>
    );
  }

  const isCreator = user?.userType === 'creator';
  const otherParty = isCreator ? deal.brandId : deal.creatorId;
  const submittedDeliverables = deal.deliverables?.filter(d => d.status === 'submitted') || [];
  const latestCounter = deal.negotiation?.length
    ? deal.negotiation[deal.negotiation.length - 1]
    : null;
  const latestCounterProposedById = latestCounter?.proposedBy?._id || latestCounter?.proposedBy;
  const canCreatorAcceptCounter = Boolean(
    deal.status === 'negotiating' &&
    latestCounter &&
    latestCounterProposedById &&
    String(latestCounterProposedById) !== String(user?._id)
  );
  const manualCounterDisabled = isManualCounterDisabledForActor(deal, 'creator');
  const canCreatorCounter = (deal.status === 'pending') || (deal.status === 'negotiating' && canCreatorAcceptCounter);

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section - Matching CampaignDetails Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/creator/deals"
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              Deal <span className="font-bold">Details</span>
            </h1>
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {deal.campaignId?.title || 'Untitled Deal'} ?? Manage your deal details and communications.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDeal(true)}
            className={`p-2 rounded-lg transition-colors border ${
              isDark 
                ? 'hover:bg-zinc-800 text-zinc-400 border-zinc-700' 
                : 'hover:bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'} ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Cards - Compact like CampaignDetails */}
     <div className={`
  relative overflow-hidden rounded-2xl border px-5 py-3 transition-all duration-500
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 shadow-inner' 
    : 'bg-zinc-50 border-zinc-200 shadow-sm'}
`}>
  {/* Glassy Background Flare */}
  <div className={`absolute top-0 left-0 w-full h-[1px] ${isDark ? 'bg-gradient-to-r from-transparent via-zinc-700 to-transparent' : 'bg-gradient-to-r from-transparent via-zinc-300 to-transparent'}`} />

  <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
    {/* Status Segment */}
    <div className="flex items-center gap-2 group/stat">
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${getStatusColor(deal.status, 'deal', isDark).split(' ')[0]}`} />
      <div className="flex flex-col">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Status</span>
        <span className={`text-[11px] font-mono font-bold uppercase tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {deal.status}
        </span>
      </div>
    </div>

    {/* Vertical Divider */}
    <div className={`hidden sm:block w-[1px] h-6 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

    {/* Budget Segment */}
    <div className="flex flex-col group/stat">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Allocation</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {formatCurrency(deal.budget)}
        </span>
      </div>
    </div>

    {/* Deadline Segment */}
    <div className="flex flex-col group/stat">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Target Date</span>
      <span className={`text-[11px] font-mono font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {deal.deadline ? formatDate(deal.deadline) : 'NO_LIMIT'}
      </span>
    </div>

    {/* Progress Segment */}
    <div className="flex-1 min-w-[120px] flex flex-col group/stat">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Sync Progress</span>
        <span className="text-[10px] font-mono font-bold text-indigo-500">{deal.progress || 0}%</span>
      </div>
      <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
        <div 
          className="h-full bg-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          style={{ width: `${deal.progress || 0}%` }}
        />
      </div>
    </div>

    {/* Reference ID Segment */}
    <div className="flex flex-col items-end group/stat ml-auto">
      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Ref_Hash</span>
      <span className={`text-[10px] font-mono font-medium opacity-60 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        0x{deal._id?.slice(-8).toUpperCase()}
      </span>
    </div>
  </div>
</div>

      {/* Progress bar - Compact like CampaignDetails */}
    <div className={`
  group relative p-4 rounded-2xl border transition-all duration-500
  ${isDark 
    ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' 
    : 'bg-white border-zinc-100 hover:shadow-lg hover:shadow-zinc-200/30'}
`}>
  {/* Header: More compact spacing */}
  <div className="flex items-center justify-between mb-2">
    <div>
      <h3 className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Execution Index
      </h3>
      <div className={`text-xl font-mono font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
        {deal.progress || 0}<span className="text-[10px] opacity-40 ml-0.5">%</span>
      </div>
    </div>
    
    <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
      {deal.progress === 100 ? 'COMPLETE' : 'SYNCING'}
    </div>
  </div>

  {/* Progress Track: Slimmer height (h-1.5 instead of h-3) */}
  <div className={`relative w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
    <div
      className={`
        h-full rounded-full transition-all duration-1000 ease-out relative
        ${isDark ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-black'}
      `}
      style={{ width: `${deal.progress || 0}%` }}
    >
      {/* Moving Shimmer Effect */}
      <div className="absolute inset-0 w-full h-full transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  </div>

  {/* Financial Ledger Footer: Reduced top margin and padding */}
  <div className={`grid grid-cols-4 gap-2 mt-4 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-50'}`}>
    <div className="flex flex-col">
      <span className="text-[7px] font-black uppercase tracking-tight text-zinc-500 mb-0.5">Gross</span>
      <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        {formatCurrency(deal.budget)}
      </span>
    </div>

    {deal.netAmount && (
      <div className="flex flex-col">
        <span className="text-[7px] font-black uppercase tracking-tight text-emerald-500/80 mb-0.5">Net</span>
        <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {formatCurrency(deal.netAmount)}
        </span>
      </div>
    )}

    {deal.platformFee && (
      <div className="flex flex-col">
        <span className="text-[7px] font-black uppercase tracking-tight text-rose-500/80 mb-0.5">Fee</span>
        <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          -{formatCurrency(deal.platformFee)}
        </span>
      </div>
    )}

    <div className="flex flex-col items-end justify-center">
      <span className={`
        text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter
        ${deal.paymentStatus === 'paid' 
          ? 'bg-emerald-500/10 text-emerald-500' 
          : 'bg-amber-500/10 text-amber-500'}
      `}>
        {deal.paymentStatus || 'pending'}
      </span>
    </div>
  </div>
</div>
      {/* Tab Navigation - Matching CampaignDetails Style */}
 <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
  <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
    {[
      { id: 'overview', label: 'Overview', icon: Eye },
      { id: 'deliverables', label: 'Deliverables', icon: FileText },
      { id: 'messages', label: 'Messages', icon: MessageSquare, badge: messages.length },
      { id: 'timeline', label: 'Timeline', icon: Activity },
    ].map(({ id: tabId, label, icon: Icon, badge }) => {
      const isActive = activeTab === tabId;
      
      return (
        <button
          key={tabId}
          onClick={() => setActiveTab(tabId)}
          className={`
            relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider 
            transition-all duration-300 border whitespace-nowrap outline-none
            ${isActive 
              ? (isDark 
                  ? 'bg-whit e border-white text-white shadow-md z-10' 
                  : 'bg-black border-black text-white shadow-md z-10')
              : (isDark 
                  ? 'border-zinc-800/40 text-zinc-500 hover:text-zinc-300 bg-zinc-900/40' 
                  : 'border-zinc-100 text-zinc-400 hover:text-zinc-600 bg-zinc-50')
            }
          `}
        >
          <Icon className={`w-3.5 h-3.5 ${isActive ? 'opacity-100' : 'opacity-40'}`} />
          
          <span className="relative z-10">{label}</span>
          
          {badge > 0 && (
            <span className={`
              ml-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-sm text-[8px] font-mono font-black
              ${isActive 
                ? (isDark ? 'bg-black text-white' : 'bg-white text-black') 
                : 'bg-indigo-500 text-white'}
            `}>
              {badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
</div>

      {/* Tab Content */}
   {activeTab === 'overview' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: PRIMARY INTEL (8/12) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Deal Abstract Card */}
        <div className={`p-6 rounded-[2rem] border transition-all ${
          isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Campaign Blueprint
            </h2>
          </div>

          <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {deal.campaignId?.description || 'No project scope defined.'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Campaign ID', value: deal.campaignId?.title || '??', color: 'zinc' },
              { label: 'Model', value: deal.paymentType || 'Fixed', color: 'zinc', capitalize: true },
              { label: 'Gross Budget', value: formatCurrency(deal.budget || 0), color: 'emerald' },
              { label: 'System Fee', value: `-${formatCurrency(deal.platformFee || 0)}`, color: 'rose' },
              { label: 'Net Payout', value: formatCurrency(deal.netAmount || deal.budget || 0), color: 'indigo' },
              { label: 'Hard Deadline', value: deal.deadline ? formatDate(deal.deadline) : 'OPEN', color: 'zinc' }
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${
                isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'
              }`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">{stat.label}</p>
                <p className={`text-[13px] font-mono font-bold ${
                  stat.color === 'emerald' ? 'text-emerald-500' : 
                  stat.color === 'rose' ? 'text-rose-500' : 
                  stat.color === 'indigo' ? 'text-indigo-500' : 
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                } ${stat.capitalize ? 'capitalize' : ''}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Performance Engine */}
        {deal.paymentType !== 'fixed' && deal.performanceMetrics && (
          <div className={`p-6 rounded-[2rem] border ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Activity className="w-5 h-5" />
                </div>
                <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Performance Metrics
                </h2>
              </div>
              <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                {deal.paymentType} Model
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              {deal.paymentType === 'cpe' && deal.performanceMetrics.cpe && (
                <>
                  <MetricItem label="Target Engagements" val={formatNumber(deal.performanceMetrics.cpe.targetEngagements || deal.performanceMetrics.cpe.targetLikes)} isDark={isDark} />
                  <MetricItem label="Base Rate" val={formatCurrency(deal.performanceMetrics.cpe.baseRate)} isDark={isDark} />
                  <MetricItem label="Bonus Rate" val={formatCurrency(deal.performanceMetrics.cpe.bonusRate)} isDark={isDark} />
                </>
              )}
              {deal.paymentType === 'cpa' && deal.performanceMetrics.cpa && (
                <>
                  <MetricItem label="Target Conversions" val={formatNumber(deal.performanceMetrics.cpa.targetConversions)} isDark={isDark} />
                  <MetricItem label="Commission" val={formatCurrency(deal.performanceMetrics.cpa.commissionRate)} isDark={isDark} />
                  <MetricItem label="Base Rate" val={formatCurrency(deal.performanceMetrics.cpa.baseRate)} isDark={isDark} />
                </>
              )}
              {deal.paymentType === 'cpm' && deal.performanceMetrics.cpm && (
                <>
                  <MetricItem label="Target Impressions" val={formatNumber(deal.performanceMetrics.cpm.targetImpressions)} isDark={isDark} />
                  <MetricItem label="CPM Rate" val={formatCurrency(deal.performanceMetrics.cpm.ratePerThousand)} isDark={isDark} />
                  <MetricItem label="Base Rate" val={formatCurrency(deal.performanceMetrics.cpm.baseRate)} isDark={isDark} />
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Current Efficiency</span>
                <span className="text-sm font-black tabular-nums text-indigo-500">{deal.progress || 0}%</span>
              </div>
              <div className={`h-2 w-full rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} overflow-hidden p-0.5`}>
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-1000" 
                  style={{ width: `${deal.progress || 0}%` }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Negotiation History Log */}
        {deal.negotiation && deal.negotiation.length > 0 && (
          <div className={`p-6 rounded-[2rem] border ${
            isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Negotiation Log
              </h2>
            </div>

            <div className="space-y-4">
              {deal.negotiation.map((entry, index) => {
                const isProposedByMe = String(entry.proposedBy?._id || entry.proposedBy) === String(user?._id);
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-2xl border transition-all ${
                      isProposedByMe 
                        ? (isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100')
                        : (isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-100')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          isProposedByMe ? 'text-indigo-500' : 'text-zinc-500'
                        }`}>
                          {isProposedByMe ? 'Your Proposal' : 'Partner Proposal'}
                        </span>
                        {entry.source === 'ai' && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 text-[8px] font-black uppercase tracking-tighter">
                            AI
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Budget</p>
                        <p className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {formatCurrency(entry.budget)}
                        </p>
                      </div>
                      {entry.deadline && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Deadline</p>
                          <p className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            {formatDate(entry.deadline)}
                          </p>
                        </div>
                      )}
                    </div>

                    {entry.message && (
                      <p className={`text-xs leading-relaxed italic ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        "{entry.message}"
                      </p>
                    )}
                    
                    {entry.status === 'accepted' && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Accepted</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: PARTNER & LOGISTICS (4/12) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Identity Card */}
        <div className={`p-6 rounded-[2rem] border text-center ${
          isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'
        }`}>
          <div className="relative inline-block mb-4">
            <img 
              src={otherParty?.profilePicture || otherParty?.logo} 
              className="w-20 h-20 rounded-[2rem] object-cover ring-4 ring-indigo-500/10 shadow-xl" 
            />
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-1.5 rounded-xl shadow-lg">
              <Star className="w-4 h-4 text-black fill-current" />
            </div>
          </div>
          <h3 className="text-lg font-bold tracking-tight mb-1">
            {isCreator ? otherParty?.brandName : otherParty?.displayName}
          </h3>
          <p className="text-xs font-mono opacity-50 mb-4">@{otherParty?.handle || 'unlinked'}</p>
          
          <MotionLink
  to={isCreator ? `/creator/brands/${otherParty?._id}` : `/brand/creators/${otherParty?._id}`}
  state={{ brandData: otherParty }}
  // Framer Motion Props
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ 
    scale: 1.02,
    backgroundColor: isDark ? "rgba(39, 39, 42, 0.8)" : "rgba(244, 244, 245, 0.9)",
    borderColor: isDark ? "rgba(82, 82, 91, 1)" : "rgba(228, 228, 231, 1)",
  }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
  className={`block w-full py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
    isDark 
      ? 'border-zinc-800 text-zinc-300 bg-zinc-900/50' 
      : 'border-zinc-100 text-zinc-600 bg-white'
  }`}
>
  Access Profile
</MotionLink>
          </div>

        {/* Command Actions */}
        <div className={`p-6 rounded-[2rem] border ${
          isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-100'
        }`}>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Action Terminal</h2>
          <div className="space-y-3">
            {/* Logic for specific buttons based on status */}
            {deal.status === 'pending' && (
              <Button 
                variant="primary" 
                fullWidth 
                icon={acceptingDeal ? Loader : ThumbsUp} 
                onClick={handleAccept} 
                loading={acceptingDeal}
                disabled={acceptingDeal || loading}
                className="rounded-xl h-12 text-[11px] font-black uppercase tracking-widest"
              >
                {acceptingDeal ? 'Authorizing...' : 'Authorize Deal'}
              </Button>
            )}

            {/* AI Counter Agent - Make this look unique */}
            {canCreatorCounter && aiCounterAccess?.canUse && (
              <button 
                onClick={handleStartAiCounter}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-300"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Deploy AI Negotiator</span>
              </button>
            )}

            {canCreatorCounter && (
              <Button 
                variant="outline" 
                fullWidth 
                icon={Edit} 
                onClick={() => setShowCounterModal(true)}
                disabled={manualCounterDisabled || loading}
                className="rounded-xl h-12 text-[11px] font-black uppercase tracking-widest"
              >
                {manualCounterDisabled ? 'AI Negotiating...' : 'Manual Counter'}
              </Button>
            )}

            {canCreatorAcceptCounter && (
              <Button 
                variant="success" 
                fullWidth 
                icon={CheckCircle} 
                onClick={handleAcceptCounterOffer}
                disabled={loading}
                className="rounded-xl h-12 text-[11px] font-black uppercase tracking-widest"
              >
                Accept Counter Offer
              </Button>
            )}

            {['accepted', 'in-progress', 'revision'].includes(deal.status) && (
              <Button variant="outline" fullWidth icon={Upload} onClick={() => navigate(`/creator/deliverables/${deal._id}`)} className="rounded-xl h-12">
                Submit Asset
              </Button>
            )}
            
           <motion.button
  whileHover={{ scale: 1.01, opacity: 1 }}
  whileTap={{ scale: 0.98 }}
  onClick={() => setActiveTab('messages')}
  className={`group relative w-full h-12 flex items-center justify-center gap-3 rounded-xl border transition-all duration-300 ${
    isDark 
      ? 'bg-zinc-900/20 border-zinc-800/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700' 
      : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
  }`}
>
  {/* Security Pulse Indicator */}
  <div className="relative flex items-center justify-center">
    <div className="absolute h-2 w-2 rounded-full bg-emerald-500/40 animate-ping" />
    <div className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
  </div>

  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
    Secure Channel
  </span>

  <MessageSquare className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />

  {/* Subtle Internal Glow on Hover (Dark Mode Only) */}
  {isDark && (
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent" />
    </div>
  )}
</motion.button>
          </div>
        </div>

      </div>
    </div>
  </div>
)} 

{activeTab === 'deliverables' && (
  <motion.div 
    initial="hidden"
    animate="visible"
    variants={containerVariants}
    className="max-w-4xl mx-auto py-2"
  >
    {deal.deliverables?.length > 0 ? (
      <div className="grid gap-4">
        {deal.deliverables.map((del) => (
          <motion.div 
            key={del._id} 
            variants={itemVariants}
            className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
              isDark 
                ? 'bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900/50' 
                : 'bg-white border-zinc-200 shadow-sm hover:shadow-md'
            }`}
          >
            {/* Minimalist Status Indicator (Left Bar) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              del.status === 'approved' ? 'bg-emerald-500' :
              del.status === 'submitted' ? 'bg-blue-500' :
              del.status === 'revision' ? 'bg-orange-500' : 'bg-zinc-500'
            }`} />

            <div className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Left Side: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-500">
                      {del.platform}
                    </span>
                    {del.submittedAt && (
                      <span className={`text-[9px] font-mono ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        // {formatDate(del.submittedAt)}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-lg font-serif ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                    {del.type}
                  </h3>
                  {del.description && (
                    <p className={`text-xs mt-1 line-clamp-1 opacity-70 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {del.description}
                    </p>
                  )}
                </div>

                {/* Right Side: Assets & Status */}
                <div className="flex items-center gap-4">
                  {/* Small Asset Thumbnails */}
                  <div className="flex -space-x-1.5">
                    {del.files?.slice(0, 3).map((file, i) => (
                      <div key={i} className={`h-8 w-8 rounded-lg border-2 ${isDark ? 'border-zinc-900 bg-zinc-800' : 'border-white bg-zinc-100'} overflow-hidden`}>
                        {file.type === 'image' ? (
                          <img src={file.url} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><FileText className="w-3 h-3 text-zinc-500" /></div>
                        )}
                      </div>
                    ))}
                    {del.files?.length > 3 && (
                      <div className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center text-[8px] font-bold ${isDark ? 'border-zinc-900 bg-zinc-800 text-zinc-400' : 'border-white bg-zinc-100 text-zinc-600'}`}>
                        +{del.files.length - 3}
                      </div>
                    )}
                  </div>

                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${getDeliverableStatusColor(del.status)}`}>
                    {del.status}
                  </div>
                </div>
              </div>

              {/* Feedback Section (Compact) */}
              <AnimatePresence>
                {(del.revisionNotes || del.feedback) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-3 border-t border-zinc-800/10 space-y-2"
                  >
                    {del.revisionNotes && (
                      <div className="flex gap-2 items-start text-orange-500/90">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] leading-relaxed italic">{del.revisionNotes}</p>
                      </div>
                    )}
                    {del.feedback && (
                      <div className="flex gap-2 items-start text-blue-500/90">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] leading-relaxed italic">{del.feedback}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button for Creator */}
              {del.status === 'revision' && (
                <div className="mt-4 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => navigate(`/creator/deliverables/${deal._id}`)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Revised Asset
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    ) : (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 rotate-12 ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-100'}`}>
          <FileText className={`w-6 h-6 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
        </div>
        <h3 className={`text-xl font-serif mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
          Awaiting Submissions
        </h3>
        <p className="text-xs text-zinc-500">Assets will appear here for review once uploaded.</p>
      </motion.div>
    )}
  </motion.div>
)}

    {activeTab === 'messages' && (
  <div className={`rounded-2xl border transition-all h-[600px] flex flex-col overflow-hidden shadow-2xl ${
    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
  }`}>
    {/* Header */}
    <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
        <User className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
      </div>
      <div>
        <h2 className={`font-semibold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {isCreator ? deal.brandId?.brandName : deal.creatorId?.displayName}
        </h2>
        <p className="text-[10px] uppercase tracking-wider text-green-500 font-bold">Active Discussion</p>
      </div>
    </div>

    {/* Message Thread */}
    <div className={`flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar ${isDark ? 'bg-zinc-950/20' : 'bg-zinc-50/50'}`}>
      <AnimatePresence initial={false}>
        {messages.map((msg, index) => {
          const senderId = msg.senderId?._id || msg.senderId;
          const isOwn = String(senderId) === String(user?._id);
          
          return (
            <motion.div 
              key={msg._id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] sm:max-w-[65%] group`}>
                {!isOwn && (
                  <span className="text-[10px] font-bold text-zinc-500 ml-2 mb-1 uppercase tracking-tight block">
                    {msg.senderId?.fullName || msg.senderId?.brandName || 'User'}
                  </span>
                )}

                <div className={`relative p-3 shadow-sm ${
                  isOwn 
                    ? 'bg-[#667eea] text-white rounded-2xl rounded-tr-sm shadow-[#667eea]/10' 
                    : `rounded-2xl rounded-tl-sm border ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'}`
                }`}>
                  {/* Reply Context */}
                  {msg.replyTo && (
                    <div className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                      isOwn ? 'bg-white/10 border-white/30' : 'bg-zinc-100 border-zinc-300'
                    }`}>
                      <p className="truncate opacity-80 italic">"{msg.replyTo.content}"</p>
                    </div>
                  )}

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {/* Attachments */}
                  {msg.attachments?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {msg.attachments.map((file, i) => (
                        <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                            isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-zinc-100 hover:bg-zinc-200'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-black " />
                          <span className="flex-1 truncate text-black">{file.filename}</span>
                          <Download className="w-3.5 h-3.5 text-black" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Meta (Time & Status) */}
                  <div className={`flex items-center justify-end mt-2 gap-1.5 opacity-60 text-[10px] font-medium`}>
                    <span>{timeAgo(msg.createdAt)}</span>
                    {isOwn && (
                      msg.readBy?.length > 1 
                        ? <CheckCheck className="w-3 h-3 text-blue-200" /> 
                        : <Check className="w-3 h-3 text-white/70" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>

    {/* Input Area */}
    <div className={`p-4 border-t ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-100 bg-white'}`}>
      <div className={`relative rounded-2xl border transition-all p-2 ${
        isDark ? 'bg-zinc-950 border-zinc-800 focus-within:border-zinc-700' : 'bg-zinc-50 border-zinc-200 focus-within:border-zinc-300'
      }`}>
        {/* Active Reply Banner */}
        {replyingTo && (
          <div className="mx-2 mb-2 flex items-center justify-between bg-[#667eea]/10 p-2 rounded-xl">
            <span className="text-xs text-[#667eea] truncate">Replying to: {replyingTo.content}</span>
            <button onClick={() => setReplyingTo(null)} className="text-[#667eea]"><X className="w-3 h-3" /></button>
          </div>
        )}

        <textarea
          rows="1"
          value={messageInput}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Message..."
          className="w-full bg-transparent px-3 py-2 focus:outline-none text-sm resize-none min-h-[44px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />

        <div className="flex items-center justify-between px-2 pt-1 border-t border-zinc-800/50 mt-1">
          <div className="flex items-center gap-1">
            <label className="p-2 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors group">
              <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              <Paperclip className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            </label>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group">
              <Smile className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            </button>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={(!messageInput.trim() && attachments.length === 0) || sendingMessage}
            className="flex items-center gap-2 px-4 py-2 bg-[#667eea] text-white rounded-xl text-xs font-bold hover:bg-[#5a67d8] transition-all disabled:opacity-50 active:scale-95"
          >
            {sendingMessage ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            SEND
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    {activeTab === 'timeline' && (
  <motion.div 
    initial="hidden"
    animate="visible"
    variants={timelineVariants}
    className="max-w-2xl mx-auto py-2" // Reduced width for better focus
  >
    {/* Header - Much more compact */}
    <div className="flex items-center justify-between mb-8 px-2">
      <div>
        <h2 className={`text-xl font-serif tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
          Deal Journey
        </h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-500 font-bold mt-1">Audit Trail</p>
      </div>
      <div className={`p-2 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
        <Activity className="w-4 h-4 text-indigo-500" />
      </div>
    </div>

    {/* Timeline Content */}
    <div className="relative">
      {/* Slimmer Vertical Line */}
      <div className={`absolute left-[11px] top-2 bottom-2 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

      <div className="space-y-3"> {/* Tight spacing */}
        
        {/* EVENT: Deal Created */}
        <motion.div variants={entryVariants} className="relative pl-8 group">
          <div className={`absolute left-0 top-[18px] z-10 w-6 h-6 -ml-[1px] rounded-full flex items-center justify-center border ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
             <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          </div>
          
          <div className={`p-4 rounded-xl border transition-all ${
            isDark ? 'bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900/60' : 'bg-white border-zinc-100 hover:shadow-sm'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Agreement Drafted</h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Campaign initiated with <span className="text-indigo-500 font-medium">{formatCurrency(deal.budget)}</span> budget.
                </p>
              </div>
              <span className={`text-[9px] font-mono whitespace-nowrap px-2 py-1 rounded border ${isDark ? 'border-zinc-800 text-zinc-600' : 'border-zinc-100 text-zinc-400'}`}>
                {formatDate(deal.createdAt)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* EVENT: Deal Accepted */}
        {deal.status !== 'pending' && (
          <motion.div variants={entryVariants} className="relative pl-8 group">
            <div className={`absolute left-0 top-[18px] z-10 w-6 h-6 -ml-[1px] rounded-full flex items-center justify-center border ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            
            <div className={`p-4 rounded-xl border transition-all border-l-2 border-l-emerald-500/50 ${
              isDark ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-white border-zinc-100'
            }`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Terms Accepted</h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Partner has confirmed all contract deliverables.</p>
            </div>
          </motion.div>
        )}

        {/* EVENT: Deliverables (Compact Grid) */}
        {deal.deliverables?.some(d => d.status === 'submitted' || d.status === 'approved') && (
          <motion.div variants={entryVariants} className="relative pl-8 group">
            <div className={`absolute left-0 top-[18px] z-10 w-6 h-6 -ml-[1px] rounded-full flex items-center justify-center border ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
            }`}>
               <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-white border-zinc-100'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Submissions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {deal.deliverables?.filter(d => d.status === 'submitted' || d.status === 'approved').map((del, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                  }`}>
                    <span className="text-[10px] font-bold">{del.type}</span>
                    <div className={`w-1 h-1 rounded-full ${del.status === 'approved' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* EVENT: Current Status (Minimal Footer) */}
        <motion.div variants={entryVariants} className="relative pl-8 pt-4">
          <div className={`absolute left-0 top-[34px] z-10 w-6 h-6 -ml-[1px] rounded-full flex items-center justify-center border animate-pulse ${
            deal.status === 'completed' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-orange-500/50 bg-orange-500/10'
          }`}>
             <div className={`w-1.5 h-1.5 rounded-full ${deal.status === 'completed' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
          </div>
          
          <div className={`p-4 rounded-xl border border-dashed transition-all ${
            isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                deal.status === 'completed' ? 'text-emerald-500' : 'text-orange-500'
              }`}>
                Current: {deal.status}
              </span>
              {deal.deadline && (
                <span className="text-[9px] font-medium text-zinc-500">Due {formatDate(deal.deadline)}</span>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  </motion.div>
)}

      {/* Modals */}
      <Modal
        isOpen={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        title="Counter Offer"
      >
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-700'}`}>
              Budget (optional)
            </label>
            <input
              type="number"
              value={counterData.budget}
              onChange={(e) => setCounterData({ ...counterData, budget: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-gray-300'
              }`}
              placeholder="Your proposed budget"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-700'}`}>
              Deadline (optional)
            </label>
            <input
              type="date"
              value={counterData.deadline}
              onChange={(e) => setCounterData({ ...counterData, deadline: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-700'}`}>
              Message *
            </label>
            <textarea
              rows="4"
              value={counterData.message}
              onChange={(e) => setCounterData({ ...counterData, message: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-gray-300'
              }`}
              placeholder="Explain your counter offer..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCounterModal(false)}
              disabled={submittingCounter}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCounterOffer}
              loading={submittingCounter}
              disabled={!counterData.message}
            >
              Send Counter Offer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Report an Issue"
      >
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-700'}`}>
              Issue Type
            </label>
            <select
              value={disputeData.type}
              onChange={(e) => setDisputeData({ ...disputeData, type: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-gray-300'
              }`}
            >
              <option value="payment">Payment</option>
              <option value="delivery">Delivery</option>
              <option value="quality">Quality</option>
              <option value="communication">Communication</option>
              <option value="contract_breach">Contract Breach</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-700'}`}>
              Title
            </label>
            <input
              type="text"
              value={disputeData.title}
              onChange={(e) => setDisputeData({ ...disputeData, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-gray-300'
              }`}
              placeholder="Short summary of the issue"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-100' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              rows="5"
              value={disputeData.description}
              onChange={(e) => setDisputeData({ ...disputeData, description: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-gray-300'
              }`}
              placeholder="Detailed description of the issue..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDisputeModal(false)}
              disabled={submittingDispute}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleCreateDispute}
              loading={submittingDispute}
              disabled={!disputeData.title.trim() || !disputeData.description.trim()}
            >
              Report Issue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DealDetails;
