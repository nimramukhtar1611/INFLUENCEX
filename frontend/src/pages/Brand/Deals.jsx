// pages/Brand/Deals.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle, Clock, AlertCircle, Loader, 
  Briefcase, ChevronLeft, ChevronRight, User, ArrowUpRight, RefreshCw
} from 'lucide-react';
import dealService from '../../services/dealService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const Deals = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, pages: 1
  });

  // ==================== STATUS CONFIGURATION ====================
  const statusConfig = {
    pending: { label: 'Pending', bg: isDark ? 'bg-zinc-800' : 'bg-gray-100', text: isDark ? 'text-zinc-400' : 'text-gray-600' },
    accepted: { label: 'Accepted', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    'in-progress': { label: 'In Progress', bg: 'bg-blue-500/10', text: 'text-blue-500' },
    completed: { label: 'Completed', bg: isDark ? 'bg-white' : 'bg-black', text: isDark ? 'text-black' : 'text-white' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-500' },
    declined: { label: 'Declined', bg: 'bg-red-500/10', text: 'text-red-500' },
    revision: { label: 'Revision', bg: 'bg-amber-500/10', text: 'text-amber-500' },
    negotiating: { label: 'Negotiating', bg: 'bg-purple-500/10', text: 'text-purple-500' },
    disputed: { label: 'Disputed', bg: 'bg-rose-500/10', text: 'text-rose-500' }
  };

  const statusOptions = ['all', 'pending', 'accepted', 'in-progress', 'completed', 'negotiating'];

  // ==================== FETCH DEALS ====================
  const fetchDeals = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const response = await dealService.getBrandDeals(
        filter === 'all' ? '' : filter,
        pagination.page,
        pagination.limit
      );

      if (response?.success) {
        setDeals(response.deals || []);
        setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
        if (showToast) toast.success('Deals refreshed');
      }
    } catch (error) {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [filter, pagination.page]);

  if (loading && deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading partnerships...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Brand <span className="font-bold">Deals</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage creator partnerships and deal negotiations.</p>
        </div>

       
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                filter === s 
                  ? (isDark ? 'bg-white border-white text-gray-800' : 'bg-black border-black text-white')
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
            placeholder="Search campaign or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-full border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600' : 'bg-white border-zinc-200 focus:border-black'
            }`}
          />
        </div>
      </div>

      {/* Table Interface */}
      <div className="relative overflow-hidden">
  {deals.length > 0 ? (
    <div className="space-y-4">
      {/* Header Row - Extra wide tracking for "Legal Document" feel */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Agreement & Entity</div>
        <div className="col-span-2 text-center">Contract Value</div>
        <div className="col-span-3 text-center">Execution Status</div>
        <div className="col-span-2 text-center">Completion</div>
        <div className="col-span-1 text-right">View</div>
      </div>

      {/* Deal Rows */}
      {deals
        .filter(d => 
          d.campaignId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          d.creatorId?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(deal => (
        <div 
          key={deal._id}
          onClick={() => navigate(`/brand/deals/${deal._id}`)}
          className={`
            group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2.5rem] border 
            transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
          `}
        >
          {/* Primary Info: Campaign Title & Creator Squircle */}
          <div className="col-span-4 flex items-center gap-5">
            <div className={`
              w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border transition-all duration-500
              ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-100 shadow-sm group-hover:bg-zinc-100'}
            `}>
              <Briefcase className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {deal.campaignId?.title || 'Untitled Campaign'}
              </span>
              <span className={`text-[11px] font-medium mt-1 uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {deal.creatorId?.displayName || 'Pending Creator'}
              </span>
            </div>
          </div>

          {/* Budget: High-Contrast Mono */}
          <div className="col-span-2 mt-4 md:mt-0 text-center">
            <span className={`text-[16px] font-mono font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatCurrency(deal.budget)}
            </span>
          </div>

          {/* Status: Active Phase Pill */}
          <div className="col-span-3 mt-4 md:mt-0 flex justify-center">
            <span className={`
              inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border
              transition-all duration-300 ${statusConfig[deal.status]?.bg} ${statusConfig[deal.status]?.text}
            `}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
              {statusConfig[deal.status]?.label || deal.status}
            </span>
          </div>

          {/* Progress: Modern Timeline style */}
          <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center gap-2">
            <div className={`w-28 rounded-full h-1 overflow-hidden relative ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
              <div 
                className={`absolute inset-0 h-full transition-all duration-1000 ease-out ${isDark ? 'bg-white' : 'bg-black'}`} 
                style={{ width: `${deal.progress || 0}%` }}
              />
            </div>
            <span className="text-[10px] font-black font-mono tracking-tighter text-zinc-500">
              {deal.progress || 0}% COMPLETE
            </span>
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
      ))}
    </div>
  ) : (
    /* Premium Empty State */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3.5rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-8 rounded-[2.5rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Briefcase className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">Contract Registry Empty</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[260px] text-center leading-relaxed uppercase tracking-widest opacity-60">
        No agreements detected in the current audit window.
      </p>
    </div>
  )}
</div>

      {/* Modern Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/10 dark:border-zinc-200/10">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            Page {pagination.page} <span className="mx-1 text-zinc-300">/</span> {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} 
              disabled={pagination.page === 1}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} 
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;