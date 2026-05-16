// pages/Creator/AvailableDeals.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, DollarSign, Users, Clock, Briefcase, Loader, Filter,
  X, AlertCircle, ArrowUpRight, Zap, Layers, Globe
} from 'lucide-react';
import creatorService from '../../services/creatorService';
import { formatCurrency } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const AvailableDeals = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ==================== STATE (KEEPING YOUR LOGIC) ====================
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [applicationData, setApplicationData] = useState({
    proposal: '',
    rate: '',
    portfolio: []
  });
  const [filters, setFilters] = useState({
    category: '',
    minBudget: '',
    maxBudget: '',
    platform: '',
    niche: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 1000, total: 0, pages: 1 });
  const [error, setError] = useState('');

  // ==================== CONSTANTS ====================
  const categories = ['Fashion', 'Beauty', 'Fitness', 'Technology', 'Food & Beverage', 'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance'];
  const platforms = ['instagram', 'youtube', 'tiktok', 'facebook'];

  // ==================== FUNCTIONS (KEEPING YOUR LOGIC) ====================
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await creatorService.getAvailableCampaigns({ ...filters, q: searchQuery }, 1, 1000);
      if (response.success) {
        setCampaigns(response.campaigns || []);
        setPagination({
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 10,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1
        });
      } else {
        setError(response.error || 'Failed to load campaigns');
        setCampaigns([]);
      }
    } catch (error) {
      setError('Network error. Please try again.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, [filters, pagination.page, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCampaigns();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ category: '', minBudget: '', maxBudget: '', platform: '', niche: '' });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleApply = (campaign) => {
    setSelectedCampaign(campaign);
    setApplicationData({ proposal: '', rate: campaign.budget || '', portfolio: [] });
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!applicationData.proposal) {
      toast.error('Please write a proposal');
      return;
    }
    try {
      const response = await creatorService.applyToCampaign(selectedCampaign._id, applicationData);
      if (response.success) {
        toast.success('Application submitted successfully!');
        setShowApplyModal(false);
        fetchCampaigns();
      } else {
        toast.error(response.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('Failed to submit application');
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Scanning opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Marketplace <span className="font-bold">Deals</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Browse and apply to new brand partnership opportunities.</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
            {pagination.total} Open Opportunities
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col space-y-4">
        <form onSubmit={handleSearch} className="relative flex items-center gap-3">
          <div className="relative flex-1 group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDark ? 'text-zinc-600 group-focus-within:text-white' : 'text-zinc-400 group-focus-within:text-black'}`} />
            <input
              type="text"
              placeholder="Search by brand, category or keyword..."
              className={`w-full pl-11 pr-4 py-3 text-sm rounded-2xl border outline-none transition-all ${
                isDark ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 focus:bg-zinc-900' : 'bg-white border-zinc-200 focus:border-black focus:shadow-lg focus:shadow-zinc-200/50'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border transition-all ${
              showFilters 
              ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
              : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400')
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </form>

        {/* Professional Filter Panel */}
        {showFilters && (
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 p-6 rounded-2xl border animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Category</label>
              <select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} className={`w-full bg-transparent border-b py-1 text-sm outline-none ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
                <option value="" className="!bg-black text-white">All Segments</option>
                {categories.map(cat => <option className="!bg-black text-white" key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Platform</label>
              <select  value={filters.platform} onChange={(e) => handleFilterChange('platform', e.target.value)} className={`w-full bg-transparent border-b py-1 text-sm outline-none ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
                <option value="" className="!bg-black text-white">All Channels</option> 
                {platforms.map (plat => <option className="!bg-black text-white" key={plat} value={plat}>{plat.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Budget Min</label>
              <input type="number" placeholder="$ 0" value={filters.minBudget} onChange={(e) => handleFilterChange('minBudget', e.target.value)} className={`w-full bg-transparent border-b py-1 text-sm outline-none ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <button onClick={clearFilters} className="text-[10px] font-bold uppercase hover:underline opacity-50">Reset</button>
            </div>
          </div>
        )}
      </div>

      {/* Table Interface */}
      <div className="relative overflow-hidden">
        {campaigns.length > 0 ? (
          <div className="space-y-2">
            
            {/* Header Row */}
            <div className={`hidden md:grid grid-cols-12 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <div className="col-span-4">Operational Alpha</div>
              <div className="col-span-2">Capital</div>
              <div className="col-span-3">Mission Status</div>
              <div className="col-span-2">Deadline</div>
              <div className="col-span-1 text-right">Access</div>
            </div>

            {/* Campaign Rows */}
            {campaigns.map(campaign => {
              const daysLeft = campaign.endDate ? Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30;
              
              return (
                <div 
                  key={campaign._id}
                  className="
                    group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[1.5rem] border transition-all duration-500 cursor-pointer
                    hover:border-zinc-500 hover:bg-zinc-900 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]
                  "
                  style={{
                    backgroundColor: isDark ? 'rgba(24, 24, 27, 0.4)' : 'white',
                    borderColor: isDark ? 'rgba(63, 63, 70, 0.6)' : 'rgba(244, 244, 245, 1)'
                  }}
                >
                  {/* Leading Status Indicator */}
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] rounded-r-full transition-all duration-500 opacity-0 group-hover:opacity-100 bg-indigo-500" />

                  <div className="col-span-4 flex flex-col">
                    <span className="text-base font-bold tracking-tight truncate" style={{ color: isDark ? 'white' : 'black' }}>
                      {campaign.title || 'System Protocol'}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
                        {campaign.brandId?.brandName || 'Independent Entity'}
                      </span>
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isDark ? '#27272a' : '#e4e4e7' }} />
                      <span className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: '#71717a' }}>Verified Partner</span>
                    </div>
                  </div>

                  <div className="col-span-2 mt-4 md:mt-0">
                    <span className="text-lg font-mono font-bold tracking-tighter" style={{ color: isDark ? 'white' : 'black' }}>
                      {formatCurrency(campaign.budget || 0)}
                    </span>
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] mt-0.5" style={{ color: '#71717a' }}>Budget Allocation</p>
                  </div>

                  <div className="col-span-3 mt-4 md:mt-0">
                    <span className="
                      inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500
                      bg-emerald-500/10 text-emerald-500 group-hover:scale-105
                    ">
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2.5 animate-pulse" />
                      Available
                    </span>
                  </div>

                  <div className="col-span-2 mt-4 md:mt-0">
                    <p className="text-sm font-mono font-medium" style={{ color: isDark ? '#a1a1aa' : '#737373' }}>
                      {daysLeft}d remaining
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] mt-0.5" style={{ color: '#71717a' }}>Time Limit</p>
                  </div>

                  <div className="col-span-1 hidden md:flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(campaign);
                      }}
                      className="
                        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500
                        bg-zinc-800 text-zinc-500 group-hover:bg-white group-hover:text-black
                      "
                    >
                      <ArrowUpRight size={18} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="
            relative overflow-hidden flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
          " style={{
            backgroundColor: isDark ? 'rgba(24, 24, 27, 0.2)' : 'rgba(250, 250, 250, 0.5)',
            borderColor: isDark ? '#27272a' : '#e4e4e7'
          }}>
            {/* Decorative Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="p-5 rounded-3xl mb-6" style={{ backgroundColor: isDark ? '#18181b' : 'white', boxShadow: isDark ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <Briefcase className="w-8 h-8 stroke-[1.5px]" style={{ color: '#71717a' }} />
            </div>
            
            <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: isDark ? 'white' : 'black' }}>No active opportunities</h3>
            <p className="text-sm max-w-xs text-center mb-10 leading-relaxed" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
              Your command center is awaiting new mission parameters. Modify your filters to discover more opportunities.
            </p>
          </div>
        )}
      </div>


      {/* Apply Modal (Keep Logic) */}
    <Modal 
  isOpen={showApplyModal} 
  onClose={() => setShowApplyModal(false)} 
  title="Mission Protocol: Submit Proposal" 
  size="lg"
>
  {selectedCampaign && (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header: Tactical Briefing Box */}
      <div className={`
        relative p-6 rounded-[2rem] border overflow-hidden transition-all duration-700
        ${isDark 
          ? 'bg-zinc-900/80 border-zinc-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
          : 'bg-zinc-50 border-zinc-200'}
      `}>
        {/* Subtle Decorative Grid background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-2 animate-pulse">
            Target Partner Identified
          </p>
          <h3 className={`font-black text-2xl tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>
            {selectedCampaign.brandId?.brandName}
          </h3>
          <p className={`text-[11px] font-mono mt-1 opacity-60 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            REF: {selectedCampaign.title}
          </p>
          {selectedCampaign.description && (
            <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'}`}>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {selectedCampaign.description}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Pitch Details Field */}
        <div className="space-y-3 group">
          <div className="flex justify-between items-center px-1">
            <label className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isDark ? 'text-zinc-600 group-focus-within:text-white' : 'text-zinc-400 group-focus-within:text-black'}`}>
              Creative Strategy & Pitch
            </label>
            <span className="text-[9px] font-mono opacity-40 italic">Required Input</span>
          </div>
          <textarea
            rows="5"
            value={applicationData.proposal}
            onChange={(e) => setApplicationData({...applicationData, proposal: e.target.value})}
            className={`
              w-full p-5 text-[13px] leading-relaxed rounded-[1.5rem] border outline-none transition-all duration-500
              ${isDark 
                ? 'bg-zinc-800/50 border-zinc-700 focus:border-zinc-400 focus:bg-zinc-800' 
                : 'bg-white border-zinc-200 focus:border-black shadow-sm'}
            `}
            placeholder="Outline your creative angle and execution strategy..."
          />
        </div>

        {/* Compensation Field */}
        <div className="space-y-3 group">
          <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 transition-colors ${isDark ? 'text-zinc-600 group-focus-within:text-white' : 'text-zinc-400 group-focus-within:text-black'}`}>
            Requested Settlement (USD)
          </label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-mono text-zinc-500 font-bold">$</span>
            <input
              type="number"
              value={applicationData.rate}
              onChange={(e) => setApplicationData({...applicationData, rate: e.target.value})}
              className={`
                w-full pl-10 p-5 text-lg font-mono font-bold tracking-tighter rounded-[1.5rem] border outline-none transition-all duration-500
                ${isDark 
                  ? 'bg-zinc-800/50 border-zinc-700 focus:border-zinc-400 focus:bg-zinc-800 text-white' 
                  : 'bg-white border-zinc-200 focus:border-black text-black'}
              `}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex gap-4 pt-6">
        <button 
          onClick={() => setShowApplyModal(false)} 
          className={`
            flex-1 py-4 text-[10px] font-black uppercase tracking-[0.25em] border rounded-2xl transition-all duration-300
            ${isDark 
              ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-white' 
              : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50 hover:text-black'}
          `}
        >
          Abort
        </button>
        
        <button 
          onClick={handleSubmitApplication} 
          className={`
            flex-[2] relative overflow-hidden py-4 text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl transition-all duration-500 group/submit
            ${isDark 
              ? 'bg-white text-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
              : 'bg-black text-white hover:bg-zinc-800 shadow-xl shadow-black/20'}
          `}
        >
          {/* Internal Shimmer Animation */}
          <div className="absolute inset-0 w-full h-full transform -translate-x-full group-hover/submit:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-zinc-400/20 to-transparent" />
          
          <span className="relative z-10 flex items-center justify-center gap-2">
            Transmit Proposal <ArrowUpRight size={14} strokeWidth={3} />
          </span>
        </button>
      </div>
    </div>
  )}
</Modal>
    </div>
  );
};

export default AvailableDeals;