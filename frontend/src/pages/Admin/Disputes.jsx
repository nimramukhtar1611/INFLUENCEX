import React, { useMemo, useState } from 'react';
import { Eye, RefreshCw, CheckCircle, AlertCircle, Download, XCircle, Search, AlertTriangle, ArrowUpRight, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Loader from '../../components/Common/Loader';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, timeAgo, formatCurrency } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const RESOLUTION_TYPES = [
  { value: 'refund_brand', label: 'Refund Brand' },
  { value: 'release_payment', label: 'Release Payment' },
  { value: 'split_funds', label: 'Split Funds' },
  { value: 'cancel_contract', label: 'Cancel Contract' },
  { value: 'no_action', label: 'No Action' },
];

const AdminDisputes = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { disputes, loading, refreshData, resolveDispute } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState({
    type: 'no_action',
    amount: '',
    details: '',
  });

  const filteredDisputes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return disputes.filter((dispute) => {
      if (statusFilter !== 'all' && dispute.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const raisedBy = dispute?.raised_by?.user_id?.fullName || dispute?.raised_by?.user_id?.email || '';
      const against = dispute?.raised_against?.user_id?.fullName || dispute?.raised_against?.user_id?.email || '';

      return [
        dispute.dispute_id,
        dispute.title,
        dispute.description,
        dispute.dispute_type,
        raisedBy,
        against,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [disputes, searchQuery, statusFilter]);

  const openDetails = (dispute) => {
    setSelectedDispute(dispute);
    setShowDetailsModal(true);
  };

  const openResolve = (dispute) => {
    setSelectedDispute(dispute);
    setResolution({ type: 'no_action', amount: '', details: '' });
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!selectedDispute?._id) return;

    const payload = {
      type: resolution.type,
      details: resolution.details,
    };

    if (resolution.amount !== '') {
      payload.amount = Number(resolution.amount);
    }

    const success = await resolveDispute(selectedDispute._id, payload);
    if (success) {
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolution({ type: 'no_action', amount: '', details: '' });
      await refreshData();
    }
  };

  const handleExport = () => {
    // Generate CSV for disputes data
    const csvContent = [
      ['Dispute ID', 'Title', 'Type', 'Status', 'Raised By', 'Against', 'Amount', 'Created'].join(','),
      ...filteredDisputes.map(dispute => [
        dispute.dispute_id || dispute._id?.slice(-8) || '',
        `"${dispute.title}"`,
        dispute.dispute_type,
        dispute.status,
        `"${dispute.raised_by?.user_id?.fullName || dispute.raised_by?.user_id?.email || ''}"`,
        `"${dispute.raised_against?.user_id?.fullName || dispute.raised_against?.user_id?.email || ''}"`,
        dispute.amount || 0,
        dispute.createdAt ? new Date(dispute.createdAt).toISOString().split('T')[0] : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disputes-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Disputes data exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin border-2 border-zinc-300 border-t-zinc-500 rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-500 text-xs font-medium">Loading disputes...</p>
        </div>
      </div>
    );
  }

  const openCount = filteredDisputes.filter((d) => d.status === 'open').length;
  const investigatingCount = filteredDisputes.filter((d) => d.status === 'investigating').length;
  const resolvedCount = filteredDisputes.filter((d) => d.status === 'resolved').length;

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Admin <span className="font-bold">Disputes</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Monitor and resolve all platform disputes and conflicts.</p>
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
              <Scale size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-blue-500 bg-blue-500/5
            `}>
              Total
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Total Disputes
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {filteredDisputes.length}
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
              <AlertCircle size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-red-500 bg-red-500/5
            `}>
              Open
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Open Cases
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {openCount}
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
                ? 'bg-zinc-800 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-black' 
                : 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white shadow-sm'}
            `}>
              <AlertTriangle size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-amber-500 bg-amber-500/5
            `}>
              Active
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Investigating
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {investigatingCount}
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
                ? 'bg-zinc-800 text-green-400 group-hover:bg-green-500 group-hover:text-white' 
                : 'bg-green-50 text-green-600 group-hover:bg-green-500 group-hover:text-white shadow-sm'}
            `}>
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-emerald-500 bg-emerald-500/5
            `}>
              Done
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
              {resolvedCount}
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
          {['all', 'open', 'investigating', 'resolved', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                statusFilter === s 
                  ? (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-black border-black text-white')
                  : (isDark ? 'border-zinc-800 text-zinc-500 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search disputes by ID, title, party, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-full border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-600' : 'bg-zinc-50 border-zinc-200 focus:border-black'
            }`}
          />
        </div>
      </div>

      {/* Table Interface */}
   <div className="relative overflow-hidden">
  {filteredDisputes.length > 0 ? (
    <div className="space-y-4">
      {/* Header Row - Extra letter spacing for a professional "Case File" look */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Conflict Resolution Case</div>
        <div className="col-span-2 text-center">Category</div>
        <div className="col-span-3 text-center">Initiated By</div>
        <div className="col-span-2 text-center">Resolution Status</div>
        <div className="col-span-1 text-right">Review</div>
      </div>

      {/* Dispute Rows */}
      {filteredDisputes.map((dispute) => {
        const raisedBy = dispute?.raised_by?.user_id?.fullName || dispute?.raised_by?.user_id?.email || 'Unknown User';
        const status = dispute.status || 'open';
        
        const getStatusIcon = (status) => {
          switch(status?.toLowerCase()) {
            case 'resolved': return CheckCircle;
            default: return AlertCircle;
          }
        };
        
        const StatusIcon = getStatusIcon(status);
        
        return (
          <div 
            key={dispute._id}
            onClick={() => openDetails(dispute)}
            className={`
              group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2rem] border 
              transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
              ${isDark 
                ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
            `}
          >
            {/* Primary Info: Case Title & ID */}
            <div className="col-span-4 flex items-center gap-5">
              <div className={`
                w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border transition-all duration-500
                ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-100 shadow-sm group-hover:bg-zinc-100'}
              `}>
                <Scale className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {dispute.title || dispute.dispute_id || 'Untitled Dispute'}
                </span>
                <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">
                  CASE-ID: {dispute.dispute_id || dispute._id?.slice(-8)}
                </span>
              </div>
            </div>

            {/* Category: Sharp Ghost Badge */}
            <div className="col-span-2 mt-4 md:mt-0 flex justify-center">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                isDark ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
              }`}>
                {(dispute.dispute_type || 'General').replace(/_/g, ' ')}
              </span>
            </div>

            {/* Raised By: Executive Contact Style */}
            <div className="col-span-3 mt-4 md:mt-0 flex flex-col items-center">
              <span className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {raisedBy}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-40">Complainant</span>
            </div>

            {/* Status: High-Impact "Phase" Pill */}
            <div className="col-span-2 mt-4 md:mt-0 flex justify-center">
              <span className={`
                inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border
                transition-all duration-300 ${getStatusColor(status, 'status', isDark)}
              `}>
                <StatusIcon className={`w-3.5 h-3.5 mr-2 ${status !== 'resolved' ? 'animate-pulse' : ''}`} />
                {status}
              </span>
            </div>

            {/* Action: Hover Arrow */}
            <div className="col-span-1 hidden md:flex justify-end">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-50 text-zinc-400'}
                group-hover:bg-black group-hover:text-white group-hover:rotate-45
              `}>
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    /* Premium Empty State: Resolution Clear */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-6 rounded-[2rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Scale className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">Legal Queue Clear</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">
        There are no active disputes requiring arbitration at this time.
      </p>
    </div>
  )}
</div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDispute(null);
        }}
        title="Dispute Details"
        size="lg"
        className="modal-scrollable"
      >
        {selectedDispute && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div>
              <h3 className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDispute.title || 'Untitled Dispute'}</h3>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-1`}>
                Dispute ID: {selectedDispute.dispute_id || selectedDispute._id?.slice(-8)} • Status: {selectedDispute.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Type</p>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{(selectedDispute.dispute_type || 'unknown').replace(/_/g, ' ')}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Priority</p>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDispute.priority || 'normal'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Raised By</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDispute.raised_by?.user_id?.fullName || selectedDispute.raised_by?.user_id?.email || 'Unknown'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Against</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDispute.raised_against?.user_id?.fullName || selectedDispute.raised_against?.user_id?.email || 'Unknown'}</p>
              </div>
            </div>

            <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Description</p>
              <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'} whitespace-pre-wrap`}>{selectedDispute.description || 'No description provided.'}</p>
            </div>

            {selectedDispute.amount && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Amount</p>
                <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatCurrency(selectedDispute.amount)}</p>
              </div>
            )}

            <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Created Date</p>
              <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{formatDate(selectedDispute.createdAt)}</p>
            </div>

            {selectedDispute.updatedAt && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Last Updated</p>
                <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{formatDate(selectedDispute.updatedAt)}</p>
              </div>
            )}

            {selectedDispute.resolution && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/30 border border-green-700/30' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>Resolution</p>
                <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'} capitalize`}>Type: {(selectedDispute.resolution.type || 'n/a').replace(/_/g, ' ')}</p>
                {selectedDispute.resolution.amount > 0 && (
                  <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>Amount: ${selectedDispute.resolution.amount}</p>
                )}
                {selectedDispute.resolution.details && (
                  <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>Details: {selectedDispute.resolution.details}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedDispute(null);
        }}
        title="Resolve Dispute"
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className={`rounded-lg p-3 flex gap-2 ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <AlertCircle className={`w-4 h-4 text-yellow-700 mt-0.5`} />
              <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
                This action resolves the dispute and updates related payment/deal state where applicable.
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Resolution Type</label>
              <select
                value={resolution.type}
                onChange={(e) => setResolution((prev) => ({ ...prev, type: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-zinc-100'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              >
                {RESOLUTION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Amount (Optional)</label>
              <input
                type="number"
                value={resolution.amount}
                onChange={(e) => setResolution((prev) => ({ ...prev, amount: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-zinc-100'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Details</label>
              <textarea
                rows="3"
                value={resolution.details}
                onChange={(e) => setResolution((prev) => ({ ...prev, details: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                }`}
                placeholder="Add notes for this resolution..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleResolve}>
                Resolve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDisputes;
