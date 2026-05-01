// pages/Admin/Payments.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import {
  Search,
  Filter,
  Eye,
  DollarSign,
  Wallet,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Loader
} from 'lucide-react';
import Modal from '../../components/Common/Modal';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const { payments, loading, refreshData, stats, approveWithdrawal } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ==================== STATUS CONFIGURATION ====================
  // Using consistent color scheme from colorScheme.js

  // ==================== FILTER PAYMENTS ====================
  useEffect(() => {
    if (payments) {
      let filtered = [...payments];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.transactionId?.toLowerCase().includes(query) ||
          p.from?.brandName?.toLowerCase().includes(query) ||
          p.from?.fullName?.toLowerCase().includes(query) ||
          p.to?.displayName?.toLowerCase().includes(query) ||
          p.to?.fullName?.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        filtered = filtered.filter(p => p.type === typeFilter);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch(dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
            break;
        }
      }

      setFilteredPayments(filtered);
    }
  }, [payments, searchQuery, statusFilter, typeFilter, dateFilter]);

  // ==================== HANDLE VIEW DETAILS ====================
  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  // ==================== EXPORT CSV ====================
  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Transaction ID', 'From', 'To', 'Amount', 'Fee', 'Net', 'Status', 'Type', 'Date'].join(','),
      ...filteredPayments.map(p => [
        p.transactionId,
        `"${p.from?.brandName || p.from?.fullName || ''}"`,
        `"${p.to?.displayName || p.to?.fullName || ''}"`,
        p.amount || 0,
        p.fee || 0,
        p.netAmount || 0,
        p.status,
        p.type,
        p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ==================== REFRESH DATA ====================
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      toast.success('Payment data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // ==================== HANDLE APPROVE WITHDRAWAL ====================
  const handleApproveWithdrawal = async (payment) => {
    if (!window.confirm(`Are you sure you want to approve this withdrawal of ${formatCurrency(payment.amount)} for ${payment.from?.fullName || 'the creator'}?`)) {
      return;
    }

    try {
      const success = await approveWithdrawal(payment._id);
      if (success) {
        refreshData();
      }
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  // ==================== STATUS HELPERS ====================
  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return CheckCircle;
      case 'pending':
      case 'processing':
        return Clock;
      case 'failed':
        return XCircle;
      case 'refunded':
        return RefreshCw;
      case 'in-escrow':
        return Wallet;
      default:
        return AlertCircle;
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'escrow':
      case 'payment':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case 'refund':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  // ==================== CALCULATE TOTALS ====================
  const calculateTotals = () => {
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed' && p.type !== 'withdrawal')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalFees = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.fee || 0), 0);
    
    const totalWithdrawals = filteredPayments
      .filter(p => p.status === 'completed' && p.type === 'withdrawal')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return { totalRevenue, totalFees, totalWithdrawals };
  };

  const totals = calculateTotals();
  const cardRevenue = Number(stats.totalRevenue || totals.totalRevenue || 0);
  const cardFees = Number(stats.totalFees || totals.totalFees || 0);
  const cardPending = Number(
    stats.pendingPayouts ||
    filteredPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0) ||
    0
  );
  const cardWithdrawals = Number(stats.pendingWithdrawalAmount || totals.totalWithdrawals || 0);

  // ==================== LOADING STATE ====================
  if (loading && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading admin payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Admin <span className="font-bold">Payments</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage all platform transactions and payments.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className={`p-2.5 rounded-full border transition-all ${isDark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500'}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExport}
            className={`p-2.5 rounded-full border transition-all ${isDark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500'}`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats as Status Tabs (Brand Dashboard Style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <div 
          className={`
            group px-6 py-4 rounded-[2rem] border flex flex-col min-w-[180px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
            <span className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>Total Revenue</span>
            <span className={`
              text-xl font-mono font-bold tracking-tighter mt-1 transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>{formatCurrency(cardRevenue)}</span>
            {/* Subtle Bottom Glow Line */}
            <div className={`
              h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-3 rounded-full
              ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
            `} />
        </div>
        
        <div 
          className={`
            group px-6 py-4 rounded-[2rem] border flex flex-col min-w-[180px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
            <span className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>Platform Fees</span>
            <span className={`
              text-xl font-mono font-bold tracking-tighter mt-1 transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>{formatCurrency(cardFees)}</span>
            {/* Subtle Bottom Glow Line */}
            <div className={`
              h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-3 rounded-full
              ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
            `} />
        </div>
        
        <div 
          className={`
            group px-6 py-4 rounded-[2rem] border flex flex-col min-w-[180px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
            <span className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>Pending</span>
            <span className={`
              text-xl font-mono font-bold tracking-tighter mt-1 transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>{formatCurrency(cardPending)}</span>
            {/* Subtle Bottom Glow Line */}
            <div className={`
              h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-3 rounded-full
              ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
            `} />
        </div>
        
        <div 
          className={`
            group px-6 py-4 rounded-[2rem] border flex flex-col min-w-[180px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            cursor-default hover:scale-[1.02]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-600 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)]'}
          `}
        >
            <span className={`
              text-[10px] font-black uppercase tracking-[0.15em] transition-colors
              ${isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'}
            `}>Withdrawals</span>
            <span className={`
              text-xl font-mono font-bold tracking-tighter mt-1 transition-all
              ${isDark ? 'text-white' : 'text-black'}
            `}>{formatCurrency(cardWithdrawals)}</span>
            {/* Subtle Bottom Glow Line */}
            <div className={`
              h-[2px] w-0 group-hover:w-full transition-all duration-700 mt-3 rounded-full
              ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
            `} />
        </div>
      </div>

      {/* Search and Filters - Simplified */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <input
              type="text"
              placeholder="Search by transaction ID, brand, or creator..."
              className={`w-full pl-10 pr-4 py-3 text-sm bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white text-zinc-100 placeholder:text-zinc-500' : 'border-zinc-100 focus:border-black text-zinc-900 placeholder:text-zinc-400'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              varient="secondary"
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider  border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white text-zinc-100 ' : 'border-zinc-100 focus:border-black text-zinc-900'}`}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="in-escrow">In Escrow</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white text-zinc-100' : 'border-zinc-100 focus:border-black text-zinc-900'}`}
            >
              <option value="all">All Types</option>
              <option value="payment">Payment</option>
              <option value="escrow">Escrow</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="refund">Refund</option>
              <option value="fee">Fee</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                showFilters 
                  ? isDark ? 'border-white text-white' : 'border-black text-black'
                  : isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'
              }`}
            >
              {showFilters ? 'Filters Applied' : 'More Filters'}
            </button>
          </div>
        </div>

        {/* Advanced Filters - Simplified */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="number"
                placeholder="Min. Amount ($)"
                className={`px-4 py-2 text-sm bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white text-zinc-100 placeholder:text-zinc-500' : 'border-zinc-100 focus:border-black text-zinc-900 placeholder:text-zinc-400'}`}
              />
              <input
                type="number"
                placeholder="Max. Amount ($)"
                className={`px-4 py-2 text-sm bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white text-zinc-100 placeholder:text-zinc-500' : 'border-zinc-100 focus:border-black text-zinc-900 placeholder:text-zinc-400'}`}
              />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white text-zinc-100' : 'border-zinc-100 focus:border-black text-zinc-900'}`}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Payments Table - Card Style like Brand */}
     <div className="space-y-3">
  {/* Table Header - Ultra-Minimalist Fintech Style */}
  <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
    <div className="col-span-4">Audit Ledger & Entities</div>
    <div className="col-span-2 text-center">Net Amount</div>
    <div className="col-span-3 text-center">Settlement</div>
    <div className="col-span-2 text-center">Timestamp</div>
    <div className="col-span-1 text-right">Method</div>
  </div>

  {/* Payment Rows */}
  {filteredPayments.length > 0 ? (
    filteredPayments.map((payment) => (
      <div 
        key={payment._id}
        onClick={() => handleViewDetails(payment)}
        className={`
          group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-5 rounded-[2rem] border 
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer
          ${isDark 
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
            : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
        `}
      >
        {/* Transaction & Parties - Fintech Focus */}
        <div className="col-span-4 flex items-center gap-4">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors
            ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:bg-zinc-700' : 'bg-zinc-50 border-zinc-100 group-hover:bg-zinc-100 group-hover:border-zinc-200'}
          `}>
            <CreditCard className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`font-mono text-[11px] font-bold tracking-tighter mb-1 uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              #{payment.transactionId?.slice(-12)}
            </span>
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-tight">
              <span className={isDark ? 'text-zinc-100' : 'text-zinc-900'}>
                {payment.from?.brandName || payment.from?.fullName || 'System'}
              </span>
              <ArrowRight className="w-3 h-3 opacity-30" />
              <span className={isDark ? 'text-zinc-100' : 'text-zinc-900'}>
                {payment.to?.displayName || payment.to?.fullName || 'System'}
              </span>
            </div>
          </div>
        </div>

        {/* Amount - Modern Large Typography */}
        <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
          <span className={`text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {formatCurrency(payment.amount || 0)}
          </span>
          {payment.fee > 0 && (
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-80">
              +{formatCurrency(payment.fee)} fee
            </span>
          )}
        </div>

        {/* Status - Glassmorphic Pill */}
        <div className="col-span-3 mt-4 md:mt-0 flex justify-center">
          <span className={`
            inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
            transition-all duration-300 ${getStatusColor(payment.status, 'payment', isDark)}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current mr-2.5 ${payment.status === 'completed' ? '' : 'animate-pulse'}`} />
            {payment.status}
          </span>
        </div>

        {/* Date - Clean Time Ago */}
        <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
          <span className={`text-[12px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {timeAgo(payment.createdAt)}
          </span>
          <span className="text-[9px] uppercase font-black tracking-widest opacity-30">Recorded</span>
        </div>

        {/* Type - Styled Badge */}
        <div className="col-span-1 hidden md:flex justify-end">
          <span className={`
            px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border
            ${isDark ? 'border-zinc-800 text-zinc-600 group-hover:text-zinc-400' : 'border-zinc-100 text-zinc-300 group-hover:text-zinc-500'}
          `}>
            {payment.type}
          </span>
        </div>
      </div>
    ))
  ) : (
    /* Empty State */
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-6 rounded-[2rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <CreditCard className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">No Financial Records</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">
        Your transaction ledger is currently empty.
      </p>
    </div>
  )}
</div>

      {/* Payment Details Modal - Brand Style */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Payment Details"
      >
        {selectedPayment && (
          <div className="space-y-6 pt-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Transaction ID</p>
                  <p className={`font-mono text-lg font-light tracking-tighter mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedPayment.transactionId}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedPayment.status, 'payment', isDark)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
                  {selectedPayment.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>From</p>
                <p className={`text-sm font-medium mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedPayment.from?.brandName || selectedPayment.from?.fullName || '—'}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{selectedPayment.from?.accountType || ''}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>To</p>
                <p className={`text-sm font-medium mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'} truncate`}>{selectedPayment.to?.displayName || selectedPayment.to?.fullName || '—'}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{selectedPayment.to?.accountType || ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Amount</p>
                <p className={`text-xl font-light tracking-tighter mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatCurrency(selectedPayment.amount || 0)}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Fee</p>
                <p className={`text-lg font-light tracking-tighter mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-700'}`}>{formatCurrency(selectedPayment.fee || 0)}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Net Amount</p>
                <p className={`text-xl font-light tracking-tighter mt-1 text-green-600`}>{formatCurrency(selectedPayment.netAmount || selectedPayment.amount)}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Type</p>
                <p className={`text-sm font-medium capitalize mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{selectedPayment.type}</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Date</p>
              <p className={`text-sm font-medium mt-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{formatDate(selectedPayment.createdAt)}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{timeAgo(selectedPayment.createdAt)}</p>
            </div>

            {selectedPayment.description && (
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Description</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{selectedPayment.description}</p>
              </div>
            )}

            {selectedPayment.status === 'pending' && selectedPayment.type === 'withdrawal' && (
              <button
                onClick={() => handleApproveWithdrawal(selectedPayment)}
                className={`w-full py-4 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-all ${isDark ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-black text-white hover:bg-zinc-800'}`}
              >
                Approve Withdrawal
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPayments;