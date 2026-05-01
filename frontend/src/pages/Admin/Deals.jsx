import React, { useState } from 'react';
import { Handshake, RefreshCw, DollarSign, Clock, CheckCircle, AlertTriangle, Download, XCircle, Eye, Search, User, ArrowUpRight, Briefcase } from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';


const AdminDeals = () => {
  const { deals, refreshing, refreshData, stats,loading } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredDeals, setFilteredDeals] = useState(deals || []);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // ==================== STATUS CONFIGURATION ====================
  // Using consistent color scheme from colorScheme.js

  const statusOptions = ['all', 'pending', 'accepted', 'in-progress', 'completed', 'negotiating'];

  const handleExport = () => {
    // Generate CSV for deals data
    const csvContent = [
      ['Deal ID', 'Campaign', 'Brand', 'Creator', 'Status', 'Budget', 'Created'].join(','),
      ...filteredDeals.map(deal => [
        deal._id?.slice(-8) || '',
        `"${deal.campaignId?.title || ''}"`,
        `"${deal.brandId?.brandName || ''}"`,
        `"${deal.creatorId?.displayName || deal.creatorId?.fullName || ''}"`,
        deal.status,
        deal.budget || 0,
        deal.createdAt ? new Date(deal.createdAt).toISOString().split('T')[0] : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const completedDeals = Number(stats.completedDeals || deals.filter((deal) => deal.status === 'completed').length || 0);
  const pendingDeals = Number(
    stats.pendingDeals ||
    deals.filter((deal) => ['pending', 'in_progress', 'in-progress'].includes(String(deal.status || '').toLowerCase())).length ||
    0
  );
  const totalValue = Number(stats.totalDealValue || deals.reduce((sum, deal) => sum + Number(deal.budget || 0), 0) || 0);

  // ==================== HANDLE VIEW DETAILS ====================
  const handleViewDetails = (deal) => {
    setSelectedDeal(deal);
    setShowDetailsModal(true);
  };

  if (loading) {
      return (
           <div className="flex flex-col items-center justify-center min-h-[60vh]">
             <div className="text-center">
               <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
               <p className="text-zinc-500 text-xs font-medium">Loading admin deals...</p>
             </div>
           </div>
         );
    }
  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Admin <span className="font-bold">Deals</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Monitor and manage all platform deals and partnerships.</p>
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
              <Handshake size={18} strokeWidth={2.5} />
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
              Total Deals
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {stats.totalDeals || deals.length || 0}
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
              Completed
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {completedDeals}
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
              <Clock size={18} strokeWidth={2.5} />
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
              Pending
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {pendingDeals}
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
              Value
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Deal Value
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {formatCurrency(totalValue)}
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
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                filter === s 
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
            placeholder="Search campaign, brand or creator..."
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
  {deals.length > 0 ? (
    <div className="space-y-4">
      {/* Header Row - ultra-minimal tracking */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Agreement Details</div>
        <div className="col-span-2 text-center">Talent</div>
        <div className="col-span-3 text-center">Pipeline Status</div>
        <div className="col-span-2 text-center">Contract Value</div>
        <div className="col-span-1 text-right">View</div>
      </div>

      {/* Deal Rows */}
      {deals
        .filter(d => 
          (filter === 'all' || d.status === filter) &&
          (d.campaignId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           d.brandId?.brandName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           d.creatorId?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .map(deal => {
          const status = String(deal.status || 'unknown').toLowerCase();
          
          return (
            <div 
              key={deal._id || `${deal.campaignId?._id}-${deal.creatorId?._id}`}
              onClick={() => handleViewDetails(deal)}
              className={`
                group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2rem] border 
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
                ${isDark 
                  ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                  : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
              `}
            >
              {/* Campaign & Brand Section */}
              <div className="col-span-4 flex items-center gap-5">
                <div className={`
                  w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border transition-all duration-500
                  ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:border-zinc-500' : 'bg-zinc-50 border-zinc-100 group-hover:border-zinc-300 shadow-sm'}
                `}>
                  <Briefcase className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {deal.campaignId?.title || 'Untitled Campaign'}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
                    {deal.brandId?.brandName || deal.brandId?.fullName || 'Unknown Brand'}
                  </span>
                </div>
              </div>

              {/* Creator: Clean Label Style */}
              <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
                 <span className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {deal.creatorId?.displayName || deal.creatorId?.fullName || 'TBA'}
                </span>
                <div className="w-4 h-px bg-zinc-700/20 my-1" />
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">Talent</span>
              </div>

              {/* Status: The "Phase" Pill */}
              <div className="col-span-3 mt-4 md:mt-0 flex justify-center">
                <span className={`
                  inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                  transition-all duration-300 ${getStatusColor(status, 'deal', isDark)}
                `}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-current mr-2.5 ${status === 'active' ? 'animate-pulse' : 'opacity-40'}`} />
                  {status}
                </span>
              </div>

              {/* Budget: High-End Financial Typography */}
              <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
                <span className={`text-xl font-bold tracking-[ -0.05em] ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatCurrency(deal.budget || 0)}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500/60">Amount</span>
              </div>

              {/* Action: Hover Arrow Container */}
              <div className="col-span-1 hidden md:flex justify-end">
                <div className={`
                  w-10 h-10 rounded-[1rem] flex items-center justify-center transition-all duration-500
                  ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-50 text-zinc-400'}
                  group-hover:bg-zinc-900 group-hover:text-white group-hover:rotate-45
                `}>
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
    </div>
  ) : (
    /* Empty State */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-6 rounded-[2rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Briefcase className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">No Active Agreements</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">
        Your deal pipeline is currently empty. Start a new collaboration to see it here.
      </p>
    </div>
  )}
</div>

      {/* Deal Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Deal Details"
        size="lg"
      >
        {selectedDeal && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDeal.campaignId?.title || 'Untitled Campaign'}</h3>
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-1`}>
                Deal ID: {selectedDeal._id?.slice(-8)} • Status: {selectedDeal.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Budget</p>
                <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatCurrency(selectedDeal.budget || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Status</p>
                <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(selectedDeal.status, 'deal', isDark)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
                  {selectedDeal.status}
                </span>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Brand</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDeal.brandId?.brandName || selectedDeal.brandId?.fullName || 'Unknown brand'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-1`}>Creator</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedDeal.creatorId?.fullName || selectedDeal.creatorId?.displayName || 'Unknown creator'}</p>
              </div>
            </div>

            <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Created Date</p>
              <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{formatDate(selectedDeal.createdAt)}</p>
            </div>

            {selectedDeal.updatedAt && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mb-2`}>Last Updated</p>
                <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{formatDate(selectedDeal.updatedAt)}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDeals;
