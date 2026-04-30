import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Calendar,
  Shield,
  Ban,
  Download,
  RefreshCw,
  ChevronDown,
  Star,
  DollarSign,
  TrendingUp,
  Users as UsersIcon,
  Building2,
  Award,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { formatCurrency, formatDate, formatNumber, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Loader from '../../components/Common/Loader';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const AdminUsers = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    loading,
    refreshing,
    users,
    stats,
    pagination,
    refreshData,
    fetchUsers,
    verifyUser,
    suspendUser,
    activateUser,
    deleteUser
  } = useAdminData();

  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('7');
  const [filters, setFilters] = useState({
    search: '',
    user_type: '',
    status: '',
    verified: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUsers(currentPage, filters);
  }, [currentPage, filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchUsers(1, newFilters);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers(1, filters);
  };

  const handleVerify = async (userId) => {
    const success = await verifyUser(userId);
    if (success) {
      setShowUserModal(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason) {
      toast.error('Please provide a reason');
      return;
    }

    const success = await suspendUser(selectedUser._id, suspendReason, suspendDuration);
    if (success) {
      setShowSuspendModal(false);
      setSuspendReason('');
      setSelectedUser(null);
    }
  };

  const handleActivate = async (userId) => {
    await activateUser(userId);
  };

  const handleDelete = async () => {
    const success = await deleteUser(selectedUser._id);
    if (success) {
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const handleExport = () => {
    // Generate CSV for users data
    const csvContent = [
      ['Name', 'Email', 'Type', 'Status', 'Verified', 'Joined', 'Last Active'].join(','),
      ...users.map(user => [
        `"${user.fullName || user.name}"`,
        `"${user.email}"`,
        user.userType,
        user.status,
        user.isVerified ? 'Verified' : 'Pending',
        user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
        user.lastLogin ? new Date(user.lastLogin).toISOString().split('T')[0] : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users data exported successfully');
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', isDark);
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return CheckCircle;
      case 'suspended': return Ban;
      case 'inactive': return Clock;
      default: return AlertCircle;
    }
  };

  const getUserTypeIcon = (type) => {
    switch(type) {
      case 'brand': return Building2;
      case 'creator': return Award;
      default: return User;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin border-2 border-zinc-300 border-t-zinc-500 rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-500 text-xs font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-6 p-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight"><span className="font-semibold ">Admin</span> <span className="font-bold">Users</span></h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Manage and monitor all platform users.</p>
        </div>

       
      </div>

      {/* Stats - Brand Dashboard Style */}
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
              <UsersIcon size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Change Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-emerald-500 bg-emerald-500/5
            `}>
              +12%
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Total Users
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {stats.totalUsers?.toLocaleString() || '0'}
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
              <Building2 size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Change Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-emerald-500 bg-emerald-500/5
            `}>
              +8%
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
                ? 'bg-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black' 
                : 'bg-zinc-50 text-zinc-600 group-hover:bg-black group-hover:text-white shadow-sm'}
            `}>
              <Award size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Change Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-emerald-500 bg-emerald-500/5
            `}>
              +15%
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
              <Clock size={18} strokeWidth={2.5} />
            </div>

            {/* Dynamic Change Badge */}
            <span className={`
              text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-md transition-colors
              text-red-500 bg-red-500/5
            `}>
              -5%
            </span>
          </div>

          <div className="space-y-1">
            <h3 className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>
              Pending Verification
            </h3>
            
            <p className={`
              text-2xl font-mono font-bold tracking-tighter transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>
              {stats.pendingVerifications?.toLocaleString() || '0'}
            </p>
          </div>

          {/* Subtle Bottom Glow Line */}
          <div className={`
            h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-4 rounded-full
            ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
          `} />
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className="relative group">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
        <input 
          type="text" 
          placeholder="Search users by name or email..."
          className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all outline-none text-sm ${
            isDark 
              ? 'bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 text-white' 
              : 'bg-zinc-50 border-zinc-100 focus:border-zinc-300 shadow-sm'
          }`}
          value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)}
        />
      </div>

      {/* Filters Panel */}
      <div className={`p-5 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">User Type</label>
            <select 
              value={filters.user_type} 
              onChange={e => handleFilterChange('user_type', e.target.value)}
              className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
            >
              <option value="">All Types</option>
              <option value="brand">Brands</option>
              <option value="creator">Creators</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Status</label>
            <select 
              value={filters.status} 
              onChange={e => handleFilterChange('status', e.target.value)}
              className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Verification</label>
            <select 
              value={filters.verified} 
              onChange={e => handleFilterChange('verified', e.target.value)}
              className={`w-full bg-transparent border-b py-1.5 focus:outline-none text-xs ${isDark ? 'border-zinc-800 !bg-black' : 'border-zinc-200'}`}
            >
              <option value="">All Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ search: '', user_type: '', status: '', verified: '', sortBy: 'createdAt', sortOrder: 'desc' })} className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors mb-1.5">Reset All</button>
          </div>
        </div>
      </div>

    {/* Users List */}
<div className="space-y-4">
  {/* Row Header - Minimalist & High Tracking */}
  <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
    <div className="col-span-4">Member Identity</div>
    <div className="col-span-2">Account Class</div>
    <div className="col-span-2 text-center">System Status</div>
    <div className="col-span-2 text-center">Vetting</div>
    <div className="col-span-2 text-right">Administrative</div>
  </div>

  {users.length > 0 ? users.map((user) => {
    const TypeIcon = getUserTypeIcon(user.userType);
    return (
      <div 
        key={user._id}
        className={`
          group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-5 rounded-[2.5rem] border 
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
        `}
      >
        {/* Profile Identity - The "Identity Card" Look */}
        <div className="col-span-4 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className={`
                p-1 rounded-[1.4rem] border transition-all duration-700 
                ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:border-zinc-500' : 'bg-white border-zinc-100 shadow-sm group-hover:border-zinc-300'}
            `}>
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  className="w-12 h-12 rounded-[1rem] object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out group-hover:scale-110" 
                  alt="" 
                />
              ) : (
                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
                  <User className="w-6 h-6 text-zinc-500 opacity-40" />
                </div>
              )}
            </div>
            {/* Minimalist Online/Status Dot */}
            <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] shadow-sm ${isDark ? 'border-zinc-900' : 'border-white'} ${user.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className={`font-bold text-[15px] tracking-tight leading-tight ${isDark ? 'text-zinc-100 group-hover:text-white' : 'text-zinc-900'}`}>
              {user.fullName}
            </span>
            <span className={`text-[11px] font-medium text-zinc-500 opacity-60 truncate tracking-tight mt-0.5`}>
              {user.email}
            </span>
          </div>
        </div>

        {/* Type Col - Modern Ghost Tag */}
        <div className="col-span-2 mt-3 md:mt-0">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
            user.userType === 'brand' 
              ? 'bg-blue-500/5 border-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              : 'bg-purple-500/5 border-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white group-hover:shadow-[0_0_20_rgba(168,85,247,0.3)]'
          }`}>
            <TypeIcon size={12} strokeWidth={3} />
            {user.userType}
          </span>
        </div>

        {/* Status Col - Centered Glass Pill */}
        <div className="col-span-2 mt-3 md:mt-0 flex justify-center">
          <div className={`
            flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all duration-300
            ${isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}
          `}>
             <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-400 opacity-50'}`} />
             <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{user.status}</span>
          </div>
        </div>

        {/* Verification Col - The "Vetting" Label */}
        <div className="col-span-2 mt-3 md:mt-0 flex flex-col items-center">
          <div className={`flex items-center gap-1.5 text-[10px] font-black tracking-[0.15em] transition-all duration-500 ${user.isVerified ? 'text-emerald-500' : 'text-zinc-500 opacity-40'}`}>
            {user.isVerified ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {user.isVerified ? 'VERIFIED' : 'PENDING'}
          </div>
          <span className="text-[8px] font-bold text-zinc-500 opacity-30 uppercase mt-1">Vetting Status</span>
        </div>

        {/* Actions Col - "Floating Utility" Layout */}
       {/* Actions Col - "Floating Utility" Layout */}
<div className="col-span-2 mt-4 md:mt-0 flex justify-end gap-2">
  {[
    { 
      icon: Eye, 
      label: "View", 
      onClick: () => { setSelectedUser(user); setShowUserModal(true); } 
    },
    ...(!user.isVerified ? [{ 
      icon: CheckCircle, 
      label: "Verify", 
      onClick: () => handleVerify(user._id) 
    }] : []),
    ...(user.status === 'active' 
      ? [{ 
          icon: Ban, 
          label: "Suspend", 
          onClick: () => { setSelectedUser(user); setShowSuspendModal(true); } 
        }]
      : [{ 
          icon: ThumbsUp, 
          label: "Activate", 
          onClick: () => handleActivate(user._id) 
        }]
    ),
    { 
      icon: Trash2, 
      label: "Delete", 
      onClick: () => { setSelectedUser(user); setShowDeleteModal(true); }, 
      isDelete: true 
    }
  ].map((action, i) => (
    <button
      key={i}
      onClick={(e) => { e.stopPropagation(); action.onClick(); }}
      className={`
        p-3 rounded-xl border transition-all duration-300 group/btn
        hover:scale-110 active:scale-90 hover:shadow-xl
        ${action.isDelete 
          ? 'text-red-500 border-transparent hover:bg-red-500 hover:text-white shadow-red-500/20' 
          : isDark 
            ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-white hover:text-black hover:border-white' 
            : 'bg-zinc-100/50 border-zinc-200/50 text-zinc-500 hover:bg-black hover:text-white hover:border-black shadow-sm'
        }
      `}
      title={action.label}
    >
      <action.icon className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-[-5deg]" strokeWidth={2.5} />
    </button>
  ))}
</div>
      </div>
    );
  }) : (
    /* Empty State - Modern Search Vibe */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-8 rounded-[2.5rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <Search className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">Zero Identities Found</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">
        No accounts match your current directory filters. Try adjusting your search query.
      </p>
    </div>
  )}
</div>
 {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedUser.profilePicture ? (
                <img src={selectedUser.profilePicture} alt={selectedUser.fullName} className="w-16 h-16 rounded-full object-cover grayscale" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="w-8 h-8 text-zinc-600" />
                </div>
              )}
              <div>
                <h3 className={`text-xl font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedUser.fullName}</h3>
                <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedUser.userType === 'brand' ? getStatusColor('brand', 'userType', isDark) : getStatusColor('creator', 'userType', isDark)
                  }`}>
                    {selectedUser.userType}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClass(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(selectedUser.isVerified ? 'verified' : 'unverified', 'status', isDark)}`}>
                    {React.createElement(selectedUser.isVerified ? CheckCircle : Clock, { className: `w-3 h-3 mr-1 ${getStatusIconColor(selectedUser.isVerified ? 'verified' : 'unverified')}` })}
                    {selectedUser.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Phone</p>
                <p className={`text-sm font-medium flex items-center ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {selectedUser.phone || 'Not provided'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Joined</p>
                <p className={`text-sm font-medium flex items-center ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  <Calendar className={`w-3 h-3 mr-2 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  {formatDate(selectedUser.createdAt)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Last Active</p>
                <p className={`text-sm font-medium flex items-center ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  <Clock className={`w-3 h-3 mr-2 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                  {selectedUser.lastLogin ? timeAgo(selectedUser.lastLogin) : 'Never'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Login Count</p>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedUser.loginCount || 0}</p>
              </div>
            </div>

            {/* Stats */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Activity</h4>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {selectedUser.userType === 'brand' ? (
                  <>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <p className="text-lg sm:text-xl font-light tracking-tighter">{selectedUser.stats?.campaigns || 0}</p>
                      <p className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Campaigns</p>
                    </div>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <p className="text-lg sm:text-xl font-light tracking-tighter">{formatCurrency(selectedUser.stats?.spent || 0)}</p>
                      <p className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Spent</p>
                    </div>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <p className="text-lg sm:text-xl font-light tracking-tighter">{selectedUser.stats?.creators || 0}</p>
                      <p className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Creators</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <p className="text-lg sm:text-xl font-light tracking-tighter">{formatNumber(selectedUser.stats?.followers || 0)}</p>
                      <p className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Followers</p>
                    </div>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <p className="text-lg sm:text-xl font-light tracking-tighter">{selectedUser.stats?.engagement || 0}%</p>
                      <p className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Engagement</p>
                    </div>
                    <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
                      <p className="text-lg sm:text-xl font-light tracking-tighter">{formatCurrency(selectedUser.stats?.earnings || 0)}</p>
                      <p className={`text-xs uppercase font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Earnings</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={`border-t pt-3 flex gap-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
                  isDark ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
                onClick={() => setShowUserModal(false)}
              >
                Close
              </button>
              {!selectedUser.isVerified && (
                <button
                  onClick={() => handleVerify(selectedUser._id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
                    isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white' : 'bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  Verify User
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend User Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedUser(null);
          setSuspendReason('');
        }}
        title="Suspend User"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              <strong>Warning:</strong> Suspending this user will prevent them from accessing their account and all active deals will be paused.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Reason for Suspension *
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows="3"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
                  : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
              }`}
              placeholder="Enter reason for suspension..."
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Suspension Duration
            </label>
            <select
              value={suspendDuration}
              onChange={(e) => setSuspendDuration(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                  : 'bg-white border-zinc-300 text-zinc-900'
              }`}
            >
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowSuspendModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSuspend}>
            Suspend User
          </Button>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className={`flex items-center gap-3 text-red-600 p-4 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-700/30' : 'bg-red-50 border border-red-200'}`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              This action is permanent and cannot be undone. All user data including campaigns, deals, and messages will be permanently deleted.
            </p>
          </div>

          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Are you sure you want to delete <strong>{selectedUser?.fullName}</strong>?
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Permanently
          </Button>
        </div>
      </Modal> 
</div>
  )
}
export default AdminUsers;