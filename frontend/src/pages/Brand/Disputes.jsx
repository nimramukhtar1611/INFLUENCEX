// pages/Brand/Disputes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import {
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Filter,
  Search,
  Plus,
  ChevronRight,
  User,
  Flag,
  ThumbsUp,
  X,
  ArrowLeft,
  ArrowUpRight,
  Shield,
  Scale,
  Target,
  Handshake,
  Building2,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import disputeService from '../../services/disputeService'; // assume exists
import dealService from '../../services/dealService';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Input from '../../components/UI/Input';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';

const Disputes = () => {
  const { theme } = useTheme();

  // Add custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hover::-webkit-scrollbar {
        width: 6px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .scrollbar-hover::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-hover::-webkit-scrollbar-thumb {
        background: ${theme === 'dark' ? '#374151' : '#d1d5db'};
        border-radius: 3px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .scrollbar-hover:hover::-webkit-scrollbar {
        opacity: 1;
      }
      .scrollbar-hover:hover::-webkit-scrollbar-thumb {
        opacity: 1;
      }
      .scrollbar-hover:hover::-webkit-scrollbar-thumb:hover {
        background: ${theme === 'dark' ? '#4b5563' : '#9ca3af'};
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [theme]);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewDisputeModal, setShowNewDisputeModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newDisputeData, setNewDisputeData] = useState({
    dealId: '',
    type: 'deliverables',
    title: '',
    description: '',
    evidence: [],
    priority: 'medium'
  });
  const [userDeals, setUserDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  useEffect(() => {
    fetchDisputes();
    fetchUserDeals();
  }, []);

  useEffect(() => {
    if (disputes) {
      let filtered = [...disputes];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(d =>
          d.title?.toLowerCase().includes(query) ||
          d.campaignId?.title?.toLowerCase().includes(query) ||
          d.raisedBy?.userId?.fullName?.toLowerCase().includes(query)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(d => d.status === statusFilter);
      }
      if (priorityFilter !== 'all') {
        filtered = filtered.filter(d => d.priority === priorityFilter);
      }
      setFilteredDisputes(filtered);
    }
  }, [disputes, searchQuery, statusFilter, priorityFilter]);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await disputeService.getUserDisputes(); // assume endpoint
      if (res?.success) {
        setDisputes(res.disputes || []);
      } else {
        toast.error(res?.error || 'Failed to load disputes');
      }
    } catch (error) {
      console.error('Fetch disputes error:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async () => {
    if (!messageInput.trim() || !selectedDispute) return;
    setSendingMessage(true);
    try {
      // Properly format the message as an object
      const messageData = {
        content: messageInput.trim(),
        disputeId: selectedDispute._id
      };
      const res = await disputeService.addMessage(selectedDispute._id, messageData);
      if (res?.success) {
        setMessageInput('');
        // update selected dispute with new message
        const updated = { ...selectedDispute, messages: [...(selectedDispute.messages || []), res.message] };
        setSelectedDispute(updated);
        // also update list
        setDisputes(prev => prev.map(d => d._id === updated._id ? updated : d));
        toast.success('Message added');
      } else {
        toast.error(res?.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchUserDeals = async () => {
    setDealsLoading(true);
    try {
      const res = await dealService.getBrandDeals('all', 1, 50);
      if (res?.success) {
        setUserDeals(res.deals || []);
      } else {
        console.error('Failed to fetch deals:', res?.error);
      }
    } catch (error) {
      console.error('Fetch deals error:', error);
    } finally {
      setDealsLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!newDisputeData.title || !newDisputeData.description) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const res = await disputeService.createDispute(newDisputeData);
      if (res?.success) {
        toast.success('Dispute raised successfully');
        setShowNewDisputeModal(false);
        setNewDisputeData({
          dealId: '',
          type: 'deliverables',
          title: '',
          description: '',
          evidence: [],
          priority: 'medium'
        });
        fetchDisputes();
      } else {
        toast.error(res?.error || 'Failed to raise dispute');
      }
    } catch (error) {
      toast.error('Failed to raise dispute');
    }
  };

  const handleResolveDispute = async (disputeId) => {
    if (!disputeId) return;
    
    // Ask user to choose resolution type
    const resolutionType = window.prompt(
      'How are you resolving this dispute?\n\n1. As Admin (official resolution)\n2. As Party Involved (mutual agreement)\n\nEnter 1 or 2:',
      '1'
    );
    
    if (!resolutionType || (resolutionType !== '1' && resolutionType !== '2')) {
      return;
    }
    
    try {
      const isAdminResolution = resolutionType === '1';
      const res = isAdminResolution 
        ? await disputeService.updateDisputeStatus(disputeId, { 
            status: 'resolved',
            notes: 'Dispute resolved by admin decision'
          })
        : await disputeService.updateDisputeStatus(disputeId, { 
            status: 'resolved',
            notes: 'Dispute resolved by mutual agreement'
          });
          
      if (res?.success) {
        toast.success(`Dispute resolved successfully${isAdminResolution ? ' as admin' : ' by mutual agreement'}`);
        setShowDetailsModal(false);
        fetchDisputes();
      } else {
        toast.error(res?.error || 'Failed to resolve dispute');
      }
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', isDark);
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'deliverables': return FileText;
      case 'payment': return AlertCircle;
      case 'contract': return FileText;
      case 'communication': return MessageSquare;
      default: return AlertCircle;
    }
  };

  const inputClasses = `w-full px-3 py-2 text-xs rounded-lg border focus:outline-none transition-all ${
    isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-500 text-white' : 'bg-white border-zinc-200 focus:border-black text-black'
  }`;

  const selectClasses = `px-3 py-2 text-xs rounded-lg border focus:outline-none transition-all ${
    isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-500 text-white' : 'bg-white border-zinc-200 focus:border-black text-black'
  }`;

  const cardClasses = `p-6 rounded-2xl border transition-all ${
    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'
  }`;

  const statCardClasses = `
    group p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
    cursor-default hover:scale-[1.02]
    ${isDark 
      ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
  `;

   if (loading && disputes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-500 text-xs font-medium">Loading disputes...</p>
          </div>
        </div>
      );
    }

  return (
    <div className={`max-w-6xl mx-auto p-6 space-y-8 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-semibold tracking-tight">Disputes & <span className="font-bold">Resolution</span></h1>
          <p className="text-sm text-zinc-500">Manage and resolve disputes between parties</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={statCardClasses}>
          <div className="flex justify-between items-start mb-4">
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
            `}>
              <AlertCircle size={18} strokeWidth={2.5} />
            </div>
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              ${disputes.filter(d => d.status === 'open').length > 0 
                ? 'text-red-500 bg-red-500/5' 
                : 'text-zinc-400 bg-zinc-500/5'}
            `}>
              {disputes.filter(d => d.status === 'open').length} active
            </span>
          </div>
          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Open Disputes
            </h3>
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {disputes.filter(d => d.status === 'open').length}
            </p>
          </div>
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>

        <div className={statCardClasses}>
          <div className="flex justify-between items-start mb-4">
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-black' 
                : 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white shadow-sm'}
            `}>
              <Clock size={18} strokeWidth={2.5} />
            </div>
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              ${disputes.filter(d => d.status === 'in-progress').length > 0 
                ? 'text-yellow-500 bg-yellow-500/5' 
                : 'text-zinc-400 bg-zinc-500/5'}
            `}>
              {disputes.filter(d => d.status === 'in-progress').length} pending
            </span>
          </div>
          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              In Progress
            </h3>
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {disputes.filter(d => d.status === 'in-progress').length}
            </p>
          </div>
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>

        <div className={statCardClasses}>
          <div className="flex justify-between items-start mb-4">
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-green-400 group-hover:bg-green-500 group-hover:text-black' 
                : 'bg-green-50 text-green-600 group-hover:bg-green-500 group-hover:text-white shadow-sm'}
            `}>
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              ${disputes.filter(d => d.status === 'resolved').length > 0 
                ? 'text-green-500 bg-green-500/5' 
                : 'text-zinc-400 bg-zinc-500/5'}
            `}>
              {disputes.filter(d => d.status === 'resolved').length} closed
            </span>
          </div>
          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Resolved
            </h3>
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {disputes.filter(d => d.status === 'resolved').length}
            </p>
          </div>
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>

        <div className={statCardClasses}>
          <div className="flex justify-between items-start mb-4">
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-red-400 group-hover:bg-red-500 group-hover:text-black' 
                : 'bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white shadow-sm'}
            `}>
              <Flag size={18} strokeWidth={2.5} />
            </div>
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              ${disputes.filter(d => d.priority === 'high').length > 0 
                ? 'text-red-500 bg-red-500/5' 
                : 'text-zinc-400 bg-zinc-500/5'}
            `}>
              {disputes.filter(d => d.priority === 'high').length} urgent
            </span>
          </div>
          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              High Priority
            </h3>
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {disputes.filter(d => d.priority === 'high').length}
            </p>
          </div>
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className={cardClasses}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <input
              type="text"
              placeholder="Search disputes..."
              className={inputClasses + ' pl-10'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClasses}
            >
              <option className="!bg-black text-white" value="all">All Status</option>
              <option className="!bg-black text-white" value="open">Open</option>
              <option className="!bg-black text-white" value="in-progress">In Progress</option>
              <option className="!bg-black text-white" value="resolved">Resolved</option>
              <option className="!bg-black text-white" value="closed">Closed</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={selectClasses}
            >
              <option className="!bg-black text-white" value="all">All Priority</option>
              <option className="!bg-black text-white" value="high">High</option>
              <option className="!bg-black text-white" value="medium">Medium</option>
              <option className="!bg-black text-white" value="low">Low</option>
            </select>
            
            <button
              onClick={() => setShowNewDisputeModal(true)}
              className={`
                relative px-8 py-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] 
                transition-all duration-300 shadow-xl overflow-hidden
                hover:scale-105 active:scale-95 hover:shadow-2xl
                ${isDark ? 'bg-white text-black border border-white' : 'bg-black text-white border border-black'}
              `}
            >
              <span className="flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                Raise Dispute
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Disputes List - Table Style */}
      <div className="relative overflow-hidden">
        {filteredDisputes.length > 0 ? (
          <div className="space-y-4">
            {/* Header Row */}
            <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <div className="col-span-4">Case & Parties</div>
              <div className="col-span-2 text-center">Priority</div>
              <div className="col-span-3 text-center">Resolution Status</div>
              <div className="col-span-2 text-center">Activity</div>
              <div className="col-span-1 text-right">View</div>
            </div>

            {/* Dispute Rows */}
            {filteredDisputes.map((dispute) => {
              const TypeIcon = getTypeIcon(dispute.type);
              return (
                <div 
                  key={dispute._id}
                  onClick={() => {
                    setSelectedDispute(dispute);
                    setShowDetailsModal(true);
                  }}
                  className={`
                    group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2.5rem] border 
                    transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
                    ${isDark 
                      ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                      : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
                  `}
                >
                  {/* Primary Info: Case Title & Icon */}
                  <div className="col-span-4 flex items-center gap-5">
                    <div className={`
                      w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border transition-all duration-500
                      ${dispute.type === 'deliverables' ? 'bg-orange-500/10 border-orange-500/20' :
                        dispute.type === 'payment' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-blue-500/10 border-blue-500/20'}
                    `}>
                      <TypeIcon className={`w-5 h-5 ${
                        dispute.type === 'deliverables' ? 'text-orange-600' :
                        dispute.type === 'payment' ? 'text-red-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {dispute.title}
                      </span>
                      <span className={`text-[11px] font-medium mt-1 uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Deal: {dispute.deal_id?._id?.slice(-6) || 'N/A'} • {dispute.deal_id?.creatorId?.displayName || dispute.deal_id?.creatorId?.fullName || 'Creator'} • ${formatCurrency(dispute.deal_id?.budget || 0)}
                      </span>
                      <span className={`text-[10px] font-medium mt-1 uppercase tracking-wider block ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        Campaign: {dispute.deal_id?.campaignId?.title || dispute.campaignId?.title || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Priority: High-Contrast Badge */}
                  <div className="col-span-2 mt-4 md:mt-0 text-center">
                    <span className={`
                      inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border
                      ${dispute.priority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        dispute.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-green-500/10 text-green-500 border-green-500/20'}
                    `}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
                      {dispute.priority}
                    </span>
                  </div>

                  {/* Status: Active Phase Pill */}
                  <div className="col-span-3 mt-4 md:mt-0 flex justify-center">
                    <span className={`
                      inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border
                      transition-all duration-300 ${getStatusColorClass(dispute.status)}
                    `}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
                      {dispute.status}
                    </span>
                  </div>

                  {/* Activity: Messages & Timeline */}
                  <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black font-mono tracking-tighter text-zinc-500">
                          {dispute.messages?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black font-mono tracking-tighter text-zinc-500">
                          {timeAgo(dispute.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action: The Rotating Arrow Button */}
                  <div className="col-span-1 hidden md:flex justify-end">
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border
                      ${isDark 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:border-white' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-400 group-hover:bg-black group-hover:text-white group-hover:border-black shadow-sm'}
                      group-hover:rotate-45
                    `}>
                      <ArrowUpRight className="w-5 h-5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`
            group relative p-12 rounded-[2.5rem] border transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_30px_60px_rgba(0,0,0,0.3)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_30px_60px_rgba(0,0,0,0.03)]'}
          `}>
            {/* Decorative Background Pattern */}
            <div className={`
              absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700
              ${isDark 
                ? 'bg-gradient-to-br from-zinc-800/20 via-transparent to-zinc-800/20' 
                : 'bg-gradient-to-br from-zinc-50 via-transparent to-zinc-50'}
            `} />
            
            {/* Icon Container with Animation */}
            <div className={`
              relative w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center transition-all duration-500 transform
              ${isDark 
                ? 'bg-zinc-800/50 text-zinc-600 group-hover:bg-white group-hover:text-black group-hover:scale-110 group-hover:rotate-[-5deg]' 
                : 'bg-zinc-50 text-zinc-400 group-hover:bg-black group-hover:text-white group-hover:scale-110 group-hover:rotate-[-5deg]'}
            `}>
              <Shield size={32} strokeWidth={1.5} />
              
              {/* Subtle Glow Effect */}
              <div className={`
                absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
                ${isDark 
                  ? 'bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                  : 'bg-black/10 shadow-[0_0_30px_rgba(0,0,0,0.1)]'}
              `} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center space-y-4">
              <div>
                <h3 className={`
                  text-xl font-bold tracking-tight mb-2 transition-colors
                  ${isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900 group-hover:text-black'}
                `}>
                  No disputes found
                </h3>
                <p className={`
                  text-sm font-medium transition-colors max-w-md mx-auto
                  ${isDark ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-600'}
                `}>
                  Everything is running smoothly! If you encounter any issues with a deal, you can raise a dispute for resolution.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowNewDisputeModal(true)}
                className={`
                  inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] 
                  transition-all duration-300 shadow-xl overflow-hidden mx-auto
                  hover:scale-105 active:scale-95 hover:shadow-2xl
                  ${isDark ? 'bg-white text-black border border-white' : 'bg-black text-white border border-black'}
                `}
              >
                <Plus className="w-4 h-4" />
                Raise a Dispute
              </button>
            </div>

            {/* Decorative Elements */}
            <div className={`
              absolute top-8 right-8 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700
              ${isDark ? 'bg-zinc-600' : 'bg-zinc-300'}
            `} />
            <div className={`
              absolute bottom-8 left-8 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100
              ${isDark ? 'bg-zinc-600' : 'bg-zinc-300'}
            `} />
          </div>
        )}
      </div>

      {/* New Dispute Modal */}
      <Modal
        isOpen={showNewDisputeModal}
        onClose={() => setShowNewDisputeModal(false)}
        title="Raise a Dispute"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Deal <span className="text-red-500">*</span>
            </label>
            <select
              value={newDisputeData.dealId}
              onChange={(e) => setNewDisputeData({...newDisputeData, dealId: e.target.value})}
              className={selectClasses}
              disabled={dealsLoading}
            >
              <option className="!bg-black text-white" value="">
                {dealsLoading ? 'Loading deals...' : 'Select a deal'}
              </option>
              {userDeals.map(deal => (
                <option key={deal._id} className="!bg-black text-white" value={deal._id}>
                  Deal: {deal._id?.slice(-6) || 'N/A'} - {deal.creatorId?.displayName || deal.creatorId?.fullName || 'Creator'} - ${formatCurrency(deal.budget || 0)} (Campaign: {deal.campaignId?.title || 'N/A'})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dispute Type <span className="text-red-500">*</span>
            </label>
            <select
              value={newDisputeData.type}
              onChange={(e) => setNewDisputeData({...newDisputeData, type: e.target.value})}
              className={selectClasses}
            >
              <option className="!bg-black text-white" value="deliverables">Deliverables Issue</option>
              <option className="!bg-black text-white" value="payment">Payment Issue</option>
              <option className="!bg-black text-white" value="communication">Communication Issue</option>
              <option className="!bg-black text-white" value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              value={newDisputeData.priority}
              onChange={(e) => setNewDisputeData({...newDisputeData, priority: e.target.value})}
              className={selectClasses}
            >
              <option className="!bg-black text-white" value="low">Low</option>
              <option className="!bg-black text-white" value="medium">Medium</option>
              <option className="!bg-black text-white" value="high">High</option>
              <option className="!bg-black text-white" value="urgent">Urgent</option>
            </select>
          </div>
          
          <Input
            label="Dispute Title *"
            placeholder="Brief title for the dispute"
            value={newDisputeData.title}
            onChange={(e) => setNewDisputeData({...newDisputeData, title: e.target.value})}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="5"
              value={newDisputeData.description}
              onChange={(e) => setNewDisputeData({...newDisputeData, description: e.target.value})}
              className={inputClasses + ' resize-none'}
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
              isDark ? 'border-zinc-700' : 'border-zinc-300'
            }`}>
              <input type="file" multiple className="hidden" id="dispute-files" />
              <label htmlFor="dispute-files" className="cursor-pointer">
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Drag and drop files here, or <span className="text-blue-600">browse</span>
                </p>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'} mt-1`}>
                  Upload screenshots, contracts, or other evidence
                </p>
              </label>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            isDark ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-50'
          }`}>
            <p className={`text-sm ${
              isDark ? 'text-yellow-300' : 'text-yellow-800'
            }`}>
              <strong>Note:</strong> The other party will be notified and an admin will review your dispute within 24 hours.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowNewDisputeModal(false)}>
            Cancel
          </Button>
         <Button
  onClick={handleCreateDispute}
  style={{
    // Neutral variables jo system theme se connect ho saktay hain
    backgroundColor: 'var(--btn-bg, #18181b)', 
    color: 'var(--btn-text, #ffffff)',
    fontWeight: '600',
    borderRadius: '8px',
    padding: '10px 24px',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  }}
  // Hover effect ko CSS file mein dalna behtar hai, 
  // par agar inline hi rakhna hai toh ye logic best hai:
  onMouseEnter={(e) => {
    e.target.style.opacity = '0.8';
    e.target.style.transform = 'translateY(-1px)';
  }}
  onMouseLeave={(e) => {
    e.target.style.opacity = '1';
    e.target.style.transform = 'translateY(0)';
  }}
  variant='secondary'
>
  Submit Dispute
</Button>
        </div>
      </Modal>

      {/* Dispute Details Modal - Enhanced with Beautiful UI */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title=""
        size="xl"
      >
        {selectedDispute && (
          <div className={`space-y-6 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            
            {/* Header: Compact & Clean */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200'}`}>
                  {React.createElement(getTypeIcon(selectedDispute.type), {
                    className: `w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`
                  })}
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-none mb-1">
                    {selectedDispute.title || 'Your Deal Dispute'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500">#{selectedDispute._id?.slice(-8)}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${getStatusColorClass(selectedDispute.status)}`}>
                      {selectedDispute.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid: Minimalist 4-column */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Campaign', val: selectedDispute.campaign_id?.title, icon: Target },
                { label: 'Dispute Between', val: `${selectedDispute.raised_by?.user_id?.fullName || user?.fullName || 'User'} & ${selectedDispute.raised_against?.user_id?.fullName || 'User'}`, icon: null }
              ].map((item, i) => (
                <div key={i} className={`p-2.5 rounded-lg border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1 opacity-60">
                    {item.icon && <item.icon className="w-3 h-3" />}
                    <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
                  </div>
                  <p className="text-[11px] font-medium">{item.val || 'N/A'}</p>
                </div>
              ))}
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Description & Discussion */}
              <div className="md:col-span-2 space-y-6">
                <section>
                  <h3 className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Description</h3>
                  <p className={`text-xs leading-relaxed p-3 rounded-lg border ${isDark ? 'bg-zinc-900/20 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'}`}>
                    {selectedDispute.description || 'No description provided.'}
                  </p>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold uppercase text-zinc-500">Discussion</h3>
                    <span className="text-[10px] text-white px-2 py-0.5 bg-zinc-800 rounded-full">{selectedDispute.messages?.length || 0}</span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-hover">
                    {selectedDispute.messages?.length > 0 ? (
                      [...selectedDispute.messages].reverse().map((msg) => (
                        <div key={msg._id} className="text-xs border-l-2 border-zinc-800 pl-3 py-1">
                          <div className="flex justify-between mb-1 opacity-70">
                            <span className="font-bold">{msg.sender_id?.fullName}</span>
                            <span>{timeAgo(msg.created_at)}</span>
                          </div>
                          <p className="text-zinc-400">{msg.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-zinc-600 italic">No messages yet.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Sidebar: Metadata & Reply */}
              <div className="space-y-4">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Priority</span>
                      <span className={`font-bold uppercase ${selectedDispute.priority === 'high' ? 'text-red-500' : 'text-zinc-400'}`}>{selectedDispute.priority}</span>
                    </div>
                  
                  </div>
                </div>

               <div className="space-y-2">
  {/* Textarea: Height kam ki hai aur padding adjust ki hai */}
  <textarea
    value={messageInput}
    onChange={(e) => setMessageInput(e.target.value)}
    placeholder="Type a message..."
    className={`w-full p-2.5 text-[11px] rounded-md border outline-none h-11 resize-none transition-colors 
      ${isDark 
        ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 text-zinc-300' 
        : 'bg-white border-zinc-200 focus:border-zinc-400 text-zinc-800'
      }`}
  />
  
  {/* Button: Height aur font-size thodi compact ki hai */}
  <button
    onClick={handleAddMessage}
    disabled={!messageInput.trim() || sendingMessage}
    className={`w-full py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all
      ${isDark 
        ? 'bg-zinc-200 text-black hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600' 
        : 'bg-zinc-900 text-white hover:bg-black disabled:bg-zinc-100 disabled:text-zinc-400'
      }`}
  >
    {sendingMessage ? 'Sending...' : 'Send Message'}
  </button>
</div>
              </div>
            </div>

            {/* Footer: Simple & Fixed */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800/50">
              <button onClick={() => setShowDetailsModal(false)} className="text-[10px] text-zinc-500 uppercase tracking-widest hover:text-gray-800">
                Close Case
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Disputes;