// pages/Creator/Earnings.jsx - COMPLETE FIXED VERSION
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  Loader,
  Calendar,
  Download,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Link2,
  Eye,
  FileText,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useEarnings } from '../../hooks/useEarnings';
import { useAuth } from '../../hooks/useAuth';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import paymentService from '../../services/paymentService';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorEarnings = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { calculateFee, formatCurrency: formatCurrencyWithSettings } = useGlobalSettings();
  const { user, refreshUser } = useAuth();
  const {
    loading,
    balance,
    pendingBalance,
    transactions,
    withdrawals,
    earningsHistory,
    summary,
    pagination,
    fetchBalance,
    fetchTransactions,
    fetchWithdrawals,
    fetchEarningsHistory,
    requestWithdrawal,
    getGrowthPercentage
  } = useEarnings();

  const [activeTab, setActiveTab] = useState('overview');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [period, setPeriod] = useState('30d');
  const [chartType, setChartType] = useState('area');
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState({
    loading: true,
    connected: false,
    status: 'not_connected',
    payoutsEnabled: false,
    detailsSubmitted: false,
    currentlyDue: []
  });

  const loadPayoutAccountStatus = useCallback(async () => {
    setPayoutAccount((prev) => ({ ...prev, loading: true }));
    const response = await paymentService.getPayoutAccountStatus();

    if (response?.success) {
      setPayoutAccount({
        loading: false,
        connected: Boolean(response.connected),
        status: response.status || 'pending',
        payoutsEnabled: Boolean(response.payoutsEnabled),
        detailsSubmitted: Boolean(response.detailsSubmitted),
        currentlyDue: response.currentlyDue || []
      });
      return;
    }

    setPayoutAccount((prev) => ({ ...prev, loading: false }));
  }, []);

  const handleConnectStripe = useCallback(async () => {
    setConnectingStripe(true);
    const response = await paymentService.createPayoutOnboardingLink('/creator/earnings');
    setConnectingStripe(false);

    if (!response?.success || !response?.url) {
      toast.error(response?.error || 'Failed to open Stripe onboarding');
      return;
    }

    window.location.assign(response.url);
  }, []);

  // ==================== FETCH DATA ON MOUNT ====================
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      await Promise.all([
        fetchBalance(),
        fetchTransactions(1, 10),
        fetchWithdrawals(1, 10),
        fetchEarningsHistory(period)
      ]);
    };
    
    loadData();
  }, [period, user]);

  useEffect(() => {
    if (!user) return;
    loadPayoutAccountStatus();
  }, [user, loadPayoutAccountStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnectState = params.get('stripe_connect');
    if (!stripeConnectState) return;

    if (stripeConnectState === 'return') {
      toast.success('Stripe payout account details updated.');
      loadPayoutAccountStatus();
      refreshUser?.();
    } else if (stripeConnectState === 'refresh') {
      toast('Stripe onboarding was not finished. Complete it to receive payouts.');
    }

    window.history.replaceState({}, '', window.location.pathname);
  }, [loadPayoutAccountStatus, refreshUser]);

  // ==================== WITHDRAWAL HANDLER ====================
  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      toast.error('Please enter an amount');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount < 50) {
      toast.error('Minimum withdrawal amount is $50');
      return;
    }

    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    const result = await requestWithdrawal(amount);
    if (result?.success) {
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    }
  };

  // Status Style Config mimicking Brand Payments
  const statusConfig = {
    completed: { bg: isDark ? 'bg-white' : 'bg-black', text: isDark ? 'text-black' : 'text-white' },
    released: { bg: isDark ? 'bg-white' : 'bg-black', text: isDark ? 'text-black' : 'text-white' },
    pending: { bg: isDark ? 'bg-zinc-800' : 'bg-gray-100', text: isDark ? 'text-zinc-400' : 'text-gray-600' },
    'in-escrow': { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-500' },
    refunded: { bg: 'bg-purple-500/10', text: 'text-purple-500' }
  };

  // ==================== STATUS HELPERS ====================
  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'payment', isDark);
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return CheckCircle;
      case 'pending':
      case 'processing':
        return Clock;
      case 'failed':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const getDisplayAmount = (transaction) => Number(transaction?.netAmount ?? transaction?.amount ?? 0);

  // ==================== CHART DATA ====================
  const chartData = earningsHistory.map(item => ({
    date: `${item._id?.month || ''}/${item._id?.year || ''}`,
    earnings: item.earnings || 0,
    deals: item.count || 0
  }));

  // ==================== SUMMARY CALCULATIONS ====================
  const totalEarned = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const pendingTotal = transactions
    .filter((t) => ['pending', 'in-escrow', 'processing'].includes(t.status))
    .filter((t) => !['withdrawal', 'refund', 'fee', 'penalty'].includes(t.type))
    .reduce((sum, t) => sum + Number(t.netAmount ?? t.amount ?? 0), 0);

  const realizedTotal = transactions
    .filter((t) => ['completed', 'available'].includes(t.status))
    .filter((t) => !['withdrawal', 'refund', 'fee', 'penalty'].includes(t.type))
    .reduce((sum, t) => sum + Number(t.netAmount ?? t.amount ?? 0), 0);

  const payoutStatusText = payoutAccount.connected
    ? 'Connected'
    : payoutAccount.status === 'pending'
      ? 'Action Required'
      : 'Not Connected';

  const payoutStatusClass = payoutAccount.connected
    ? getStatusColor('completed', 'status', isDark)
    : payoutAccount.status === 'pending'
      ? getStatusColor('pending', 'status', isDark)
      : getStatusColor('inactive', 'status', isDark);

  // ==================== LOADING STATE ====================
  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading earnings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Creator <span className="font-bold">Earnings</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Monitor your revenue, withdraw earnings, and view payment history.</p>
        </div>
        
        <div className="flex items-center gap-3">
         
          <button 
            onClick={() => setShowWithdrawModal(true)}
            disabled={balance < 50}
            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isDark ? 'bg-white !text-white hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'} disabled:opacity-50 hover:scale-105`}
          >
            Withdraw Funds
          </button>
        </div>
      </div>

      {/* Stats as Status Tabs (Brand Payment Style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available Balance</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(balance)}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(pendingBalance)}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">This Month</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(summary.thisMonth)}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lifetime</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(realizedTotal || summary.total)}</span>
        </div>
      </div>

      {/* Stripe Account Status */}
      <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[200px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-900/50">Stripe Account</span>
          <span className="text-sm font-light tracking-tight mt-1">{payoutStatusText}</span>
         <button
  onClick={handleConnectStripe}
  disabled={connectingStripe || payoutAccount.loading}
  className={`mt-2 px-6 py-2 w-full sm:w-auto rounded-md text-[12px] font-bold uppercase tracking-wider 
    transition-all duration-200 ease-in-out border
    hover:shadow-lg active:scale-[0.98]
    ${
    payoutAccount.connected 
      ? (isDark 
          ? 'bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700' 
          : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200')
      : (isDark 
          ? 'bg-black text-white border-gray-800 hover:bg-zinc-900 hover:border-zinc-700' 
          : 'bg-black text-white border-black hover:bg-zinc-800 hover:shadow-zinc-300')
  } disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none`}
>
  {connectingStripe || payoutAccount.loading ? (
    <span className="flex items-center justify-center gap-2">
       {/* Simple dot-pulse animation ya loading text */}
       <span className="animate-pulse">Loading...</span>
    </span>
  ) : (
    payoutAccount.connected ? 'Update Account' : 'Connect Stripe'
  )}
</button>
      </div>

      {/* Time Period Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['7d', '30d', '90d', '12m'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[120px] transition-all ${
              period === p
                ? (isDark ? 'bg-white text-white border-white' : 'bg-black text-white border-black')
                : (isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-600' : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300')
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">{p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '12 Months'}</span>
          </button>
        ))}
      </div>

      {/* Earnings Chart - Simplified */}
      <div className={`px-6 py-5 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight">Earnings Overview</h2>
          <div className="flex items-center gap-2">
            {['area', 'bar', 'line'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  chartType === type
                    ? (isDark ? 'bg-white text-white' : 'bg-black text-white')
                    : (isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'area' && (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? '#fff' : '#000'} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={isDark ? '#fff' : '#000'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke={isDark ? '#fff' : '#000'}
                fillOpacity={1}
                fill="url(#colorEarnings)"
              />
            </AreaChart>
          )}

          {chartType === 'bar' && (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="earnings" fill={isDark ? '#fff' : '#000'} />
            </BarChart>
          )}

          {chartType === 'line' && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="earnings" stroke={isDark ? '#fff' : '#000'} strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-200/10">
        {['overview', 'transactions', 'withdrawals'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
              activeTab === tab 
                ? (isDark ? 'border-white text-white' : 'border-black text-black')
                : 'border-transparent text-zinc-500 hover:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content - Only show active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {transactions.length > 0 ? (
            <>
              {/* Table Header */}
              <div className={`hidden md:grid grid-cols-12 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <div className="col-span-4">Transaction & Ref</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Type</div>
              </div>

              {/* Recent Transaction Rows */}
              {transactions.slice(0, 5).map(t => (
                <div 
                  key={t._id}
                  className={`group grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 rounded-2xl border transition-all ${
                    isDark 
                      ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600' 
                      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-lg shadow-zinc-200/50'
                  }`}
                >
                  <div className="col-span-4 flex flex-col space-y-1">
                    <span className="font-bold text-base tracking-tight truncate">{t.description || 'Payment Received'}</span>
                    <span className="text-[10px] font-mono opacity-50 uppercase">{t.transactionId}</span>
                  </div>

                  <div className="col-span-2 mt-2 md:mt-0">
                    <span className="text-lg font-light tracking-tighter">{formatCurrency(getDisplayAmount(t))}</span>
                  </div>

                  <div className="col-span-3 mt-2 md:mt-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig[t.status]?.bg || 'bg-zinc-100'} ${statusConfig[t.status]?.text || 'text-zinc-600'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
                      {t.status}
                    </span>
                  </div>

                  <div className={`col-span-2 mt-2 md:mt-0 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {timeAgo(t.createdAt)}
                  </div>

                  <div className="col-span-1 text-right text-[10px] font-bold uppercase opacity-40">
                    {t.type}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <p className="text-sm">No transactions available</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {transactions.length > 0 ? (
            <>
              {/* Table Header */}
              <div className={`hidden md:grid grid-cols-12 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <div className="col-span-4">Transaction & Ref</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Type</div>
              </div>

              {/* All Transaction Rows */}
              {transactions.map(t => (
                <div 
                  key={t._id}
                  className={`group grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 rounded-2xl border transition-all ${
                    isDark 
                      ? 'bg-zinc-900/50 text-white border-zinc-800 hover:border-zinc-600' 
                      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-lg shadow-zinc-200/50'
                  }`}
                >
                  <div className="col-span-4 flex flex-col space-y-1">
                    <span className="font-bold text-base tracking-tight truncate">{t.description || 'Payment Received'}</span>
                    <span className="text-[10px] font-mono opacity-50 uppercase">{t.transactionId}</span>
                  </div>

                  <div className="col-span-2 mt-2 md:mt-0">
                    <span className="text-lg font-light tracking-tighter">{formatCurrency(getDisplayAmount(t))}</span>
                  </div>

                  <div className="col-span-3 mt-2 md:mt-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig[t.status]?.bg || 'bg-zinc-100'} ${statusConfig[t.status]?.text || 'text-zinc-600'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
                      {t.status}
                    </span>
                  </div>

                  <div className={`col-span-2 mt-2 md:mt-0 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {timeAgo(t.createdAt)}
                  </div>

                  <div className="col-span-1 text-right text-[10px] font-bold uppercase opacity-40">
                    {t.type}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <p className="text-sm">No transactions found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals.length > 0 ? (
            <>
              {/* Table Header */}
              <div className={`hidden md:grid grid-cols-12 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <div className="col-span-4">Withdrawal & Ref</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-right">Method</div>
              </div>

              {/* Withdrawal Rows */}
              {withdrawals.map(w => (
                <div 
                  key={w._id}
                  className={`group grid grid-cols-1 md:grid-cols-12 items-center px-6 py-5 rounded-2xl border transition-all ${
                    isDark 
                      ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600' 
                      : 'bg-white border-zinc-100 hover:border-zinc-300 hover:shadow-lg shadow-zinc-200/50'
                  }`}
                >
                  <div className="col-span-4 flex flex-col space-y-1">
                    <span className="font-bold text-base tracking-tight truncate">Withdrawal Request</span>
                    <span className="text-[10px] font-mono opacity-50 uppercase">{w.transactionId}</span>
                  </div>

                  <div className="col-span-2 mt-2 md:mt-0">
                    <span className="text-lg font-light tracking-tighter">{formatCurrency(w.amount)}</span>
                  </div>

                  <div className="col-span-3 mt-2 md:mt-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusConfig[w.status]?.bg || 'bg-zinc-100'} ${statusConfig[w.status]?.text || 'text-zinc-600'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
                      {w.status}
                    </span>
                  </div>

                  <div className={`col-span-2 mt-2 md:mt-0 text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {timeAgo(w.createdAt)}
                  </div>

                  <div className="col-span-1 text-right text-[10px] font-bold uppercase opacity-40">
                    Stripe
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <p className="text-sm">No withdrawals yet</p>
            </div>
          )}
        </div>
      )}

      {/* Modern Modal styling stays consistent with the theme */}
      <Modal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} title="Withdraw Funds">
        <div className="space-y-6 pt-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-light">$</span>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
              min="50"
              max={balance}
              className={`w-full pl-8 pr-4 py-4 text-2xl font-light bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white' : 'border-zinc-100 focus:border-black'}`}
            />
          </div>
          <div className={`p-4 rounded-2xl text-xs uppercase tracking-widest font-bold ${isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-white text-zinc-500'}`}>
            Available balance: {formatCurrency(balance)} | Minimum withdrawal: $50
          </div>
          <button
            onClick={handleWithdraw}
            disabled={!withdrawAmount || parseFloat(withdrawAmount) < 50 || parseFloat(withdrawAmount) > balance}
            className={`w-full py-4 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-all ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'} disabled:opacity-50`}
          >
            Complete Withdrawal
          </button>
        </div>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction ID</p>
                  <p className={`font-mono text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedTransaction.transactionId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 ${getStatusColor(selectedTransaction.status)}`}>
                  {getStatusIcon(selectedTransaction.status)}
                  {selectedTransaction.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Date</p>
                <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatDate(selectedTransaction.createdAt)}</p>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Time</p>
                <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{new Date(selectedTransaction.createdAt).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Amount</p>
                <p className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(getDisplayAmount(selectedTransaction))}</p>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Fee</p>
                <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-600'}`}>{formatCurrency(selectedTransaction.fee || 0)}</p>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Net Amount</p>
                <p className="font-bold text-green-600">{formatCurrency(selectedTransaction.netAmount || selectedTransaction.amount)}</p>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Type</p>
                <p className={`font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedTransaction.type}</p>
              </div>
            </div>

            {selectedTransaction.description && (
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`} mb-1>Description</p>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedTransaction.description}</p>
              </div>
            )}

            {selectedTransaction.dealId && (
              <div className={`border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Link
                  to={`/creator/deals/${selectedTransaction.dealId._id}`}
                  className={`text-sm font-medium flex items-center ${isDark ? 'text-[#667eea] hover:text-[#667eea]/80' : 'text-[#667eea] hover:text-[#5a67d8]'}`}
                  onClick={() => setShowTransactionModal(false)}
                >
                  View Deal
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CreatorEarnings; 