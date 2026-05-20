// pages/Creator/Contracts.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, TrendingUp, Loader, ChevronLeft, ChevronRight,
  RefreshCw, Archive, CheckCircle, Edit, AlertCircle, ArrowUpRight, Calendar, Activity,
  FileText, Download, Eye, Clock, Shield, XCircle, DollarSign, User
} from 'lucide-react';
import contractService from '../../services/contractService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import CreatorLayout from '../../components/Creator/CreatorLayout';

const statusConfig = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  signed: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  completed: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  expired: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
};

const Contracts = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [filter, pagination.page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchContracts();
  };

  const fetchContracts = async (showToast = false) => {
    try {
      showToast ? setRefreshing(true) : setLoading(true);
      const response = await contractService.getUserContracts();

      if (response?.success) {
        setContracts(response.contracts || []);
        setCounts(response.counts || {});
        setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
        if (showToast) toast.success('Contracts refreshed');
      }
    } catch (error) {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownload = async (contract) => {
    setDownloading(true);
    try {
      if (contract.pdfUrl) {
        window.open(contract.pdfUrl, '_blank');
      } else {
        toast.error('Contract PDF not available');
      }
    } catch (error) {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  
  if (loading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading contracts...</p>
        </div>
      </div>
    );
  }

  const filters = ['all', 'active', 'pending', 'signed', 'completed'].map((s) => ({
    id: s,
    label: s,
    count: counts[s] || 0
  }));

  return (
    <div >
      <CreatorLayout
        title="Contracts"
        subtitle="View and manage contracts sent by brands for your signature."
        filters={filters}
        activeFilter={filter}
        onFilterChange={(filterId) => { setFilter(filterId); setPagination(p => ({ ...p, page: 1 })); }}
        showSearch={true}
        searchValue={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        onSearchSubmit={handleSearch}
        searchPlaceholder="Search contracts..."
      > 
      <div className="">
     
        {/* Modern List Interface (Row Style) */}
    <div className="relative overflow-hidden">
  {contracts.length > 0 ? (
    <div className="space-y-4">
      {/* Table Header - High Tracking Audit Style */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Contract Agreement</div>
        <div className="col-span-2">Value</div>
        <div className="col-span-3 text-center">Status & Parties</div>
        <div className="col-span-2">Timeline</div>
        <div className="col-span-1 text-right">Review</div>
      </div>

      {/* Contract Rows */}
      {contracts.map((contract) => (
        <div 
          key={contract._id} 
          onClick={() => navigate(`/creator/contracts/${contract._id}`)}
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
              {contract.contractNumber || `Contract-${contract._id?.slice(-8).toUpperCase()}`}
            </span>
            <div className="flex items-center gap-2 mt-1.5">
               <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border tracking-tighter font-bold ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-50 border-zinc-200 text-zinc-400'}`}>
                ID: {contract._id?.slice(-8).toUpperCase()}
              </span>
               <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {contract.campaignId?.title || 'Standalone Agreement'}
              </span>
            </div>
          </div>

          {/* Budget: Financial Ticker Style */}
          <div className="col-span-2 mt-4 md:mt-0 flex flex-col">
            <span className={`text-[14px] font-bold tracking-tighter ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {formatCurrency(contract.paymentTerms?.total || 0)}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-60">Value:</span>
               <span className="text-[10px] font-bold text-emerald-500">Fixed</span>
            </div>
          </div>

          {/* Status & Progress Bar */}
          <div className="col-span-3 mt-4 md:mt-0 flex flex-col items-center gap-3 px-4">
            <span className={`
              inline-flex items-center px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
              ${statusConfig[contract.status]?.bg} ${statusConfig[contract.status]?.text}
            `}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
              {contract.status}
            </span>
            
            <div className="text-center">
              <div className={`text-[10px] font-bold tracking-tight ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {contract.brandId?.displayName || 'Unknown Brand'}
              </div>
              <div className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Brand Partner
              </div>
            </div>
          </div>

          {/* Timeline: Calendar Stack */}
          <div className={`col-span-2 mt-4 md:mt-0 flex flex-col text-[11px] font-bold tracking-tight ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 opacity-40" />
              <span>{contract.signedAt ? formatDate(contract.signedAt) : 'Not Signed'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 opacity-40">
              <div className="w-3" /> {/* Spacer to align with icon above */}
              <span>{contract.expiresAt ? formatDate(contract.expiresAt) : 'No Expiry'}</span>
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
        <FileText className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">No Contracts Found</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[260px] text-center leading-relaxed">
        Contracts sent by brands will appear here for your review and signature.
      </p>
    </div>
  )}
</div>

      {/* Modern Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-8 border-t border-zinc-800/10 dark:border-zinc-200/10">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Page {pagination.page} <span className="mx-2 opacity-30">/</span> {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} 
              disabled={pagination.page === 1}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} 
              disabled={pagination.page === pagination.pages}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  </CreatorLayout>
    </div>
  );
};

export default Contracts;
