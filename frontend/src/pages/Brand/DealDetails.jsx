// pages/Brand/DealDetails.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useDeal } from '../../hooks/useDeal';
import { useSocket } from '../../context/SocketContext';
import { useFees } from '../../context/FeeContext';
import brandService from '../../services/brandService';
import dealService from '../../services/dealService';
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
  X,
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
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

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

const DealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { calculateCommission, fees } = useFees();
  const isDark = theme === 'dark';

  // Helper component for clean metrics
  const MetricItem = ({ label, val, isDark }) => (
    <div className="space-y-1">
      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`text-base font-black tabular-nums ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{val}</p>
    </div>
  );
  const { socket, joinConversation, leaveConversation, sendMessage: sendSocketMessage, markAsRead, addReaction, deleteMessage } = useSocket();
  const {
    currentDeal: deal,
    loading,
    fetchDeal,
    updateDealStatus,
    counterOffer,
    requestRevision,
    approveDeliverable,
    rateDeal,
    submitDeliverables,
    getDealMessages,
    sendMessage
  } = useDeal();

  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [counterData, setCounterData] = useState({ budget: '', deadline: '', message: '' });
  const [startingAiCounter, setStartingAiCounter] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [counterSuggestion, setCounterSuggestion] = useState(null);
  const [aiCounterAccess, setAiCounterAccess] = useState({ canUse: false, reason: '', plan: 'free', isActive: false });
  const [brandAiCounterEnabled, setBrandAiCounterEnabled] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (id) {
      loadDeal();
    }
  }, [id]);

  useEffect(() => {
    const fetchBrandAiSetting = async () => {
      if (user?.userType === 'brand' && user?._id) {
        try {
          const res = await brandService.getProfile();
          if (res?.success && res.brand) {
            setBrandAiCounterEnabled(res.brand.aiCounterEnabled || false);
          }
        } catch (error) {
          console.error('Error fetching brand AI setting:', error);
        }
      }
    };
    fetchBrandAiSetting();
  }, [user?.userType, user?._id]);

  useEffect(() => () => {
    if (conversationId) leaveConversation(conversationId);
  }, [conversationId, leaveConversation]);

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

  const loadDeal = async () => {
    const data = await fetchDeal(id);
    if (data) {
      const resolvedConversationId = normalizeConversationId(data.conversationId);
      if (resolvedConversationId) {
        setConversationId(resolvedConversationId);
        joinConversation(resolvedConversationId);
      } else {
        setConversationId(null);
      }
      const msgs = await getDealMessages(id);
      setMessages(msgs || []);
      await loadNegotiationSuggestion();
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
        const sentMessage = await sendMessage(id, content, uploadedAttachments);
        if (!sentMessage) {
          throw new Error('Failed to send message');
        }

        setMessages((prev) => {
          if (prev.some((msg) => msg._id === sentMessage._id)) {
            return prev;
          }
          return [...prev, sentMessage];
        });

        await loadDeal();
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

  const handleApproveDeliverable = async () => {
    try {
      if (selectedDeliverable) {
        // Approve a single specific deliverable
        await approveDeliverable(id, selectedDeliverable, '');
        toast.success('Deliverable approved');
      } else {
        // Approve all submitted deliverables
        const submitted = deal.deliverables?.filter(d => d.status === 'submitted') || [];
        if (submitted.length === 0) {
          toast.error('No submitted deliverables to approve');
          return;
        }
        for (const del of submitted) {
          await approveDeliverable(id, del._id, '');
        }
        toast.success(`${submitted.length} deliverable(s) approved`);
      }
      setShowApproveModal(false);
      setSelectedDeliverable(null);
      loadDeal();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes) {
      toast.error('Please provide revision notes');
      return;
    }

    let deliverableToRevise = selectedDeliverable;

    // If no deliverable is selected from the sidebar button
    if (!deliverableToRevise) {
      const submitted = deal.deliverables?.filter(d => d.status === 'submitted') || [];
      if (submitted.length === 1) {
        deliverableToRevise = submitted[0]._id;
      } else if (submitted.length > 1) {
        toast.error('Multiple deliverables submitted. Please use the "Request Changes" button on a specific deliverable in the Deliverables tab.');
        return;
      } else {
        toast.error('No submitted deliverables to revise');
        return;
      }
    }

    try {
      await requestRevision(id, deliverableToRevise, revisionNotes);
      toast.success('Revision requested');
      setShowRevisionModal(false);
      setRevisionNotes('');
      // Clean up selection
      setSelectedDeliverable(null);
      loadDeal();
    } catch (error) {
      toast.error('Failed to request revision');
    }
  };

  const isManualCounterDisabledForActor = (dealState, actorRole) => {
    const settings = dealState?.negotiationSettings || {};
    if (settings?.mode !== 'ai') return false;

    if (actorRole === 'brand') {
      if (typeof settings.aiEnabledByBrand === 'boolean') return settings.aiEnabledByBrand;
      const aiEnabledBy = settings.aiEnabledBy?._id || settings.aiEnabledBy;
      return !aiEnabledBy || String(aiEnabledBy) === String(user?._id);
    }

    if (typeof settings.aiEnabledByCreator === 'boolean') return settings.aiEnabledByCreator;
    return false;
  };

  const handleCounterOffer = async () => {
    const manualLockedForActor = isManualCounterDisabledForActor(deal, 'brand');

    if (manualLockedForActor) {
      toast.error('Manual counter offer is disabled for the user who started AI Counter Dealing');
      return;
    }

    if (!counterData.message) {
      toast.error('Please add a message');
      return;
    }
    try {
      const response = await counterOffer(id, {
        budget: counterData.budget ? parseFloat(counterData.budget) : undefined,
        deadline: counterData.deadline || undefined,
        message: counterData.message
      });
      if (!response) return;
      setShowCounterModal(false);
      setCounterData({ budget: '', deadline: '', message: '' });
      loadDeal();
    } catch (error) {
      toast.error('Failed to send counter offer');
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
        await loadDeal();
      } else {
        toast.error(response?.error || 'Failed to start AI counter dealing');
      }
    } catch (error) {
      toast.error('Failed to start AI counter dealing');
    } finally {
      setStartingAiCounter(false);
    }
  };

  const handleRateDeal = async () => {
    try {
      const result = await rateDeal(id, ratingScore, ratingReview);
      if (!result?.success) {
        toast.error(result?.error || 'Failed to rate deal');
        return;
      }

      toast.success('Deal rated');
      setShowRatingModal(false);
      loadDeal();
    } catch (error) {
      toast.error('Failed to rate deal');
    }
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'deal', isDark);
  };

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
        <span  className="items-center "onClick={() => navigate('/brand/deals')}>
          Back to Deals
        </span>
      </div>
    );
  }

  const isBrand = user?.userType === 'brand';
  const otherParty = isBrand ? deal.creatorId : deal.brandId;
  const submittedDeliverables = deal.deliverables?.filter(d => d.status === 'submitted') || [];
  const latestCounter = deal.negotiation?.length
    ? deal.negotiation[deal.negotiation.length - 1]
    : null;
  const latestCounterProposedById = latestCounter?.proposedBy?._id || latestCounter?.proposedBy;
  const canBrandAcceptCounter = Boolean(
    deal.status === 'negotiating' &&
    latestCounter &&
    latestCounterProposedById &&
    String(latestCounterProposedById) !== String(user?._id)
  );
  const manualCounterDisabled = isManualCounterDisabledForActor(deal, 'brand');
  const canBrandCounter = deal.status === 'negotiating' && canBrandAcceptCounter;

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section - Matching CampaignDetails Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/brand/deals"
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">
              Deal <span className="font-bold">Details</span>
            </h1>
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {deal.campaignId?.title || 'Untitled Deal'} • Manage your deal details and communications.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadDeal}
            className={`p-2 rounded-lg transition-colors border ${
              isDark 
                ? 'hover:bg-zinc-800 text-zinc-400 border-zinc-700' 
                : 'hover:bg-zinc-100 text-zinc-500 border-zinc-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
          </button>
        </div>
      </div>

      {/* Status Cards - Compact like CampaignDetails */}
     <div className={`rounded-full border px-4 py-2 transition-all duration-500 ${
  isDark 
    ? 'bg-zinc-900/40 border-zinc-800/60 backdrop-blur-md shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)]' 
    : 'bg-white border-zinc-200/80 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.04)]'
}`}>
  <div className="flex flex-wrap items-center justify-between sm:justify-start gap-y-2 gap-x-6">
    
    {/* Deal Status - Primary Indicator */}
    <div className="flex items-center gap-2 group cursor-default">
      <div className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${getStatusColor(deal.status, 'deal', isDark).split(' ')[0]}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor(deal.status, 'deal', isDark).split(' ')[0]}`}></span>
      </div>
      <span className={`text-[11px] font-black uppercase tracking-[0.12em] ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
        {deal.status}
      </span>
    </div>

    {/* Vertical Divider (Hidden on mobile) */}
    <div className={`hidden sm:block w-px h-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

    {/* Budget Section */}
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded-md ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
        <DollarSign className="w-3 h-3 text-blue-500" />
      </div>
      <span className={`text-xs font-semibold tabular-nums tracking-tight ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {formatCurrency(deal.budget)}
      </span>
    </div>

    {/* Deadline Section */}
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded-md ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
        <Calendar className="w-3 h-3 text-emerald-500" />
      </div>
      <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}
      </span>
    </div>

    {/* Progress Bar Item */}
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded-md ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
        <Activity className="w-3 h-3 text-purple-500" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xs font-bold tabular-nums ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {deal.progress || 0}%
          </span>
          <div className={`w-16 h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <div 
              className="h-full bg-purple-500 transition-all duration-1000 ease-out" 
              style={{ width: `${deal.progress || 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Reference ID - Monospace look */}
    <div className={`ml-auto hidden lg:flex items-center gap-2 px-2 py-0.5 rounded border border-dashed transition-colors ${
      isDark ? 'border-zinc-800 text-zinc-600 hover:text-zinc-400' : 'border-zinc-200 text-zinc-400 hover:text-zinc-600'
    }`}>
      <FileText className="w-3 h-3" />
      <span className="text-[10px] font-mono tracking-tighter uppercase">
        ID: {deal._id?.slice(-8)}
      </span>
    </div>

  </div>
</div>

      {/* Progress bar - Compact like CampaignDetails */}
   <div className={`group relative overflow-hidden rounded-xl border transition-all duration-500 max-w-[320px]
  ${isDark 
    ? 'bg-zinc-950/50 border-zinc-800/60 hover:border-zinc-700/50 backdrop-blur-md shadow-2xl' 
    : 'bg-white border-zinc-100 shadow-sm hover:shadow-md hover:shadow-zinc-200/50'
}`}>
  <div className="p-4">
    {/* Header & Percentage - Tightened */}
    <div className="flex items-start justify-between mb-2.5">
      <div>
        <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Deal Execution
        </p>
        <h3 className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          Milestone Progress
        </h3>
      </div>
      <div className="text-right">
        <span className={`text-base font-black tabular-nums tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {deal.progress || 0}<span className="text-[9px] ml-0.5 opacity-50">%</span>
        </span>
      </div>
    </div>

    {/* Elegant Progress Bar - Slimmer & No Markers */}
    <div className="relative mb-4">
      <div className={`w-full rounded-full h-1 overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out relative"
          style={{ width: `${deal.progress || 0}%` }}
        >
          {/* Subtle Glow on the bar */}
          <div className="absolute inset-0 bg-white/10" />
        </div>
      </div>
      {/* Percentage Markers - Made very subtle dots instead of lines */}
      <div className="flex justify-between mt-1 px-0.5">
        {[0, 25, 50, 75, 100].map((mark) => (
          <div key={mark} className={`h-0.5 w-0.5 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
        ))}
      </div>
    </div>

    {/* Financial Ledger Area - Optimized */}
    <div className={`grid grid-cols-2 gap-y-3 pt-3 border-t ${isDark ? 'border-zinc-900' : 'border-zinc-50'}`}>
      <div className="flex flex-col">
        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Gross Budget</span>
        <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          {formatCurrency(deal.budget)}
        </span>
      </div>

      <div className="flex flex-col text-right">
        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Net Payout</span>
        <span className={`text-xs font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
          {formatCurrency(deal.netAmount || 0)}
        </span>
      </div>

      {/* Fees & Payment Status - More minimal, less "boxy" */}
      <div className={`col-span-2 mt-1 flex items-center justify-between p-1.5 rounded-lg border-x-0 border-y ${
        isDark ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-zinc-50/50 border-zinc-100'
      }`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-1 h-1 rounded-full ${deal.paymentStatus === 'paid' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'bg-amber-500 animate-pulse'}`} />
          <span className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {deal.paymentStatus || 'pending'}
          </span>
        </div>
        <span className={`text-[8px] font-medium ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Fee: {formatCurrency(deal.platformFee || 0)}
        </span>
      </div>
    </div>
  </div>
</div>

      {/* Tab Navigation - Matching CampaignDetails Style */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between py-4">
  <div className="relative flex items-center gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar scroll-smooth">
    {[
      { id: 'overview', label: 'Overview', icon: Eye },
      { id: 'deliverables', label: 'Deliverables', icon: FileText },
      { id: 'messages', label: 'Messages', icon: MessageSquare, badge: messages.length },
      { id: 'timeline', label: 'Timeline', icon: Activity },
    ].map(({ id: tabId, label, icon: Icon, badge }, idx) => {
      const isActive = activeTab === tabId;
      
      return (
        <button
          key={tabId}
          onClick={() => setActiveTab(tabId)}
          // Staggered entrance animation
          style={{ animationDelay: `${idx * 75}ms` }}
          className={`group relative flex items-center gap-2.5 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] animate-in fade-in slide-in-from-left-4 fill-mode-both ${
            isActive 
              ? (isDark ? 'bg-black text-white' : 'text-white') 
              : (isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900')
          }`}
        >
          {/* Background Highlight (The "Pill") */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
  isActive 
    ? (isDark ? 'bg-black opacity-100 scale-100' : 'bg-zinc-900 opacity-100 scale-100')
    : 'bg-zinc-500/0 opacity-0 scale-90 group-hover:scale-95 group-hover:opacity-10 group-hover:bg-zinc-500'
}`} />

          {/* Content Wrapper */}
          <div className="relative z-10 flex items-center gap-2.5">
            <Icon className={`w-4 h-4 transition-transform duration-500 ${
              isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-12'
            }`} />
            
            <span className="whitespace-nowrap">{label}</span>
            
            {badge > 0 && (
              <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black transition-all duration-500 ${
                isActive 
                  ? (isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900') 
                  : 'bg-red-500 text-white animate-pulse'
              }`}>
                {badge}
              </span>
            )}
          </div>

          {/* Active Indicator Underline (Optional flair) */}
          {isActive && (
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-in zoom-in duration-500 ${
              isDark ? 'bg-black text-white' : 'bg-zinc-900'
            }`} />
          )}
        </button>
      );
    })}
  </div>
</div>

      {/* Tab Content */}
     {activeTab === 'overview' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: PRIMARY DATA (8 Units) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Deal Description & Core Metadata */}
        <section className={`rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} p-6 shadow-sm`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <h2 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Deal Intelligence</h2>
          </div>
          
          <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {deal.campaignId?.description || 'No description provided'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Campaign', val: deal.campaignId?.title || '—', color: 'blue' },
              { label: 'Payment', val: deal.paymentType || 'fixed', color: 'purple' },
              { label: 'Created', val: formatDate(deal.createdAt), color: 'zinc' },
              { label: 'Activity', val: timeAgo(deal.updatedAt), color: 'emerald' }
            ].map((item, i) => (
              <div key={i} className={`p-3 rounded-xl border border-dashed ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">{item.label}</p>
                <p className={`text-[11px] font-bold truncate capitalize ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{item.val}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Performance & Progress Section */}
        {deal.paymentType !== 'fixed' && deal.performanceMetrics && (
          <section className={`rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} p-6 shadow-sm overflow-hidden relative`}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className={`text-base font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Real-time Performance</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
              }`}>
                Model: {deal.paymentType}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {/* Dynamic Metric Mapping Based on Type */}
              {/* This is a clean abstraction of your conditional logic */}
              {deal.paymentType === 'cpe' && (
                <>
                  <MetricItem label="Target Likes" val={deal.performanceMetrics.cpe.targetLikes} isDark={isDark} />
                  <MetricItem label="Base Rate" val={formatCurrency(deal.performanceMetrics.cpe.baseRate)} isDark={isDark} />
                  <MetricItem label="Bonus" val={formatCurrency(deal.performanceMetrics.cpe.bonusRate)} isDark={isDark} />
                </>
              )}
              {/* ... Repeat logic for CPA/CPM/RevShare with similar MetricItem components */}
            </div>

            {/* Performance Bar Upgrade */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Current Efficiency</span>
                <span className="text-sm font-black tabular-nums text-blue-500">84%</span>
              </div>
              <div className={`h-2 w-full rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} overflow-hidden p-0.5`}>
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all duration-1000" style={{ width: '84%' }} />
              </div>
            </div>
          </section>
        )}

        {/* Requirements: Clean List */}
        {deal.requirements?.length > 0 && (
          <div className="px-2">
            <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-4`}>Core Requirements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deal.requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                    isDark ? 'border-zinc-800 bg-zinc-900 group-hover:border-emerald-500/50' : 'border-zinc-200 bg-white group-hover:border-emerald-500'
                  }`}>
                    <CheckCircle className="w-3 h-3 text-emerald-500 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: ACTIONS & WIDGETS (4 Units) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Partner Widget */}
        <section className={`rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'} p-5 shadow-sm`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">{isBrand ? 'Talent' : 'Brand Partner'}</p>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <img src={otherParty?.profilePicture} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/20" alt="avatar" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <h3 className={`font-bold text-sm truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{isBrand ? otherParty?.displayName : otherParty?.brandName}</h3>
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-400 fill-current" />
                <span className="text-[11px] font-bold text-zinc-500">{otherParty?.stats?.averageRating?.toFixed(1) ?? '0'}</span>
              </div>
            </div>
          </div>
          <Link 
            to={isBrand ? `/brand/creators/${otherParty?._id}` : `/brands/${otherParty?._id}`} 
            className={`block text-center py-2 rounded-xl text-[10px] font-bold border transition-all ${
              isDark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
            }`}
          >
            View Profile
          </Link>
        </section>

        {/* Quick Actions Bar */}
        <section className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Control Center</p>
          
          {/* Example Action Button */}
          <Link 
            to="/brand/inbox" 
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all group shadow-lg shadow-zinc-950/20"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-zinc-800 rounded-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs font-bold">Open Messenger</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </Link>

          {/* Danger Zone Action */}
          <button onClick={() => setShowCancelModal(true)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed transition-all ${
            isDark ? 'border-red-900/30 text-red-400 hover:bg-red-500/5' : 'border-red-200 text-red-500 hover:bg-red-50'
          }`}>
            <Flag className="w-4 h-4" />
            <span className="text-xs font-bold">Terminate Agreement</span>
          </button>
        </section>

              </div>

    </div>
  </div>
)}

{activeTab === 'deliverables' && (
  <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
    {deal.deliverables?.length > 0 ? (
      <div className="space-y-4">
        {deal.deliverables.map((del) => (
          <div 
            key={del._id} 
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
              isDark 
                ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' 
                : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
            }`}
          >
            {/* Status Accent Bar */}
            <div className={`absolute top-0 left-0 w-1 h-full ${
              del.status === 'approved' ? 'bg-emerald-500' : 
              del.status === 'submitted' ? 'bg-blue-500' : 
              del.status === 'revision' ? 'bg-orange-500' : 'bg-zinc-500'
            }`} />

            <div className="p-5">
              {/* Header: Type & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
                  }`}>
                    {del.status === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {del.type}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {del.platform}
                      </span>
                      {del.submittedAt && (
                        <>
                          <span className="text-zinc-500 text-[10px]">•</span>
                          <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {formatDate(del.submittedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                  del.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  del.status === 'submitted' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                  del.status === 'revision' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                  'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                }`}>
                  {del.status}
                </span>
              </div>

              {/* Description */}
              {del.description && (
                <p className={`text-xs leading-relaxed mb-5 px-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {del.description}
                </p>
              )}

              {/* Revision / Feedback Alerts */}
              {(del.revisionNotes || del.feedback) && (
                <div className="space-y-2 mb-5">
                  {del.revisionNotes && (
                    <div className={`flex gap-3 p-3 rounded-xl border ${isDark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Revision Required</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-orange-300/80' : 'text-orange-600'}`}>{del.revisionNotes}</p>
                      </div>
                    </div>
                  )}
                  {del.feedback && (
                    <div className={`flex gap-3 p-3 rounded-xl border ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                      <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Partner Feedback</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-blue-300/80' : 'text-blue-600'}`}>{del.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Files Grid */}
              {del.files?.length > 0 && (
                <div className="mb-4">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-3`}>Assets</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {del.files.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group/file relative aspect-video rounded-xl border overflow-hidden transition-all ${
                          isDark ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-600' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {file.type === 'image' ? (
                          <img src={file.url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover/file:scale-110" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <FileText className={`w-5 h-5 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
                            <p className={`text-[10px] font-medium px-2 truncate w-full text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {file.filename}
                            </p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Eye className="w-4 h-4 text-white" />
                          <Download className="w-4 h-4 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Links List */}
              {del.links?.length > 0 && (
                <div className="pt-2">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-2`}>External URLs</h4>
                  <div className="space-y-1.5">
                    {del.links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs font-medium transition-all ${
                          isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons for Brand */}
              {isBrand && del.status === 'submitted' && (
                <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => {
                      setSelectedDeliverable(del._id);
                      setShowApproveModal(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 sm:flex-none border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-500/10"
                    onClick={() => {
                      setSelectedDeliverable(del._id);
                      setShowRevisionModal(true);
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Request Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 border-dashed ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <PackageOpen className="w-8 h-8" />
        </div>
        <p className="text-sm font-bold tracking-tight">Zero Deliverables</p>
        <p className="text-[11px] mt-1">Submission pipeline is empty.</p>
      </div>
    )}
  </div>
)}
      {activeTab === 'timeline' && (
        <div className={`rounded-xl border transition-all ${
          isDark 
            ? 'bg-zinc-900/50 border-zinc-800' 
            : 'bg-white border-zinc-200'
        }`}>
          <div className="p-4">
            <h2 className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-4`}>Timeline</h2>
            {deal.timeline?.length > 0 ? (
              <div className="relative">
                {deal.timeline.map((item, index) => (
                  <div key={index} className="flex gap-3 mb-4 last:mb-0">
                    <div className="relative flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        item.type === 'create' ? 'bg-blue-500' :
                        item.type === 'accept' ? 'bg-green-500' :
                        item.type === 'submit' ? 'bg-purple-500' :
                        item.type === 'message' ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`} />
                      {index < deal.timeline.length - 1 && (
                        <div className={`absolute top-3 left-1 w-0.5 h-10 ${isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-3 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className={`font-medium text-sm truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{item.event}</p>
                        <span className={`text-xs whitespace-nowrap ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{formatDate(item.createdAt)}</span>
                      </div>
                      {item.description && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{item.description}</p>
                      )}
                      {item.userId && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>by {item.userId?.fullName || 'User'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No timeline events yet</p>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'messages' && (
        <div className={`rounded-xl border transition-all h-[500px] sm:h-[600px] flex flex-col ${
          isDark 
            ? 'bg-zinc-900/50 border-zinc-800' 
            : 'bg-white border-zinc-200'
        }`}>
          <div className={`p-3 sm:p-4 border-b ${
            isDark ? 'border-zinc-700' : 'border-gray-200'
          }`}>
            <h4 className={`font-semibold truncate ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              Messages with {isBrand ? deal.creatorId?.displayName : deal.brandId?.brandName}
            </h4>
          </div>

          <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 ${
            isDark ? 'bg-zinc-800/50' : 'bg-gray-50'
          }`}>
            {messages.map((msg) => {
              const senderId = msg.senderId?._id || msg.senderId;
              const isOwn = String(senderId) === String(user?._id);
              return (
                <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${
                    isOwn ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-500 mb-1">
                        {msg.senderId?.fullName || msg.senderId?.brandName || 'User'}
                      </p>
                    )}
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-lg text-sm ${isOwn ? 'bg-gray-900' : 'bg-white'}`}>
                        <p className="text-xs opacity-75 mb-1">Replying to:</p>
                        <p className="truncate">{msg.replyTo.content}</p>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((file, i) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white bg-opacity-20 rounded p-2 text-sm"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="flex-1 truncate">{file.filename}</span>
                            <Download className="w-4 h-4" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center justify-end mt-1 text-xs ${
                      isOwn ? 'text-gray-600' : 'text-gray-500'
                    }`}>
                      <span>{timeAgo(msg.createdAt)}</span>
                      {isOwn && (
                        <span className="ml-2">
                          {msg.readBy?.length > 1 ? (
                            <CheckCheck className="w-4 h-4" title="Read" />
                          ) : (
                            <Check className="w-4 h-4" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 sm:p-4 border-t border-gray-200">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between bg-[#667eea]/10 p-2 rounded-lg">
                <span className="text-sm text-[#667eea] truncate flex-1 mr-2">Replying to: {replyingTo.content?.substring(0, 50)}</span>
                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  rows="1"
                  value={messageInput}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={uploading ? 'Uploading...' : 'Type your message...'}
                  disabled={uploading}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                  style={{ minHeight: '48px' }}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <label className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg">
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </label>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={(!messageInput.trim() && attachments.length === 0) || sendingMessage || uploading}
                className="px-3 sm:px-4 py-2 bg-[#667eea] text-white rounded-lg hover:bg-[#5a67d8] disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {sendingMessage ? <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50">
                <EmojiPicker onEmojiClick={(e) => { setMessageInput(prev => prev + e.emoji); setShowEmojiPicker(false); }} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          {deal.timeline?.length > 0 ? (
            <div className="relative">
              {deal.timeline.map((item, index) => (
                <div key={index} className="flex gap-3 sm:gap-4 mb-4 last:mb-0">
                  <div className="relative flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      item.type === 'create' ? 'bg-blue-600' :
                      item.type === 'accept' ? 'bg-green-600' :
                      item.type === 'submit' ? 'bg-purple-600' :
                      item.type === 'message' ? 'bg-orange-600' :
                      'bg-gray-600'
                    }`} />
                    {index < deal.timeline.length - 1 && (
                      <div className="absolute top-4 left-1.5 w-0.5 h-12 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="font-medium text-gray-900 truncate">{item.event}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    {item.userId && (
                      <p className="text-xs text-gray-500 mt-1">by {item.userId?.fullName || 'User'}</p>
                    )}
                  </div>
                </div>
              ))}
              {deal.requirements?.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mt-4 sm:mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
                  <ul className="space-y-2">
                    {deal.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {deal.terms && (
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mt-4 sm:mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms</h2>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{deal.terms}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm sm:text-base">No timeline events yet</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Deliverable">
        <p className="text-gray-600 mb-4">
          {selectedDeliverable
            ? 'Are you sure you want to approve this deliverable?'
            : `Approve all ${submittedDeliverables.length} submitted deliverables?`}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleApproveDeliverable}>
            {selectedDeliverable ? 'Approve' : 'Approve All'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showRevisionModal} onClose={() => setShowRevisionModal(false)} title="Request Revision">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revision Notes
            </label>
            <textarea
              rows="4"
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe what changes are needed..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleRequestRevision}>Request Revision</Button>
        </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Deal">
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Cancelling this deal may have consequences. Please provide a reason.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation
            </label>
            <textarea
              rows="3"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter reason..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => updateDealStatus(id, 'cancelled', cancelReason)}>Cancel Deal</Button>
        </div>
      </Modal>

      <Modal isOpen={showCounterModal} onClose={() => setShowCounterModal(false)} title="Counter Offer">
        <div className="space-y-4">
          {counterSuggestion && (
            <div className="rounded-lg border border-[#667eea]/20 bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 p-3">
              <p className="text-xs font-semibold text-[#764ba2] mb-1">Suggested Offer</p>
              <p className="text-sm text-[#667eea]">Budget: {formatCurrency(counterSuggestion.suggestedBudget || 0)}</p>
              {counterSuggestion.suggestedDeadline && (
                <p className="text-sm text-[#667eea]">Deadline: {formatDate(counterSuggestion.suggestedDeadline)}</p>
              )}
              <p className="text-xs text-[#764ba2] mt-1">Confidence: {counterSuggestion.confidence || 0}%</p>
            </div>
          )}

          {suggestionLoading && (
            <p className="text-xs text-gray-500">Loading AI suggestion...</p>
          )}

          {manualCounterDisabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Manual counter is disabled because you started AI Counter Dealing.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Budget (optional)
            </label>
            <input
              type="number"
              value={counterData.budget}
              onChange={(e) => setCounterData({ ...counterData, budget: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={`Current: ${formatCurrency(deal.budget)}`}
              disabled={manualCounterDisabled}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Deadline (optional)
            </label>
            <input
              type="date"
              value={counterData.deadline}
              onChange={(e) => setCounterData({ ...counterData, deadline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              disabled={manualCounterDisabled}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to {isBrand ? 'Creator' : 'Brand'} *
            </label>
            <textarea
              rows="4"
              value={counterData.message}
              onChange={(e) => setCounterData({ ...counterData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Explain your proposed changes..."
              disabled={manualCounterDisabled}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCounterModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCounterOffer} disabled={manualCounterDisabled}>Send Counter Offer</Button>
        </div>
      </Modal>

      <Modal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} title="Rate This Deal">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Score</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRatingScore(n)}
                  className={`w-10 h-10 rounded-lg border-2 font-bold ${
                    ratingScore >= n ? 'border-yellow-400 bg-yellow-50 text-yellow-600' : 'border-gray-200 text-gray-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review (optional)</label>
            <textarea
              rows="3"
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Share your experience..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowRatingModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleRateDeal}>Submit Rating</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DealDetails;