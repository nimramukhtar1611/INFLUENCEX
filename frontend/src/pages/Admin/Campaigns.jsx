import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart3,
  Target,
  Award,
  AlertCircle,
  Pause,
  Play,
  Archive,
  ArrowUpRight,
  Briefcase
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { Loader } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const Campaigns = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { campaigns, loading, refreshData, stats } = useAdminData();
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState({ status: '', reason: '' });

  // ==================== FILTER CAMPAIGNS ====================
  useEffect(() => {
    if (campaigns) {
      let filtered = [...campaigns];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          c.title?.toLowerCase().includes(query) ||
          c.brandId?.brandName?.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(c => c.category === categoryFilter);
      }

      setFilteredCampaigns(filtered);
    }
  }, [campaigns, searchQuery, statusFilter, categoryFilter]);

  const activeCampaigns = Number(campaigns?.filter(c => c.status === 'active').length || 0);
  const pendingCampaigns = Number(campaigns?.filter(c => c.status === 'pending').length || 0);
  const totalBudget = Number(campaigns?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0);

  // ==================== HANDLE VIEW DETAILS ====================
  const handleViewDetails = (campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
  };

  // ==================== HANDLE STATUS CHANGE ====================
  const handleStatusChange = async () => {
    try {
      const response = await adminService.updateCampaignStatus(selectedCampaign._id, statusAction.status, statusAction.reason);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to update campaign status');
      }

      toast.success(`Campaign status updated to ${statusAction.status}`);
      setShowStatusModal(false);
      setSelectedCampaign(null);
      setStatusAction({ status: '', reason: '' });
      refreshData();
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to update campaign status');
    }
  };

  // ==================== EXPORT CSV ====================
  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Title', 'Brand', 'Category', 'Status', 'Budget', 'Spent', 'Start Date', 'End Date', 'Creators'].join(','),
      ...filteredCampaigns.map(c => [
        `"${c.title}"`,
        `"${c.brandId?.brandName || ''}"`,
        `"${c.category}"`,
        c.status,
        c.budget || 0,
        c.spent || 0,
        c.startDate ? formatDate(c.startDate) : '',
        c.endDate ? formatDate(c.endDate) : '',
        c.selectedCreators?.length || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ==================== STATUS CONFIGURATION ====================
  // Using consistent color scheme from colorScheme.js

  const statusOptions = ['all', 'active', 'pending', 'draft', 'completed', 'paused', 'archived', 'rejected'];
  const categories = [...new Set(campaigns?.map(c => c.category).filter(Boolean))];

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
         <div className="flex flex-col items-center justify-center min-h-[60vh]">
           <div className="text-center">
             <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
             <p className="text-zinc-500 text-xs font-medium">Loading admin campaign...</p>
           </div>
         </div>
       );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Admin <span className="font-bold">Campaigns</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Monitor and manage all platform campaigns and brand partnerships.</p>
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
              <Target size={18} strokeWidth={2.5} />
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
              Campaigns
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {campaigns?.length || 0}
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
                ? 'bg-zinc-800 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white' 
                : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white shadow-sm'}
            `}>
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-emerald-500 bg-emerald-500/5
            `}>
              Active
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Running
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {activeCampaigns}
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
              <Clock size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-amber-500 bg-amber-500/5
            `}>
              Pending
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Approval
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {pendingCampaigns}
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
              <DollarSign size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-green-500 bg-green-500/5
            `}>
              Budget
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Total Budget
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {formatCurrency(totalBudget)}
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
          {statusOptions.map(s => (
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
            placeholder="Search campaign, brand or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-full border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600' : 'bg-zinc-50 border-zinc-200 focus:border-black'
            }`}
          />
        </div>
      </div>

      {/* Table Interface */}
    <div className="relative overflow-hidden">
  {filteredCampaigns.length > 0 ? (
    <div className="space-y-4">
      {/* Header Row - Minimalist & High Tracking */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Strategic Initiative</div>
        <div className="col-span-2 text-center">Category</div>
        <div className="col-span-3 text-center">Current Phase</div>
        <div className="col-span-2 text-center">Allocation</div>
        <div className="col-span-1 text-right">Explore</div>
      </div>

      {/* Campaign Rows */}
      {filteredCampaigns.map(campaign => {
        const status = String(campaign.status || 'unknown').toLowerCase();
        
        return (
          <div 
            key={campaign._id}
            onClick={() => handleViewDetails(campaign)}
            className={`
              group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2rem] border 
              transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
              ${isDark 
                ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
            `}
          >
            {/* Primary Info: Campaign & Brand */}
            <div className="col-span-4 flex items-center gap-5">
              <div className={`
                w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border transition-all duration-500
                ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-100 group-hover:bg-zinc-100 group-hover:border-zinc-200'}
              `}>
                <Target className={`w-5 h-5 transition-transform duration-500 group-hover:scale-110 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-bold text-[15px] tracking-tight truncate leading-none mb-1 transition-colors ${isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900'}`}>
                  {campaign.title || 'Untitled Campaign'}
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-widest opacity-50`}>
                  {campaign.brandId?.brandName || campaign.brandId?.fullName || 'Internal'}
                </span>
              </div>
            </div>

            {/* Category: Minimalist Ghost Badge */}
            <div className="col-span-2 mt-4 md:mt-0 flex justify-center">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                isDark ? 'bg-zinc-800/30 border-zinc-700/50 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'
              }`}>
                {campaign.category || 'N/A'}
              </span>
            </div>

            {/* Status: Glassmorphic Dot Pill */}
            <div className="col-span-3 mt-4 md:mt-0 flex justify-center">
              <span className={`
                inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border
                transition-all duration-300 ${getStatusColor(status, 'status', isDark)}
              `}>
                <span className={`w-1.5 h-1.5 rounded-full bg-current mr-2.5 ${status === 'active' ? 'animate-pulse' : 'opacity-50'}`} />
                {status}
              </span>
            </div>

            {/* Allocation: Bold Modern Metric */}
            <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
              <span className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {formatCurrency(campaign.budget || 0)}
              </span>
              <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 opacity-60">
                Budget
              </span>
            </div>

            {/* Action: Hover-Reveal Arrow */}
            <div className="col-span-1 hidden md:flex justify-end">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-50 text-zinc-400'}
                group-hover:translate-x-1 group-hover:bg-black group-hover:text-white
              `}>
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    /* Empty State: Premium Minimalist */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-6 rounded-[2rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Target className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className={`text-lg font-bold tracking-tight ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
        No Initiatives Found
      </h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed font-medium">
        Your search parameters yielded no results. Try adjusting filters or creating a new campaign.
      </p>
    </div>
  )}
</div>

      {/* Campaign Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Campaign Details"
        size="lg"
      >
        {selectedCampaign && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCampaign.title}</h3>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-1`}>
                Brand: {selectedCampaign.brandId?.brandName} • Category: {selectedCampaign.category}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Budget</p>
                <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatCurrency(selectedCampaign.budget || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Status</p>
                <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(selectedCampaign.status, 'status', isDark)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
                  {selectedCampaign.status}
                </span>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Brand</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCampaign.brandId?.brandName || selectedCampaign.brandId?.fullName || 'Unknown brand'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Category</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCampaign.category || 'N/A'}</p>
              </div>
            </div>

            {selectedCampaign.description && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Description</p>
                <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{selectedCampaign.description}</p>
              </div>
            )}

            {/* Deliverables */}
            {selectedCampaign.deliverables?.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Deliverables</h4>
                <div className="space-y-2">
                  {selectedCampaign.deliverables.map((del, index) => (
                    <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium capitalize ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{del.type} on {del.platform}</p>
                          {del.description && <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'} truncate`}>{del.description}</p>}
                        </div>
                        <span className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Qty: {del.quantity || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {selectedCampaign.targetAudience && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Target Audience</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedCampaign.targetAudience.minFollowers && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Min Followers</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCampaign.targetAudience.minFollowers}</p>
                    </div>
                  )}
                  {selectedCampaign.targetAudience.maxFollowers && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Max Followers</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCampaign.targetAudience.maxFollowers}</p>
                    </div>
                  )}
                  {selectedCampaign.targetAudience.minEngagement && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Min Engagement</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCampaign.targetAudience.minEngagement}%</p>
                    </div>
                  )}
                </div>
                {selectedCampaign.targetAudience.niches?.length > 0 && (
                  <div className="mt-3">
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Niches</p>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {selectedCampaign.targetAudience.niches.map((niche, i) => (
                        <span key={i} className={`px-1 sm:px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs`}>
                          {niche}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Applications */}
            {selectedCampaign.applications?.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Applications ({selectedCampaign.applications.length})</h4>
                <div className="space-y-2">
                  {selectedCampaign.applications.slice(0, 3).map((app, index) => (
                    <div key={index} className={`p-3 rounded-lg flex justify-between items-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{app.creatorId?.displayName || 'Creator'}</p>
                        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Applied {formatDate(app.appliedAt)}</p>
                      </div>
                      <span className={`px-1 sm:px-2 py-1 text-xs rounded-full ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                  {selectedCampaign.applications.length > 3 && (
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} text-center`}>+{selectedCampaign.applications.length - 3} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons for pending campaigns */}
            {selectedCampaign.status === 'pending' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="danger"
                  onClick={() => {
                    setStatusAction({ status: 'rejected', reason: '' });
                    setShowStatusModal(true);
                    setShowDetailsModal(false);
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    setStatusAction({ status: 'active', reason: '' });
                    setShowStatusModal(true);
                    setShowDetailsModal(false);
                  }}
                >
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`${statusAction.status === 'active' ? 'Approve' : 'Reject'} Campaign`}
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <p className={`${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Are you sure you want to {statusAction.status === 'active' ? 'approve' : 'reject'} campaign "{selectedCampaign.title}"?
            </p>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Reason (Optional)
              </label>
              <textarea
                rows="3"
                value={statusAction.reason}
                onChange={(e) => setStatusAction({ ...statusAction, reason: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                }`}
                placeholder="Enter reason for this action..."
              />
            </div>

            {statusAction.status === 'rejected' && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-700/30' : 'bg-red-50'}`}>
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                  <strong>Note:</strong> The brand will be notified and campaign will be moved to rejected status.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button
            variant={statusAction.status === 'active' ? 'success' : 'danger'}
            onClick={handleStatusChange}
          >
            {statusAction.status === 'active' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Campaigns;
