import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, TrendingUp, Loader, ChevronLeft, ChevronRight,
  RefreshCw, Archive, CheckCircle, Edit, AlertCircle, ArrowUpRight, Calendar, Activity
} from 'lucide-react';
import campaignService from '../../services/campaignService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import { useCampaign } from '../../hooks/useCampaign';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import BrandLayout from '../../components/Brand/BrandLayout';

const CampaignList = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const statusConfig = {
active: { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },    draft: { label: 'Draft', bg: isDark ? 'bg-zinc-800' : 'bg-zinc-100', text: isDark ? 'text-zinc-400' : 'text-zinc-600' },
    pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-500' },
    completed: { label: 'Completed', bg: 'bg-slate-100', text: 'text-slate-600' },
    paused: { label: 'Paused', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  };

  const fetchCampaigns = async (showToast = false) => {
    try {
      showToast ? setRefreshing(true) : setLoading(true);
      const response = await campaignService.getBrandCampaigns(
        filter === 'all' ? '' : filter,
        pagination.page,
        pagination.limit
      );

      if (response?.success) {
        setCampaigns(response.campaigns || []);
        setCounts(response.counts || {});
        setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
        if (showToast) toast.success('Campaigns refreshed');
      }
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [filter, pagination.page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCampaigns();
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  const filters = ['all', 'active', 'draft', 'pending', 'completed'].map((s) => ({
    id: s,
    label: s,
    count: counts[s] || 0
  }));

  const actionButton = (
    <Link to="/brand/campaigns/new">
     <button className="
  flex items-center gap-2 px-6 py-2.5 
  bg-gray-700 text-white text-xs font-bold uppercase tracking-widest rounded-full 
  shadow-lg shadow-gray-500/20
  
  /* Animation Classes */
  transition-all duration-300 ease-in-out
  hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5
  active:scale-95 active:translate-y-0
  focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
">
  <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
  New Campaign
</button>
    </Link>
  );

  return (
    <div >
      <BrandLayout
        title="Campaigns"
        subtitle="Monitor and scale your influencer marketing efforts."
        actionButton={actionButton}
        filters={filters}
        activeFilter={filter}
        onFilterChange={(filterId) => { setFilter(filterId); setPagination(p => ({ ...p, page: 1 })); }}
        showSearch={true}
        searchValue={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        onSearchSubmit={handleSearch}
        searchPlaceholder="Search campaigns..."
      > 
      <div className="">
     
        {/* Modern List Interface (Row Style) */}
    <div className="relative overflow-hidden">
  {campaigns.length > 0 ? (
    <div className="space-y-4">
      {/* Table Header - High Tracking Audit Style */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Campaign Strategy</div>
        <div className="col-span-2">Allocation</div>
        <div className="col-span-3 text-center">Status & Velocity</div>
        <div className="col-span-2">Timeline</div>
        <div className="col-span-1 text-right">Review</div>
      </div>

      {/* Campaign Rows */}
      {campaigns.map((campaign) => (
        <div 
          key={campaign._id} 
          onClick={() => navigate(`/brand/campaigns/${campaign._id}`)}
          className={`
            group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2.5rem] border 
            transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
          `}
        >
          {/* Title & Technical ID */}
          <div className="col-span-4 flex flex-col min-w-0">
            <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900'}`}>
              {campaign.title}
            </span>
            <div className="flex items-center gap-2 mt-1.5">
               <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border tracking-tighter font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'}`}>
                ID: {campaign._id?.slice(-8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Budget: Financial Ticker Style */}
          <div className="col-span-2 mt-4 md:mt-0 flex flex-col">
            <span className={`text-[14px] font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatCurrency(campaign.budget || 0)}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-60">Burn:</span>
               <span className="text-[10px] font-bold text-emerald-500">{formatCurrency(campaign.spent || 0)}</span>
            </div>
          </div>

          {/* Status & Progress Bar */}
          <div className="col-span-3 mt-4 md:mt-0 flex flex-col items-center gap-3 px-4">
            <span className={`
              inline-flex items-center px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
              ${statusConfig[campaign.status]?.bg} ${statusConfig[campaign.status]?.text}
            `}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
              {campaign.status}
            </span>
            
            <div className="w-full flex items-center gap-3">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden relative ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000 ease-out relative shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${campaign.progress || 0}%` }} 
                />
              </div>
              <span className="font-mono text-[11px] font-bold tracking-tighter w-8">{campaign.progress || 0}%</span>
            </div>
          </div>

          {/* Timeline: Calendar Stack */}
          <div className={`col-span-2 mt-4 md:mt-0 flex flex-col text-[11px] font-bold tracking-tight ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 opacity-40" />
              <span>{formatDate(campaign.startDate)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-40">
              <div className="w-3" /> {/* Spacer to align with icon above */}
              <span>{formatDate(campaign.endDate)}</span>
            </div>
          </div>

          {/* Action: The Circle Button */}
          <div className="col-span-1 hidden md:flex justify-end">
            <div className={`
              w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 border
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
    /* High-End Empty State */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3.5rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-8 rounded-[2.5rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Activity className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">No Active Campaigns</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[260px] text-center leading-relaxed">
        Initiate a new marketing strategy to begin tracking audience engagement and budget burn.
      </p>
    </div>
  )}
</div>

      {/* Modern Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between m-2 pt-8 border-t border-zinc-800/10 dark:border-zinc-200/10">
          <p className="text-xs font-bold text-zinc-500  uppercase tracking-[0.2em]">
            Page {pagination.page} <span className="mx-2 opacity-30">/</span> {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} 
              disabled={pagination.page === 1}
              className="p-2.5 rounded-xl border border-zinc-200 bg-black dark:text-white dark:border-zinc-400 disabled:opacity-20 hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} 
              disabled={pagination.page === pagination.pages}
              className="p-2.5 rounded-xl border border-zinc-200 bg-black dark:text-white dark:border-zinc-400 disabled:opacity-20 hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  </BrandLayout>
    </div>
  );
};

export default CampaignList;