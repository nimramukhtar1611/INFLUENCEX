import React, { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  Wallet,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader,
  Search,
  RefreshCw,
  ChevronRight,
  FileText
} from 'lucide-react';
import paymentService from '../../services/paymentService';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const Payments = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const [pagination, setPagination] = useState({
    transactions: { page: 1, limit: 10, total: 0, pages: 1 },
    invoices: { page: 1, limit: 10, total: 0, pages: 1 },
  });

  // Status Style Config mimicking CreatorDeals
  const statusConfig = {
    completed: { bg: isDark ? 'bg-white' : 'bg-black', text: isDark ? 'text-black' : 'text-white' },
    released: { bg: isDark ? 'bg-white' : 'bg-black', text: isDark ? 'text-black' : 'text-white' },
    pending: { bg: isDark ? 'bg-zinc-800' : 'bg-gray-100', text: isDark ? 'text-zinc-400' : 'text-gray-600' },
    'in-escrow': { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-500' },
    refunded: { bg: 'bg-purple-500/10', text: 'text-purple-500' }
  };

  const fetchPaymentData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const [balanceRes, transactionsRes, invoicesRes] = await Promise.allSettled([
        paymentService.getBalance(),
        paymentService.getTransactions(pagination.transactions.page, 10),
        paymentService.getInvoices(pagination.invoices.page, 10),
      ]);

      if (balanceRes.status === 'fulfilled' && balanceRes.value?.success) {
        setBalance(balanceRes.value.balance || 0);
        setPendingBalance(balanceRes.value.pending || 0);
      }

      if (transactionsRes.status === 'fulfilled' && transactionsRes.value?.success) {
        setTransactions(transactionsRes.value.transactions || []);
        setPagination(prev => ({
          ...prev,
          transactions: transactionsRes.value.pagination || prev.transactions,
        }));
      }

      if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.success) {
        setInvoices(invoicesRes.value.invoices || []);
        setPagination(prev => ({
          ...prev,
          invoices: invoicesRes.value.pagination || prev.invoices,
        }));
      }

      if (showToast) toast.success('Payment data refreshed');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get('deposit');
    if (depositStatus === 'success') {
      toast.success('Stripe payment completed successfully.');
      fetchPaymentData();
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchPaymentData();
  }, []);

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < 10) {
      toast.error('Minimum deposit is $10');
      return;
    }
    try {
      setSubmittingDeposit(true);
      const response = await paymentService.createDepositCheckoutSession(amount, 'usd');
      if (response.success && response.url) window.location.assign(response.url);
      else toast.error(response.error || 'Failed to start Stripe checkout');
    } catch (error) {
      toast.error('Failed to start Stripe checkout');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const totals = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    const totalVolume = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalFees = completed.reduce((sum, t) => sum + Number(t.fee || 0), 0);
    return { totalVolume, totalFees };
  }, [transactions]);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Brand <span className="font-bold">Payments</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Manage transactions, deposits, and payment history.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchPaymentData(true)}
            className={`p-2.5 rounded-full border transition-all ${isDark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500'}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowDepositModal(true)}
            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${isDark ? 'bg-white text-white' : 'bg-black text-white'} hover:scale-105`}
          >
            Add Funds
          </button>
        </div>
      </div>

      {/* Stats as Status Tabs (CreatorDeal Style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Balance</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(balance)}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(pendingBalance)}</span>
        </div>
        <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[160px] ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Volume</span>
            <span className="text-xl font-light tracking-tighter mt-1">{formatCurrency(totals.totalVolume)}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-200/10">
        {['overview', 'transactions', 'invoices'].map(tab => (
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

      {/* Transactions Table Interface */}
  <div className="space-y-4">
  {activeTab !== 'invoices' ? (
    <>
      {/* Table Header - Audit Trail Style */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Transaction & Reference</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-3">Clearing Status</div>
        <div className="col-span-2">Timeline</div>
        <div className="col-span-1 text-right">Origin</div>
      </div>

      {/* Transaction Rows */}
      {transactions.map(t => (
        <div 
          key={t._id}
          className={`
            group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-5 rounded-[2.5rem] border 
            transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
          `}
        >
          {/* Desc & ID: Technical Log Look */}
          <div className="col-span-4 flex flex-col min-w-0">
            <span className={`font-bold text-[15px] tracking-tight leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {t.description || 'System Settlement'}
            </span>
            <span className="font-mono text-[9px] mt-1.5 opacity-40 tracking-tighter uppercase">
              REF: {t.transactionId}
            </span>
          </div>

          {/* Amount: Clean Mono */}
          <div className="col-span-2 mt-2 md:mt-0">
            <span className={`text-[17px] font-mono font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatCurrency(t.amount)}
            </span>
          </div>

          {/* Status: Breathing Pill */}
          <div className="col-span-3 mt-2 md:mt-0">
            <span className={`
              inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border
            `}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse shadow-[0_0_8px_rgba(currentColor,0.5)]" />
              {t.status}
            </span>
          </div>

          {/* Timeline */}
          <div className={`col-span-2 mt-2 md:mt-0 text-[11px] font-bold tracking-tight ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {timeAgo(t.createdAt)}
          </div>

          {/* Type: Minimalist Tag */}
          <div className="col-span-1 text-right">
            <span className="text-[10px] font-black uppercase opacity-20 tracking-widest">{t.type}</span>
          </div>
        </div>
      ))}
    </>
  ) : (
    /* Invoices Section: The "Receipt" Look */
    <div className="grid gap-3">
      {invoices.map(invoice => (
        <div 
          key={invoice._id} 
          className={`
            group flex items-center justify-between px-8 py-6 rounded-[2.5rem] border transition-all duration-500
            ${isDark 
              ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900' 
              : 'bg-white border-zinc-100 hover:border-zinc-200 shadow-sm'}
          `}
        >
          <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
              <FileText className="w-5 h-5 text-zinc-500 opacity-50" />
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-[15px] tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                INV-#{invoice.invoiceNumber || (invoice.transactionId ? invoice.transactionId.slice(-6).toUpperCase() : 'UNKNOWN')}
              </span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">
                Issued: {formatDate(invoice.createdAt)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <span className={`font-mono text-lg font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatCurrency(invoice.amount)}
            </span>
            <button 
              onClick={() => paymentService.downloadInvoice(invoice._id)} 
              className={`
                p-3.5 rounded-xl border transition-all duration-300
                hover:scale-110 active:scale-95
                ${isDark 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-white hover:text-white hover:border-white' 
                  : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-black hover:text-white hover:border-black shadow-sm'}
              `}
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      {/* Modern Modal styling stays consistent with the theme */}
      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Add Funds">
        <div className="space-y-6 pt-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-light">$</span>
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-4 text-2xl font-light bg-transparent border-b-2 focus:outline-none transition-colors ${isDark ? 'border-zinc-800 focus:border-white' : 'border-zinc-100 focus:border-black'}`}
            />
          </div>
          <div className={`p-4 rounded-2xl text-xs uppercase tracking-widest font-bold ${isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-white text-zinc-500'}`}>
            Redirecting to secure stripe checkout
          </div>
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || submittingDeposit}
            className={`w-full py-4 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-all ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'} disabled:opacity-50`}
          >
            {submittingDeposit ? 'Processing...' : 'Complete Payment'}
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default Payments;