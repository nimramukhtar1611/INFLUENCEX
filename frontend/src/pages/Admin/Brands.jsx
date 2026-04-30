// pages/Admin/Brands.jsx
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  Download,
  TrendingUp,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  ArrowUpRight,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader
} from 'lucide-react';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';
import { formatCurrency, formatDate, timeAgo, formatNumber } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';

const Brands = () => {
  const { brands, loading, refreshData, stats } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });

  useEffect(() => {
    if (brands) {
      let filtered = [...brands];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(b => 
          b.brandName?.toLowerCase().includes(query) ||
          b.email?.toLowerCase().includes(query) ||
          b.industry?.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === statusFilter);
      }

      // Apply industry filter
      if (industryFilter !== 'all') {
        filtered = filtered.filter(b => b.industry === industryFilter);
      }

      setFilteredBrands(filtered);
    }
  }, [brands, searchQuery, statusFilter, industryFilter]);

  const handleViewDetails = (brand) => {
    setSelectedBrand(brand);
    setShowDetailsModal(true);
  };

  const handleEdit = (brand) => {
    setSelectedBrand(brand);
    setEditForm({ status: brand.status, notes: '' });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      // This would call an admin API to update brand
      // For now, just show success
      toast.success('Brand updated successfully');
      setShowEditModal(false);
      refreshData();
    } catch (error) {
      toast.error('Failed to update brand');
    }
  };

  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Brand Name', 'Email', 'Industry', 'Status', 'Joined', 'Total Spent', 'Campaigns', 'Creators'].join(','),
      ...filteredBrands.map(b => [
        `"${b.brandName}"`,
        `"${b.email}"`,
        `"${b.industry}"`,
        b.status,
        formatDate(b.createdAt),
        b.stats?.totalSpent || 0,
        b.stats?.totalCampaigns || 0,
        b.stats?.totalCreators || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', false); // Brands page doesn't use theme yet
  };

  const industries = [...new Set(brands?.map(b => b.industry).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-6 p-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight"><span className="font-semibold">Admin</span> <span className="font-bold">Brands</span></h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Manage and monitor all brand accounts.</p>
        </div>

        <div className="flex items-center gap-2">
         
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
              showFilters 
                ? (isDark ? 'bg-black border-white text-white' : 'bg-black border-black text-white')
                : (isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500')
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" /> Filters
          </button>
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className="relative group">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <input 
          type="text" 
          placeholder="Search brands by name, email, or industry..."
          className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all outline-none text-sm ${
            isDark 
              ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 text-white' 
              : 'bg-zinc-50 border-zinc-100 focus:border-zinc-300 shadow-sm'
          }`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Industry</label>
              <select 
                value={industryFilter} 
                onChange={(e) => setIndustryFilter(e.target.value)}
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              >
                <option value="all">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Min. Campaigns</label>
              <input 
                type="number" 
                placeholder="e.g. 5"
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              />
            </div>
            <div className="flex items-end">
              <button onClick={() => {
                setStatusFilter('all');
                setIndustryFilter('all');
                setSearchQuery('');
              }} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors mb-1.5">Reset All</button>
            </div>
          </div>
        </div>
      )}

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
              <Building2 size={18} strokeWidth={2.5} />
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
              Brands
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {stats.totalBrands?.toLocaleString() || '0'}
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
              {brands?.filter(b => b.status === 'active').length || 0}
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
              Verification
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {brands?.filter(b => b.status === 'pending').length || 0}
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
              Revenue
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Total Spent
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {formatCurrency(brands?.reduce((sum, b) => sum + (b.stats?.totalSpent || 0), 0) || 0)}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>
      </div>

      {/* Brand Cards Grid */}
     <div className="space-y-3">
  {/* Row Header - Minimalist & Spaced */}
  <div className={`hidden md:grid grid-cols-12 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
    <div className="col-span-4">Brand Entity</div>
    <div className="col-span-2">Market Sector</div>
    <div className="col-span-2 text-center">Status</div>
    <div className="col-span-2 text-center">Metrics</div>
    <div className="col-span-2 text-right">Options</div>
  </div>

  {filteredBrands.length > 0 ? (
    filteredBrands.map((brand, index) => (
      <div 
        key={brand._id}
        className={`group grid grid-cols-1 md:grid-cols-12 items-center px-6 py-4 rounded-2xl border transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
        }`}
      >
        {/* Profile Col - Enhanced Hierarchy */}
        <div className="col-span-4 flex items-center gap-4">
          <div className="relative shrink-0">
            {brand.logo ? (
              <img 
                src={brand.logo} 
                className="w-11 h-11 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                alt="" 
              />
            ) : (
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <Building2 className="w-5 h-5 text-zinc-500" />
              </div>
            )}
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className={`font-bold text-[13px] tracking-tight truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {brand.brandName}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 truncate lowercase">
              {brand.email}
            </span>
          </div>
        </div>

        {/* Industry Col - Refined Typography */}
        <div className="col-span-2 mt-3 md:mt-0">
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
            isDark ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-400'
          }`}>
            {brand.industry || 'General'}
          </span>
        </div>

        {/* Status Col - Glassy Dot Indicator */}
        <div className="col-span-2 mt-3 md:mt-0 flex justify-center">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColorClass(brand.status)}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
               brand.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-400'
            }`} />
            {brand.status}
          </span>
        </div>

        {/* Campaigns Col - Modern Metric Display */}
        <div className="col-span-2 mt-3 md:mt-0 flex flex-col items-center">
          <span className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {brand.stats?.totalCampaigns || 0}
          </span>
          <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 opacity-70">
            Records
          </span>
        </div>

        {/* Action Col - Clean Button Group */}
        <div className="col-span-2 mt-3 md:mt-0 flex justify-end gap-2">
          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleViewDetails(brand)}
            className={`p-2.5 rounded-xl transition-all ${
              isDark 
                ? 'bg-white text-white hover:bg-zinc-200' 
                : 'bg-black text-white hover:bg-zinc-800'
            } shadow-lg shadow-black/10`}
          >
            <Eye className="w-4 h-4" />
          </motion.button>

          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleEdit(brand)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white' 
                : 'border-zinc-200 bg-white text-zinc-500 hover:text-black'
            }`}
          >
            <Edit className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    ))
  ) : (
    <div className={`text-center py-24 rounded-[2rem] border-2 border-dashed ${isDark ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-100 bg-zinc-50/20'}`}>
      <Building2 className="w-10 h-10 mx-auto mb-4 text-zinc-700 opacity-20" />
      <h3 className="text-sm font-bold tracking-tight">No Entities Found</h3>
      <p className="text-xs text-zinc-500 mt-1">Refine your search parameters.</p>
    </div>
  )}
</div>
      {/* Brand Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Brand Details"
        size="lg"
      >
        {selectedBrand && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedBrand.logo ? (
                <img src={selectedBrand.logo} alt={selectedBrand.brandName} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-zinc-600" />
                </div>
              )}
              <div>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedBrand.brandName}</h3>
                <p className={`${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{selectedBrand.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClass(selectedBrand.status)}`}>
                    {selectedBrand.status}
                  </span>
                  {selectedBrand.isVerified && (
                    <span className={`flex items-center text-xs ${getStatusColor('verified', 'status', false).split(' ')[1]}`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Industry</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedBrand.industry || '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Website</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>
                  {selectedBrand.website ? (
                    <a href={selectedBrand.website} target="_blank" rel="noopener noreferrer" className={isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-600 hover:text-zinc-700'}>
                      {selectedBrand.website}
                    </a>
                  ) : '—'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Phone</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedBrand.phone || '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Joined</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{formatDate(selectedBrand.createdAt)}</p>
              </div>
            </div>

            {selectedBrand.address && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Address</p>
                <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {selectedBrand.address.street && `${selectedBrand.address.street}, `}
                  {selectedBrand.address.city && `${selectedBrand.address.city}, `}
                  {selectedBrand.address.state && `${selectedBrand.address.state} `}
                  {selectedBrand.address.zipCode && `${selectedBrand.address.zipCode}, `}
                  {selectedBrand.address.country || ''}
                </p>
              </div>
            )}

            {/* Stats */}
            <div>
              <h4 className={`font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Activity</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-zinc-600">{selectedBrand.stats?.totalCampaigns || 0}</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Campaigns</p>
                </div>
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-zinc-600">{formatCurrency(selectedBrand.stats?.totalSpent || 0)}</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Spent</p>
                </div>
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-zinc-600">{selectedBrand.stats?.totalCreators || 0}</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Creators</p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            {selectedBrand.teamMembers?.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Team Members</h4>
                <div className="space-y-2">
                  {selectedBrand.teamMembers.slice(0, 5).map(member => (
                    <div key={member._id} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Users className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>
                            {member.userId?.fullName || 'Pending User'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'} truncate`}>{member.userId?.email || member.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize whitespace-nowrap flex-shrink-0 ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                  {selectedBrand.teamMembers.length > 5 && (
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'} text-center`}>+{selectedBrand.teamMembers.length - 5} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Brand"
      >
        {selectedBrand && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-800 text-zinc-100'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Admin Notes
              </label>
              <textarea
                rows="4"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
                  isDark 
                    ? 'bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                }`}
                placeholder="Add notes about this brand..."
              />
            </div>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-800/30' : 'bg-yellow-50'}`}>
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                <strong>Warning:</strong> Changing status may affect the brand's ability to access the platform.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Brands;