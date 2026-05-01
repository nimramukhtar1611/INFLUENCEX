import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, RefreshCw, ShieldCheck, ShieldAlert, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { Loader } from 'lucide-react';
import adminService from '../../services/adminService';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const queueOptions = [
  { value: 'manual_review', label: 'Manual Review' },
  { value: 'high_risk', label: 'High Risk' },
  { value: 'all_flagged', label: 'All Flagged' },
];

const getRiskClass = (riskLevel) => {
  return getStatusColor(riskLevel || 'low', 'status');
};

const AdminFraudReview = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState('manual_review');
  const [riskLevel, setRiskLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creators, setCreators] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPayload, setReviewPayload] = useState({
    creatorId: '',
    displayName: '',
    action: 'clear_hold',
    notes: '',
  });

  const fetchQueue = useCallback(async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await adminService.getFraudReviewQueue({
        page,
        limit: 20,
        queue,
        riskLevel: riskLevel || undefined,
      });

      if (response.success) {
        setCreators(response.creators || []);
        setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }

      if (showToast) {
        toast.success('Fraud review queue refreshed');
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to load fraud review queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, queue, riskLevel]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const filteredCreators = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return creators;

    return creators.filter((creator) => {
      const values = [
        creator.displayName,
        creator.handle,
        creator.fraudDetection?.holdReason,
        creator.fraudDetection?.riskLevel,
      ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [creators, searchQuery]);

  const openDetails = async (creatorId) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedCreator(null);

    try {
      const response = await adminService.getFraudCreatorDetails(creatorId);
      if (response.success) {
        setSelectedCreator(response.creator);
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to load creator fraud details');
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openReviewAction = (creator, action) => {
    setReviewPayload({
      creatorId: creator._id,
      displayName: creator.displayName || creator.handle || 'Creator',
      action,
      notes: '',
    });
    setReviewOpen(true);
  };

  const submitReviewAction = async () => {
    try {
      setReviewSubmitting(true);

      const response = await adminService.updateFraudReviewStatus(
        reviewPayload.creatorId,
        reviewPayload.action,
        reviewPayload.notes
      );

      if (response.success) {
        toast.success(response.message || 'Fraud review status updated');
        setReviewOpen(false);

        if (selectedCreator?._id === reviewPayload.creatorId) {
          const detailsResponse = await adminService.getFraudCreatorDetails(reviewPayload.creatorId);
          if (detailsResponse.success) {
            setSelectedCreator(detailsResponse.creator);
          }
        }

        await fetchQueue();
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to update fraud review status');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading fraud review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Admin <span className="font-bold">Fraud Review</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Review creators flagged by fraud detection and manage manual holds.</p>
        </div>
      
      </div>

      {/* Stats Cards - Brand Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className={`
            group p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            {/* Icon Squircle with Spring Animation */}
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
            `}>
              <AlertTriangle size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-blue-500 bg-blue-500/5
            `}>
              Flagged
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Creators
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {pagination.total || 0}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>

        <div 
          className={`
            group p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            {/* Icon Squircle with Spring Animation */}
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-black' 
                : 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white shadow-sm'}
            `}>
              <ShieldAlert size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-amber-500 bg-amber-500/5
            `}>
              Manual
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Holds
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              text-amber-600
            `}>
              {creators.filter((c) => c.fraudDetection?.manualReviewRequired).length}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>

        <div 
          className={`
            group p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            {/* Icon Squircle with Spring Animation */}
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-red-400 group-hover:bg-red-500 group-hover:text-white' 
                : 'bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white shadow-sm'}
            `}>
              <AlertTriangle size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-red-500 bg-red-500/5
            `}>
              High
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Risk
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              text-red-600
            `}>
              {creators.filter((c) => c.fraudDetection?.riskLevel === 'high').length}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>

        <div 
          className={`
            group p-6 rounded-[2rem] border transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            {/* Icon Squircle with Spring Animation */}
            <div className={`
              p-2.5 rounded-2xl transition-all duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110
              ${isDark 
                ? 'bg-zinc-800 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' 
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white shadow-sm'}
            `}>
              <RefreshCw size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-indigo-500 bg-indigo-500/5
            `}>
              Queue
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Current
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              text-indigo-600
            `}>
              {queue.replace('_', ' ')}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
          {queueOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setQueue(option.value);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                queue === option.value 
                  ? (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-black border-black text-white')
                  : (isDark ? 'border-zinc-800 text-zinc-500 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-initial lg:max-w-xs">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, handle, risk, hold reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 text-xs rounded-full border focus:outline-none transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600' : 'bg-zinc-50 border-zinc-200 focus:border-black'
              }`}
            />
          </div>
          
          <select
            value={riskLevel}
            onChange={(e) => {
              setRiskLevel(e.target.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100' : 'bg-zinc-50 border-zinc-200 focus:border-black text-zinc-900'
            }`}
          >
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Creator Cards Interface */}
  <div className="relative overflow-hidden">
  {filteredCreators.length > 0 ? (
    <div className="space-y-4">
      {/* Header Row - Tracking set to high for an elegant "Audit" look */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Vetting Profile</div>
        <div className="col-span-2 text-center">Audience</div>
        <div className="col-span-2 text-center">Engagement</div>
        <div className="col-span-2 text-center">Risk Analysis</div>
        <div className="col-span-2 text-right">Integrity Actions</div>
      </div>

      {/* Creator Rows */}
      {filteredCreators.map((creator) => {
        const risk = creator.fraudDetection || {};
        const manualReviewRequired = Boolean(risk.manualReviewRequired);
        
        return (
          <div 
            key={creator._id}
            onClick={() => openDetails(creator._id)}
            className={`
              group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2rem] border 
              transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
              ${isDark 
                ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
            `}
          >
            {/* Creator Primary Info */}
            <div className="col-span-4 flex items-center gap-5">
              <div className={`
                w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border transition-all duration-500
                ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:border-zinc-500' : 'bg-zinc-50 border-zinc-100 group-hover:border-zinc-300 shadow-sm'}
              `}>
                <ShieldCheck className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {creator.displayName || 'Unnamed creator'}
                </span>
                <span className="text-[11px] font-semibold text-zinc-500 opacity-60 uppercase tracking-widest mt-1">
                  @{creator.handle || 'no-handle'}
                </span>
                {risk.holdReason && (
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter mt-1 bg-amber-500/10 px-2 py-0.5 rounded w-fit">
                    Flag: {risk.holdReason}
                  </span>
                )}
              </div>
            </div>

            {/* Followers: Bold Numeric */}
            <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
              <span className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {Number(creator.totalFollowers || 0).toLocaleString()}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-40">Total Fans</span>
            </div>

            {/* Engagement: Elegant Percentage */}
            <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
              <span className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {Number(creator.averageEngagement || 0).toFixed(2)}%
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-40">Avg Rate</span>
            </div>

            {/* Risk Level: The "Audit" Pill */}
            <div className="col-span-2 mt-4 md:mt-0 flex justify-center">
              <div className="flex flex-col items-center gap-1.5">
                <span className={`
                  inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                  ${getRiskClass(risk.riskLevel)}
                `}>
                  <AlertTriangle className={`w-3.5 h-3.5 mr-2 ${getStatusIconColor(risk.riskLevel || 'low')}`} />
                  {risk.riskLevel || 'low'}
                </span>
                <span className="font-mono text-[10px] font-bold opacity-40 tracking-tighter">
                  SCORE: {Number(risk.riskScore || 0)}/100
                </span>
              </div>
            </div>

            {/* Actions: Refined SaaS Buttons */}
            <div className="col-span-2 mt-4 md:mt-0 flex justify-end gap-2.5">
              <button
                onClick={(e) => { e.stopPropagation(); openDetails(creator._id); }}
                className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
              >
                <Eye className="w-4 h-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openReviewAction(creator, manualReviewRequired ? 'clear_hold' : 'mark_review');
                }}
                className={`
                  px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${manualReviewRequired 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600' 
                    : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600'}
                `}
              >
                {manualReviewRequired ? 'Verify' : 'Review'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    /* Premium Empty State */
    <div className={`flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}`}>
      <div className={`p-6 rounded-[2rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <ShieldAlert className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">Security Scan Clean</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">No creator profiles currently match your vetting criteria.</p>
    </div>
  )}
</div>

      <Modal
        isOpen={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedCreator(null);
        }}
        title="Fraud Assessment Details"
        size="2xl"
        className="modal-scrollable"
      >
        {detailsLoading ? (
          <div className="py-10 text-center text-zinc-500">Loading details...</div>
        ) : selectedCreator ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className={`rounded-lg p-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Creator</p>
                <p className={`font-semibold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedCreator.displayName || 'Unnamed creator'}</p>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{selectedCreator.handle || 'No handle'}</p>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Risk Score</p>
                <p className={`font-semibold text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{Number(selectedCreator.fraudDetection?.riskScore || 0)}/100</p>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Risk Level</p>
                <p className={`font-semibold text-sm capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCreator.fraudDetection?.riskLevel || 'low'}</p>
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-3 h-3 sm:w-4 sm:h-4 text-yellow-700 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>Manual Review Status</p>
                  <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
                    {selectedCreator.fraudDetection?.manualReviewRequired ? 'Manual review required.' : 'No manual hold currently applied.'}
                  </p>
                  {selectedCreator.fraudDetection?.holdReason ? (
                    <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'} mt-1 truncate`}>Reason: {selectedCreator.fraudDetection.holdReason}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Signals</p>
              <div className="space-y-2">
                {(selectedCreator.fraudDetection?.signals || []).length > 0 ? (
                  selectedCreator.fraudDetection.signals.map((signal, index) => (
                    <div key={`${signal.type}-${index}`} className={`border rounded-lg p-3 ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{(signal.type || 'unknown').replace(/_/g, ' ')}</span>
                        <span className={`px-1 sm:px-2 py-1 text-xs rounded-full capitalize inline-flex items-center gap-1 ${getRiskClass(signal.severity)}`}>
                          <AlertTriangle className={`w-2 h-2 sm:w-3 sm:h-3 ${getStatusIconColor(signal.severity || 'low')}`} />
                          <span className="hidden sm:inline">{signal.severity || 'low'}</span>
                          <span className="sm:hidden">{signal.severity === 'high' ? 'H' : signal.severity === 'medium' ? 'M' : 'L'}</span>
                        </span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Platform: {signal.platform || 'n/a'} • Weight: {signal.weight || 0}</p>
                      <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'} mt-1`}>{signal.reason || 'No signal reason provided.'}</p>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No fraud signals recorded.</p>
                )}
              </div>
            </div>

            <div>
              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Recent Social History</p>
              <div className="space-y-2">
                {(selectedCreator.fraudDetection?.history || []).slice(-5).reverse().map((entry, index) => (
                  <div key={`${entry.platform}-${entry.capturedAt}-${index}`} className={`border rounded-lg p-2 text-sm ${isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                    <p className={`font-medium capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{entry.platform || 'unknown'} • {Number(entry.followers || 0).toLocaleString()} followers</p>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Engagement: {Number(entry.engagement || 0).toFixed(2)}% • Captured: {formatDate(entry.capturedAt)}</p>
                  </div>
                ))}
                {(selectedCreator.fraudDetection?.history || []).length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No historical snapshots available.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-zinc-500">No details found for this creator.</div>
        )}
      </Modal>

      <Modal
        isOpen={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setReviewPayload({ creatorId: '', displayName: '', action: 'clear_hold', notes: '' });
        }}
        title={reviewPayload.action === 'clear_hold' ? 'Clear Fraud Hold' : 'Mark For Manual Review'}
      >
        <div className="space-y-4">
          <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {reviewPayload.action === 'clear_hold'
              ? `Clear manual fraud hold for ${reviewPayload.displayName}?`
              : `Mark ${reviewPayload.displayName} for manual fraud review?`}
          </p>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Notes (optional)</label>
            <textarea
              rows="4"
              value={reviewPayload.notes}
              onChange={(e) => setReviewPayload((prev) => ({ ...prev, notes: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
              }`}
              placeholder="Add reviewer notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={reviewPayload.action === 'clear_hold' ? 'success' : 'warning'}
              loading={reviewSubmitting}
              onClick={submitReviewAction}
            >
              {reviewPayload.action === 'clear_hold' ? 'Clear Hold' : 'Mark Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminFraudReview;