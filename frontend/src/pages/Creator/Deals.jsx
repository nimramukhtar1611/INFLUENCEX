// pages/Creator/Deals.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle, Clock, AlertCircle, DollarSign, Loader, 
  Briefcase, ChevronLeft, ChevronRight, Filter, ArrowUpRight
} from 'lucide-react';
import dealService from '../../services/dealService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorDeals = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const statusConfig = {
    pending: { label: 'Pending', bg: isDark ? 'bg-zinc-800' : 'bg-gray-100', text: isDark ? 'text-zinc-400' : 'text-gray-600' },
    accepted: { label: 'Accepted', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    'in-progress': { label: 'In Progress', bg: 'bg-blue-500/10', text: 'text-blue-500' },
    completed: { label: 'Completed', bg: isDark ? 'bg-white' : 'bg-black', text: isDark ? 'text-black' : 'text-white' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-500' },
    declined: { label: 'Declined', bg: 'bg-red-500/10', text: 'text-red-500' },
    revision: { label: 'Revision', bg: 'bg-amber-500/10', text: 'text-amber-500' },
    negotiating: { label: 'Negotiating', bg: 'bg-purple-500/10', text: 'text-purple-500' }
  };

  useEffect(() => {
    fetchDeals();
  }, [filter, pagination.page]);

  const fetchDeals = async () => {
    setLoading(true);
    const res = await dealService.getCreatorDeals(filter === 'all' ? '' : filter, pagination.page, pagination.limit);
    if (res.success) {
      setDeals(res.deals || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } else {
      toast.error(res.error || 'Failed to load deals');
    }
    setLoading(false);
  };

  if (loading && deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
       <div>
            <h1 className="text-3xl font-light tracking-tight font-semibold">Campaign <span className="font-bold">Deals</span></h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage your active campaigns and track deal progress.</p>
          </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {['all', 'pending', 'accepted', 'in-progress', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPagination(p => ({ ...p, page: 1 })); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border ${
                filter === s 
                  ? (isDark ? 'bg-white border-white text-gray-800' : 'bg-black border-black text-white')
                  : (isDark ? 'border-zinc-800 text-zinc-500 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table Interface */}
     <div className="relative overflow-hidden">
  {deals.length > 0 ? (
    <div className="space-y-2"> {/* Tighter spacing for a dense, professional look */}
      
      {/* Header Row - Enhanced with wider tracking */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Operational Alpha</div>
        <div className="col-span-2">Capital</div>
        <div className="col-span-3">Sync Status</div>
        <div className="col-span-2">Deadline</div>
        <div className="col-span-1 text-right">Access</div>
      </div>

      {/* Deal Rows */}
      {deals.map(deal => (
        <div 
          key={deal._id}
          onClick={() => navigate(`/creator/deals/${deal._id}`)}
          className={`
            group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[1.5rem] border transition-all duration-500 cursor-pointer
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-500 hover:bg-zinc-900 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]'}
          `}
        >
          {/* Leading Status Indicator (The Left Edge Glow) */}
          <div className={`
            absolute left-0 top-1/4 bottom-1/4 w-[2px] rounded-r-full transition-all duration-500 opacity-0 group-hover:opacity-100
            ${statusConfig[deal.status]?.bg || 'bg-indigo-500'}
          `} />

          <div className="col-span-4 flex flex-col">
            <span className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-black'}`}>
              {deal.campaignId?.title || 'System Protocol'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {deal.brandId?.brandName || 'Independent Entity'}
              </span>
              <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Verified Partner</span>
            </div>
          </div>

          <div className="col-span-2 mt-4 md:mt-0">
            <span className={`text-lg font-mono font-bold tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
              {formatCurrency(deal.budget)}
            </span>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.1em] mt-0.5">Budget Allocation</p>
          </div>

          <div className="col-span-3 mt-4 md:mt-0">
            <span className={`
              inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500
              ${statusConfig[deal.status]?.bg} ${statusConfig[deal.status]?.text}
              group-hover:scale-105
            `}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-2.5 animate-pulse" />
              {statusConfig[deal.status]?.label || deal.status}
            </span>
          </div>

          <div className="col-span-2 mt-4 md:mt-0">
            <p className={`text-sm font-mono font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {deal.deadline ? formatDate(deal.deadline) : 'Rolling Cycle'}
            </p>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.1em] mt-0.5">Time Limit</p>
          </div>

          <div className="col-span-1 hidden md:flex justify-end">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
              ${isDark 
                ? 'bg-zinc-800 text-zinc-500 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-400 group-hover:bg-black group-hover:text-white'}
            `}>
              <ArrowUpRight size={18} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className={`
      relative overflow-hidden flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'}
    `}>
      {/* Decorative Grid Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      <div className={`p-5 rounded-3xl mb-6 ${isDark ? 'bg-zinc-800' : 'bg-white shadow-xl'}`}>
        <Briefcase className="w-8 h-8 text-zinc-400 stroke-[1.5px]" />
      </div>
      
      <h3 className={`text-xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-black'}`}>No active engagements</h3>
      <p className={`text-sm max-w-xs text-center mb-10 leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Your command center is awaiting new mission parameters. Browse the marketplace to begin.
      </p>
      
      <Link 
        to="/creator/available-deals" 
        className={`
          inline-flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 active:scale-95
          ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}
        `}
      >
        Initiate Protocol <ArrowUpRight size={14} strokeWidth={3} />
      </Link>
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

export default CreatorDeals;
