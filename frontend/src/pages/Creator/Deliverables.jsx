// pages/Creator/Deliverables.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Paperclip,
  X,
  ArrowLeft,
  Loader,
  Plus,
  ThumbsUp,
  Eye,
  Download
} from 'lucide-react';
import dealService from '../../services/dealService';
import api from '../../services/api';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const CreatorDeliverables = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deal, setDeal] = useState(null);

  // Per-deliverable submission state: { [deliverableId]: { files: File[], links: string[], notes: string, uploading: boolean, uploadedFiles: [] } }
  const [submissions, setSubmissions] = useState({});

  // ==================== FETCH DEAL ====================
  useEffect(() => {
    if (!dealId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await dealService.getDeal(dealId);
        if (res?.success) {
          setDeal(res.deal);
          // Initialize submission state for each deliverable that can be submitted
          const initial = {};
          res.deal.deliverables?.forEach(d => {
            const isPerformance = res.deal.paymentType !== 'fixed';
            // Allow submission if:
            // 1. Status is pending/revision/in-progress
            // 2. OR it's a performance deal and status is submitted, but total performance < 100%
            const canSubmitAgain = isPerformance && d.status === 'submitted' && (res.deal.progress || 0) < 100;

            if (['pending', 'revision', 'in-progress'].includes(d.status) || canSubmitAgain) {
              initial[d._id] = {
                files: [],
                links: [''],
                uploading: false,
                uploadedFiles: [],
                metrics: {
                  impressions: 0,
                  likes: 0,
                  comments: 0,
                  shares: 0,
                  conversions: 0,
                  clicks: 0
                }
              };
            }
          });
          setSubmissions(initial);
        } else {
          toast.error('Failed to load deal');
          navigate('/creator/deals');
        }
      } catch (error) {
        console.error('Fetch deal error:', error);
        toast.error('Failed to load deal');
        navigate('/creator/deals');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dealId, navigate]);

  // ==================== PER-DELIVERABLE HELPERS ====================
  const updateSub = (deliverableId, patch) =>
    setSubmissions(prev => ({ ...prev, [deliverableId]: { ...prev[deliverableId], ...patch } }));

  const addLink = (id) =>
    updateSub(id, { links: [...(submissions[id]?.links || ['']), ''] });

  const updateLink = (id, idx, value) => {
    const links = [...(submissions[id]?.links || [''])];
    links[idx] = value;
    updateSub(id, { links });
  };

  const removeLink = (id, idx) =>
    updateSub(id, { links: (submissions[id]?.links || []).filter((_, i) => i !== idx) });

  const handleFileChange = (deliverableId, e) => {
    const newFiles = Array.from(e.target.files).filter(f => {
      if (f.size > 100 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 100MB`);
        return false;
      }
      return true;
    });
    updateSub(deliverableId, { files: [...(submissions[deliverableId]?.files || []), ...newFiles] });
  };

  const removeFile = (deliverableId, index) =>
    updateSub(deliverableId, {
      files: (submissions[deliverableId]?.files || []).filter((_, i) => i !== index)
    });

  // ==================== SUBMIT ALL ====================
  const handleSubmit = async () => {
    const deliverablesToSubmit = [];

    for (const [deliverableId, sub] of Object.entries(submissions)) {
      const validLinks = (sub.links || []).filter(l => l.trim());
      if (sub.files.length === 0 && validLinks.length === 0) continue;

      // Upload files first
      let uploadedFiles = [];
      if (sub.files.length > 0) {
        updateSub(deliverableId, { uploading: true });
        const formData = new FormData();
        sub.files.forEach(f => formData.append('files', f));
        try {
          const uploadRes = await api.post('/upload/multiple', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadRes.data?.success) {
            uploadedFiles = uploadRes.data.files || [];
          } else {
            toast.error('File upload failed');
            updateSub(deliverableId, { uploading: false });
            return;
          }
        } catch (err) {
          console.error('Upload error:', err);
          toast.error('Failed to upload files');
          updateSub(deliverableId, { uploading: false });
          return;
        }
        updateSub(deliverableId, { uploading: false });
      }

      deliverablesToSubmit.push({
        deliverableId,
        files: uploadedFiles,
        links: validLinks,
        metrics: sub.metrics // Added metrics
      });
    }

    if (deliverablesToSubmit.length === 0) {
      toast.error('Please add files or links for at least one deliverable');
      return;
    }

    try {
      setSubmitting(true);
      // Use the correct endpoint: POST /deals/:id/deliverables
      const res = await dealService.submitDeliverables(dealId, deliverablesToSubmit);
      if (res?.success) {
        toast.success('Deliverables submitted successfully!');
        navigate(`/creator/deals/${dealId}`);
      } else {
        toast.error(res?.error || 'Failed to submit');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit deliverables');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== STATUS HELPERS ====================
  const statusColor = (s) => {
    return getStatusColor(s, 'deliverable', isDark);
  };

  const statusIcon = (s) => {
    switch (s) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'submitted': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'revision': return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-medium">Loading deliverables...</p>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  const completed = deal.deliverables?.filter(d => d.status === 'approved').length || 0;
  const total = deal.deliverables?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isPerformance = deal.paymentType !== 'fixed';
  const totalProgress = deal.progress || 0;
  
  const canSubmit = totalProgress < 100 && Object.values(submissions).some(s =>
    s.files.length > 0 || 
    (s.links || []).some(l => l.trim()) ||
    (isPerformance && (
      (s.metrics?.impressions || 0) > 0 ||
      (s.metrics?.likes || 0) > 0 ||
      (s.metrics?.comments || 0) > 0 ||
      (s.metrics?.conversions || 0) > 0 ||
      (s.metrics?.clicks || 0) > 0
    ))
  );

  const inputClasses = `w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none transition-all ${
    isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-500 text-white' : 'bg-white border-zinc-200 focus:border-black text-black'
  }`;

  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-8 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to={`/creator/deals/${dealId}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="text-right">
          <h1 className="text-3xl font-semibold tracking-tight">Campaign <span className="font-bold">Deliverables</span></h1>
          <p className="text-sm text-zinc-500">Submit your content and track approval status for {deal.campaignId?.title || 'this campaign'}.</p>
        </div>
      </div>

      {/* Progress */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Campaign Progress</h2>
        <div className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Completion Status</h3>
                <p className="text-xs text-zinc-500">{completed}/{total} deliverables approved</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColor(deal.status)}`}>
              {deal.status}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <div className={`w-full rounded-full h-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>Deadline: {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}</span>
                <span className="font-medium">{progress}% Complete</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Deliverables</h2>
        <div className="space-y-4">
          {deal.deliverables?.map((d, idx) => (
            <div key={d._id || idx} className={`group relative p-6 rounded-3xl border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                    {statusIcon(d.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm uppercase tracking-wider">
                      {d.quantity > 1 ? `${d.quantity}x ` : ''}{d.type} — {d.platform}
                    </h3>
                    {d.description && <p className="text-xs text-zinc-500 mt-1">{d.description}</p>}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColor(d.status || 'pending')}`}>
                  {d.status || 'pending'}
                </span>
              </div>

          {/* Requirements */}
              {d.requirements && (
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} mb-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Requirements</p>
                  <p className="text-sm text-zinc-700">{d.requirements}</p>
                </div>
              )}

              {/* Revision notes */}
              {d.revisionNotes && (
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} mb-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 mb-2">Revision Requested</p>
                  <p className="text-sm text-orange-800">{d.revisionNotes}</p>
                </div>
              )}

              {/* Previously submitted files */}
              {d.files?.length > 0 && (
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'} mb-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Previously Submitted</p>
                  <div className="flex flex-wrap gap-2">
                    {d.files.map((f, fi) => (
                      <a
                        key={fi}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-all ${
                          isDark 
                            ? 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 border border-indigo-800' 
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        {f.filename || 'File'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback / approval */}
              {d.feedback && (
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} mb-4`}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 mb-2">Feedback</p>
                  <p className="text-sm text-green-800">{d.feedback}</p>
                </div>
              )}

          {/* Submission form — only for pending/revision deliverables */}
              {submissions[d._id] && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider">
                        {d.status === 'revision' ? 'Submit Revised Work' : 'Submit Your Work'}
                      </h4>
                      <p className="text-xs text-zinc-500">Upload files and add links for this deliverable</p>
                    </div>
                  </div>

                  {/* Metrics (Only for performance-based deals) */}
                  {deal.paymentType !== 'fixed' && (
                    <div className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-indigo-900/20 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-800' : 'bg-white border'}`}>
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wider">Performance Metrics</h4>
                          <p className="text-xs text-zinc-500">Enter your live performance stats for this content</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Impressions</label>
                          <input
                            type="number"
                            min="0"
                            value={submissions[d._id].metrics?.impressions || 0}
                            onChange={e => updateSub(d._id, { metrics: { ...submissions[d._id].metrics, impressions: parseInt(e.target.value) || 0 } })}
                            className={inputClasses}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Likes</label>
                          <input
                            type="number"
                            min="0"
                            value={submissions[d._id].metrics?.likes || 0}
                            onChange={e => updateSub(d._id, { metrics: { ...submissions[d._id].metrics, likes: parseInt(e.target.value) || 0 } })}
                            className={inputClasses}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Comments</label>
                          <input
                            type="number"
                            min="0"
                            value={submissions[d._id].metrics?.comments || 0}
                            onChange={e => updateSub(d._id, { metrics: { ...submissions[d._id].metrics, comments: parseInt(e.target.value) || 0 } })}
                            className={inputClasses}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Shares</label>
                          <input
                            type="number"
                            min="0"
                            value={submissions[d._id].metrics?.shares || 0}
                            onChange={e => updateSub(d._id, { metrics: { ...submissions[d._id].metrics, shares: parseInt(e.target.value) || 0 } })}
                            className={inputClasses}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Clicks</label>
                          <input
                            type="number"
                            min="0"
                            value={submissions[d._id].metrics?.clicks || 0}
                            onChange={e => updateSub(d._id, { metrics: { ...submissions[d._id].metrics, clicks: parseInt(e.target.value) || 0 } })}
                            className={inputClasses}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Conversions</label>
                          <input
                            type="number"
                            min="0"
                            value={submissions[d._id].metrics?.conversions || 0}
                            onChange={e => updateSub(d._id, { metrics: { ...submissions[d._id].metrics, conversions: parseInt(e.target.value) || 0 } })}
                            className={inputClasses}
                          />
                        </div>
                      </div>
                    </div>
                  )}

              {/* File upload */}
                  <div className="space-y-4">
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      isDark 
                        ? 'border-zinc-700 hover:border-indigo-500 bg-zinc-900/30' 
                        : 'border-zinc-300 hover:border-indigo-500 bg-zinc-50'
                    }`}>
                      <input
                        type="file"
                        multiple
                        onChange={e => handleFileChange(d._id, e)}
                        className="hidden"
                        id={`file-${d._id}`}
                        accept="image/*,video/*,.pdf,.doc,.docx"
                      />
                      <label htmlFor={`file-${d._id}`} className="cursor-pointer">
                        {submissions[d._id].uploading ? (
                          <Loader className="w-8 h-8 text-zinc-500 animate-spin mx-auto mb-4" />
                        ) : (
                          <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
                        )}
                        <p className="text-sm text-zinc-600 mb-2">
                          <span className="text-indigo-600 font-medium">Browse files</span> or drag & drop
                        </p>
                        <p className="text-xs text-zinc-500">Images, Videos, PDF (max 100MB)</p>
                      </label>
                    </div>
                    
                    {submissions[d._id].files.length > 0 && (
                      <div className="space-y-2">
                        {submissions[d._id].files.map((f, fi) => (
                          <div key={fi} className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                            isDark ? 'bg-zinc-800/50 border border-zinc-700' : 'bg-zinc-50 border border-zinc-200'
                          }`}>
                            <div className="flex items-center gap-3 text-sm">
                              {f.type?.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-blue-500" />
                              ) : f.type?.startsWith('video/') ? (
                                <Video className="w-4 h-4 text-purple-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-zinc-500" />
                              )}
                              <span className="truncate max-w-xs font-medium">{f.name}</span>
                              <span className="text-xs text-zinc-500">
                                ({(f.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                            </div>
                            <button
                              onClick={() => removeFile(d._id, fi)}
                              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Links */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider">Content Links</h4>
                        <p className="text-xs text-zinc-500">Add post URLs and content links</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {(submissions[d._id].links || ['']).map((link, li) => (
                        <div key={li} className="flex gap-3">
                          <div className="relative flex-1">
                            <Link2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                            <input
                              type="url"
                              value={link}
                              onChange={e => updateLink(d._id, li, e.target.value)}
                              placeholder="https://instagram.com/p/..."
                              className={`${inputClasses} pl-10`}
                            />
                          </div>
                          {(submissions[d._id].links || []).length > 1 && (
                            <button
                              onClick={() => removeLink(d._id, li)}
                              className="p-3 text-zinc-400 hover:text-red-500 transition-colors rounded-xl border border-zinc-200 hover:border-red-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addLink(d._id)}
                        className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add another link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Already approved badge */}
              {d.status === 'approved' && (
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-3 text-green-700">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Approved {d.approvedAt ? `on ${formatDate(d.approvedAt)}` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Brand Assets */}
      {deal.campaignId?.brandAssets?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Brand Assets</h2>
          <div className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <div className="space-y-3">
              {deal.campaignId.brandAssets.map((asset, i) => (
                <a
                  key={i}
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isDark 
                      ? 'border-zinc-700 hover:bg-zinc-800/50' 
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      {asset.fileSize && (
                        <p className="text-xs text-zinc-500">
                          {(asset.fileSize / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Download</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-end gap-6 pt-6 border-t border-zinc-800/10 dark:border-zinc-200/10">
        {/* Cancel Button */}
        <button 
          onClick={() => navigate(`/creator/deals/${dealId}`)} 
          className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all duration-300 hover:translate-x-[-4px] active:scale-95"
        >
          Cancel
        </button>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className={`
            relative px-8 py-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] 
            transition-all duration-300 shadow-xl overflow-hidden
            ${submitting || !canSubmit ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95 hover:shadow-2xl'}
            ${isDark ? 'bg-white text-white border border-white' : 'bg-black text-white border border-black'}
          `}
        >
          <span className="flex items-center justify-center gap-2">
            {submitting && (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Deliverables'}
          </span>
        </button>
      </div>

      {/* Guidelines */}
      <div className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-800' : 'bg-white border'}`}>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Submission Guidelines</h3>
            <p className="text-xs text-zinc-500">Please follow these guidelines for successful submission</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-zinc-700">
          <li className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
            <span>Make sure content meets all brand requirements listed above</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
            <span>Upload high-resolution images and videos</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
            <span>Include all required hashtags and mentions before linking</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
            <span>Submit before the deadline to avoid delays</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CreatorDeliverables;