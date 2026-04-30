// pages/Admin/Creators.jsx
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
  User,
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader,
  Instagram,
  Youtube,
  Star,
  UserCheck,
  UserX,
  Music,
  Facebook
} from 'lucide-react';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';
import { formatCurrency, formatDate, timeAgo, formatNumber } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';

const Creators = () => {
  const { creators, loading, refreshData, stats } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredCreators, setFilteredCreators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });

  useEffect(() => {
    if (creators) {
      let filtered = [...creators];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          c.displayName?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.niches?.some(niche => niche?.toLowerCase().includes(query))
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }

      // Apply niche filter
      if (nicheFilter !== 'all') {
        filtered = filtered.filter(c => c.niches?.includes(nicheFilter));
      }

      setFilteredCreators(filtered);
    }
  }, [creators, searchQuery, statusFilter, nicheFilter]);

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', false); // Creators page doesn't use theme yet
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
      case 'tiktok': return <Music className="w-4 h-4 text-black" />;
      case 'facebook': return <Facebook className="w-4 h-4 text-blue-600" />;
    }
  };

  const niches = [...new Set(creators?.flatMap(c => c.niches || []).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading creators...</p>
        </div>
      </div>
    );
  }

  const handleViewDetails = (creator) => {
    setSelectedCreator(creator);
    setShowDetailsModal(true);
  };

  const handleEdit = (creator) => {
    setSelectedCreator(creator);
    setEditForm({ status: creator.status, notes: '' });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      // This would call an admin API to update creator
      // For now, just show success
      toast.success('Creator updated successfully');
      setShowEditModal(false);
      refreshData();
    } catch (error) {
      toast.error('Failed to update creator');
    }
  };

  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Creator Name', 'Email', 'Niche', 'Status', 'Joined', 'Total Earnings', 'Campaigns', 'Followers'].join(','),
      ...filteredCreators.map(c => [
        `"${c.displayName}"`,
        `"${c.email}"`,
        `"${c.niches?.[0] || '—'}"`,
        c.status,
        formatDate(c.createdAt),
        c.stats?.totalEarnings || 0,
        c.stats?.completedCampaigns || 0,
        c.totalFollowers || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creators-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 p-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight"><span className="font-semibold">Admin</span> <span className="font-bold">Creators</span></h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Manage and monitor all creator accounts.</p>
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
          placeholder="Search creators by name, email, or niche..."
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
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Niche</label>
              <select 
                value={nicheFilter} 
                onChange={(e) => setNicheFilter(e.target.value)}
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              >
                <option value="all">All Niches</option>
                {niches.map(niche => (
                  <option key={niche} value={niche}>{niche}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Min. Followers</label>
              <input 
                type="number" 
                placeholder="e.g. 1000"
                className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
              />
            </div>
            <div className="flex items-end">
              <button onClick={() => {
                setStatusFilter('all');
                setNicheFilter('all');
                setSearchQuery('');
              }} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors mb-1.5">Reset All</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - Modern Style with Brand Dashboard Animations */}
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
              <User size={18} strokeWidth={2.5} />
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
              Creators
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {stats.totalCreators?.toLocaleString() || '0'}
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
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
            `}>
              <Users size={18} strokeWidth={2.5} />
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
              Now
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {stats.activeCreators?.toLocaleString() || '0'}
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
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
            `}>
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-amber-500 bg-amber-500/5
            `}>
              Growth
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              This Month
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              +{stats.newThisMonth?.toLocaleString() || '0'}
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
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
            `}>
              <DollarSign size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-green-500 bg-green-500/5
            `}>
              Earnings
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Total Earned
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {formatCurrency(creators?.reduce((sum, c) => sum + (c.stats?.totalEarnings || 0), 0) || 0)}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>
      </div>

      {/* Creator Cards Grid */}
     <div className="space-y-3">
  {/* Row Header - Minimal & High Contrast Labels */}
  <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
    <div className="col-span-4">Talent Profile</div>
    <div className="col-span-2">Niche Category</div>
    <div className="col-span-2 text-center">Status</div>
    <div className="col-span-2 text-center">Audience</div>
    <div className="col-span-2 text-right">Options</div>
  </div>

  {filteredCreators.length > 0 ? (
    filteredCreators.map((creator) => (
      <div 
        key={creator._id}
        className={`
          group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-5 rounded-[2rem] border 
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
        `}
      >
        {/* Profile Col - Focus on the Squircle and Typography */}
        <div className="col-span-4 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className={`p-0.5 rounded-[1.2rem] border-2 transition-colors duration-500 ${isDark ? 'border-zinc-800 group-hover:border-zinc-700' : 'border-zinc-50 group-hover:border-zinc-100'}`}>
              {creator.profilePicture ? (
                <img 
                  src={creator.profilePicture} 
                  className="w-12 h-12 rounded-[1rem] object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out group-hover:scale-105" 
                  alt="" 
                />
              ) : (
                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                  <User className="w-6 h-6 text-zinc-500" />
                </div>
              )}
            </div>
            {/* Soft Status Glow */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-[3px] ${isDark ? 'border-zinc-900' : 'border-white'} ${creator.status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-zinc-400'}`} />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className={`font-bold text-sm tracking-tight transition-colors duration-300 ${isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900'}`}>
              {creator.displayName}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 truncate lowercase">
              {creator.email}
            </span>
          </div>
        </div>

        {/* Niche Col - Minimal Tag Style */}
        <div className="col-span-2 mt-3 md:mt-0">
          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
            isDark ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-400'
          }`}>
            {creator.niches?.[0] || 'General'}
          </span>
        </div>

        {/* Status Col - Centered Glass Badge */}
        <div className="col-span-2 mt-3 md:mt-0 flex justify-center">
          <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-tighter uppercase border ${getStatusColorClass(creator.status)}`}>
            {creator.status}
          </span>
        </div>

        {/* Followers Col - Modern Bold Metrics */}
        <div className="col-span-2 mt-3 md:mt-0 flex flex-col items-center">
          <span className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {formatNumber(creator.totalFollowers || 0)}
          </span>
          <span className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 opacity-60">
            Followers
          </span>
        </div>

        {/* Action Col - Floating Circular Controls */}
        <div className="col-span-2 mt-3 md:mt-0 flex justify-end gap-2">
          <motion.button 
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleViewDetails(creator)}
            className={`p-2.5 rounded-xl transition-all ${
              isDark 
                ? 'bg-white text-white hover:bg-zinc-200' 
                : 'bg-black text-white hover:bg-zinc-800'
            } shadow-lg shadow-black/10`}
          >
            <Eye className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>

          <motion.button 
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleEdit(creator)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-500' 
                : 'border-zinc-200 bg-white text-zinc-500 hover:text-black hover:border-zinc-400 shadow-sm'
            }`}
          >
            <Edit className="w-4 h-4" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    ))
  ) : (
    <div className={`text-center py-24 rounded-[3rem] border-2 border-dashed ${isDark ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-100 bg-zinc-50/20'}`}>
      <div className={`w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-white shadow-sm'}`}>
        <User className="w-8 h-8 text-zinc-700 opacity-20" />
      </div>
      <h3 className="text-sm font-bold tracking-tight">No Creators Registered</h3>
      <p className="text-xs text-zinc-500 mt-1">Adjust your search or check back later.</p>
    </div>
  )}
</div>

      {/* Creator Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Creator Details"
        size="lg"
      >
        {selectedCreator && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedCreator.profilePicture ? (
                <img src={selectedCreator.profilePicture} alt={selectedCreator.displayName} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-600" />
                </div>
              )}
              <div>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedCreator.displayName}</h3>
                <p className={`${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>{selectedCreator.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClass(selectedCreator.status)}`}>
                    {selectedCreator.status}
                  </span>
                  {selectedCreator.isVerified && (
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
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Primary Niche</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedCreator.niches?.[0] || '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Engagement Rate</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedCreator.averageEngagement?.toFixed(1) || '0'}%</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Total Followers</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{formatNumber(selectedCreator.totalFollowers || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Joined</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{formatDate(selectedCreator.createdAt)}</p>
              </div>
            </div>

            {/* Social Media Platforms */}
            {selectedCreator.socialMedia && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                <p className={`text-xs mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Social Media</p>
                <div className="flex gap-2">
                  {selectedCreator.socialMedia?.instagram && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-100 text-pink-600">
                      <Instagram className="w-3 h-3" />
                      <span className="text-xs">Instagram</span>
                    </div>
                  )}
                  {selectedCreator.socialMedia?.youtube && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-600">
                      <Youtube className="w-3 h-3" />
                      <span className="text-xs">YouTube</span>
                    </div>
                  )}
                  {selectedCreator.socialMedia?.tiktok && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black text-white">
                      <Music className="w-3 h-3" />
                      <span className="text-xs">TikTok</span>
                    </div>
                  )}
                  {selectedCreator.socialMedia?.facebook && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white">
                      <Facebook className="w-3 h-3" />
                      <span className="text-xs">Facebook</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <h4 className={`font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Activity</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-zinc-600">{selectedCreator.stats?.completedCampaigns || 0}</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Campaigns</p>
                </div>
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-zinc-600">{formatCurrency(selectedCreator.stats?.totalEarnings || 0)}</p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Earned</p>
                </div>
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-lg sm:text-2xl font-bold text-zinc-600">{selectedCreator.stats?.averageRating?.toFixed(1) || '0'}</span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>Rating</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Creator Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Creator"
      >
        {selectedCreator && (
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
                placeholder="Add notes about this creator..."
              />
            </div>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-800/30' : 'bg-yellow-50'}`}>
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                <strong>Warning:</strong> Changing status may affect the creator's ability to access the platform.
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

export default Creators;