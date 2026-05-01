import React, { useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, PlusCircle, CheckCircle, AlertCircle, XCircle, FileText as FileIcon, Calendar, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import { useAdminData } from '../../hooks/useAdminData';
import { Loader } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import adminService from '../../services/adminService';
import { formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'users', label: 'Users' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'deals', label: 'Deals' },
  { value: 'payments', label: 'Payments' },
  { value: 'creators', label: 'Creators' },
  { value: 'brands', label: 'Brands' },
  { value: 'engagement', label: 'Engagement' }
];

const FORMAT_EXT = {
  pdf: 'pdf',
  csv: 'csv',
  excel: 'xlsx',
  json: 'json',
};

const Reports = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { reports, loading, refreshData } = useAdminData();
  const [reportType, setReportType] = useState('revenue');
  const [format, setFormat] = useState('pdf');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ==================== STATUS CONFIGURATION ====================
  // Using consistent color scheme from colorScheme.js

  const statusOptions = ['all', 'pending', 'generating', 'completed', 'failed'];

  const filteredReports = useMemo(() => {
    let filtered = reports;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((report) => 
        (report.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.userId?.fullName || report.userId?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [reports, statusFilter, searchQuery]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const dateRange = {};
      if (startDate) dateRange.start = startDate;
      if (endDate) dateRange.end = endDate;

      await adminService.generateReport(
        reportType,
        Object.keys(dateRange).length > 0 ? dateRange : undefined,
        format
      );

      toast.success('Report generation started');
      await refreshData();
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    const reportId = report?._id || report?.id;
    if (!reportId) {
      toast.error('Report ID is missing');
      return;
    }

    try {
      setDownloadingId(reportId);
      const response = await adminService.downloadReport(reportId, report.format || 'pdf');
      const ext = FORMAT_EXT[report.format] || 'pdf';
      const blob = response instanceof Blob ? response : new Blob([response]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename || `${report.type || 'report'}-${reportId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to download report');
    } finally {
      setDownloadingId('');
    }
  };

  if (loading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-8 p-6 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight font-semibold">Admin <span className="font-bold">Reports</span></h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Generate and manage platform analytics reports.</p>
        </div>
      </div>

      {/* Generate Report Section */}
      <div className={`admin-stat-card p-6 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Generate New Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={`px-4 py-2 rounded-full text-sm border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100' : 'bg-zinc-50 border-zinc-200 focus:border-black text-zinc-900'
            }`}
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={`px-4 py-2 rounded-full text-sm border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100' : 'bg-zinc-50 border-zinc-200 focus:border-black text-zinc-900'
            }`}
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="json">JSON</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`px-4 py-2 rounded-full text-sm border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100' : 'bg-zinc-50 border-zinc-200 focus:border-black text-zinc-900'
            }`}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`px-4 py-2 rounded-full text-sm border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600 text-zinc-100' : 'bg-zinc-50 border-zinc-200 focus:border-black text-zinc-900'
            }`}
          />

          <Button
            variant="secondary"
            icon={PlusCircle}

            onClick={handleGenerate}
            disabled={isGenerating}
            className="text-sm rounded-full !text-white !bg-black"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                statusFilter === s 
                  ? (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-black border-black text-white')
                  : (isDark ? 'border-zinc-800 text-zinc-500 hover:border-zinc-600' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400')
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search report name, type or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-full border focus:outline-none transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-600' : 'bg-zinc-50 border-zinc-200 focus:border-black'
            }`}
          />
        </div>
      </div>

      {/* Reports Cards Interface */}
  <div className="relative overflow-hidden">
  {filteredReports.length > 0 ? (
    <div className="space-y-4">
      {/* Header Row - Minimalist & High Tracking */}
      <div className={`hidden md:grid grid-cols-12 px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
        <div className="col-span-4">Document Metadata</div>
        <div className="col-span-2 text-center">Data Type</div>
        <div className="col-span-3 text-center">Generation Status</div>
        <div className="col-span-2 text-center">Initiated By</div>
        <div className="col-span-1 text-right">Access</div>
      </div>

      {/* Report Rows */}
      {filteredReports.map((report) => {
        const reportId = report._id || report.id;
        const status = String(report.status || 'pending').toLowerCase();
        
        const getStatusIcon = (status) => {
          switch(status) {
            case 'completed': return CheckCircle;
            case 'failed': return XCircle;
            default: return Clock;
          }
        };
        
        const StatusIcon = getStatusIcon(status);
        
        return (
          <div 
            key={reportId}
            className={`
              group relative grid grid-cols-1 md:grid-cols-12 items-center px-8 py-6 rounded-[2rem] border 
              transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
              ${isDark 
                ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
                : 'bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]'}
            `}
          >
            {/* Title & Metadata */}
            <div className="col-span-4 flex items-center gap-5">
              <div className={`
                w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 border transition-all duration-500
                ${isDark ? 'bg-zinc-800 border-zinc-700 group-hover:border-zinc-500' : 'bg-zinc-50 border-zinc-100 group-hover:border-zinc-300 shadow-sm'}
              `}>
                <FileIcon className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`font-bold text-[15px] tracking-tight truncate leading-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  {report.name || 'Untitled Report'}
                </span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border tracking-widest ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-400'}`}>
                    {(report.format || 'json').toUpperCase()}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-500 opacity-60 italic">
                    {formatDate(report.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Type: Ghost Label */}
            <div className="col-span-2 mt-4 md:mt-0 flex justify-center">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${isDark ? 'bg-zinc-800/40 text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                {report.type || 'Standard'}
              </span>
            </div>

            {/* Status: Icon-Rich Pill */}
            <div className="col-span-3 mt-4 md:mt-0 flex justify-center">
              <span className={`
                inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                transition-all duration-300 ${getStatusColor(status, 'status', isDark)}
              `}>
                <StatusIcon className={`w-3.5 h-3.5 mr-2 ${status === 'pending' ? 'animate-spin' : ''}`} />
                {status}
              </span>
            </div>

            {/* Requester: Profile Hint */}
            <div className="col-span-2 mt-4 md:mt-0 flex flex-col items-center">
              <span className={`text-[13px] font-bold tracking-tight ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {report.userId?.fullName?.split(' ')[0] || 'Admin'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 opacity-40">User Account</span>
            </div>

            {/* Action: Elevated Button */}
            <div className="col-span-1 mt-4 md:mt-0 flex justify-end">
              {report.status === 'completed' ? (
                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloadingId === reportId}
                  className={`
                    p-3 rounded-xl transition-all duration-300 group/btn
                    ${isDark 
                      ? 'bg-white text-black hover:bg-emerald-500 hover:text-white' 
                      : 'bg-black text-white hover:bg-emerald-600 shadow-lg shadow-black/10'}
                  `}
                >
                  {downloadingId === reportId ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
                  )}
                </button>
              ) : (
                <div className={`p-3 rounded-xl border border-dashed ${isDark ? 'border-zinc-800' : 'border-zinc-200 opacity-50'}`}>
                  <FileText className="w-4 h-4 text-zinc-500" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className={`
      flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed transition-all
      ${isDark ? 'border-zinc-800 bg-zinc-900/10' : 'border-zinc-100 bg-zinc-50/50'}
    `}>
      <div className={`p-6 rounded-[2rem] mb-6 shadow-inner ${isDark ? 'bg-zinc-800/50' : 'bg-white'}`}>
        <FileIcon className="w-12 h-12 text-zinc-500 opacity-20 stroke-[1.5px]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight">No Reports Generated</h3>
      <p className="text-[12px] text-zinc-500 mt-2 max-w-[240px] text-center leading-relaxed">
        We couldn't find any documents. Try initiating a new data export.
      </p>
    </div>
  )}
</div>
    </div>
  );
};

export default Reports;