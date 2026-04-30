// pages/Admin/Verification.jsx
import React, { useState, useEffect } from 'react';
import {
  Users, Shield, CheckCircle, XCircle, Clock, Search, Filter,
  Eye, FileText, AlertCircle, TrendingUp, BarChart3, Activity,
  ChevronRight, ChevronLeft, RefreshCw, Download, Upload
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { formatNumber, formatDate, timeAgo } from '../../utils/helpers';

const Verification = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Data states
  const [pendingUsers, setPendingUsers] = useState([]);
  const [moderationStats, setModerationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Fetch data
  useEffect(() => {
    fetchPendingUsers();
    fetchModerationStats();
  }, [activeTab, pagination.page, searchTerm]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/verification/verifications/pending?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setPendingUsers(data.data.users);
        setPagination(prev => ({
          ...prev,
          ...data.data.pagination
        }));
      } else {
        toast.error('Failed to fetch pending users');
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Error fetching pending users');
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationStats = async () => {
    try {
      const response = await fetch('/api/admin/verification/moderation/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setModerationStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === pendingUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(pendingUsers.map(user => user._id));
    }
  };

  const handleApproveUser = async (userId, notes = '') => {
    try {
      const response = await fetch(`/api/admin/verification/verifications/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notes })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('User approved successfully');
        fetchPendingUsers();
        fetchModerationStats();
        setShowApproveModal(false);
        setSelectedUser(null);
        setNotes('');
      } else {
        toast.error(data.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Error approving user');
    }
  };

  const handleRejectUser = async (userId, reason, notes = '') => {
    try {
      const response = await fetch(`/api/admin/verification/verifications/${userId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason, notes })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('User rejected successfully');
        fetchPendingUsers();
        fetchModerationStats();
        setShowRejectModal(false);
        setSelectedUser(null);
        setRejectionReason('');
        setNotes('');
      } else {
        toast.error(data.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Error rejecting user');
    }
  };

  const handleBulkApprove = async () => {
    try {
      const response = await fetch('/api/admin/verification/verifications/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          userIds: selectedUsers,
          notes: 'Bulk approval'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Approved ${data.data.successCount} users successfully`);
        setSelectedUsers([]);
        fetchPendingUsers();
        fetchModerationStats();
        setShowBulkActions(false);
      } else {
        toast.error('Failed to approve users');
      }
    } catch (error) {
      console.error('Error bulk approving users:', error);
      toast.error('Error approving users');
    }
  };

  const handleBulkReject = async () => {
    if (!rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const response = await fetch('/api/admin/verification/verifications/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          userIds: selectedUsers,
          reason: rejectionReason,
          notes: 'Bulk rejection'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Rejected ${data.data.successCount} users successfully`);
        setSelectedUsers([]);
        fetchPendingUsers();
        fetchModerationStats();
        setShowBulkActions(false);
        setRejectionReason('');
      } else {
        toast.error('Failed to reject users');
      }
    } catch (error) {
      console.error('Error bulk rejecting users:', error);
      toast.error('Error rejecting users');
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending Verifications', icon: Clock },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'moderation', label: 'Content Moderation', icon: Shield }
  ];

  const rejectionReasons = [
    'Incomplete profile information',
    'Insufficient social media presence',
    'Fake or suspicious account',
    'Violates platform policies',
    'Other'
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            User Verification & Content Moderation
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage user verifications and content moderation across the platform
          </p>
        </div>

        {/* Stats Cards */}
        {moderationStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Users</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(moderationStats.userVerification.totalUsers)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Verified Users</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(moderationStats.userVerification.verifiedUsers)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Pending Verification</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatNumber(moderationStats.userVerification.pendingVerifications)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Verification Rate</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {moderationStats.userVerification.verificationRate}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={isDark ? 'bg-zinc-800 border-zinc-700' : ''}
              icon={Search}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => fetchPendingUsers()}
            disabled={loading}
            icon={RefreshCw}
            className={loading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
        </div>

        {/* Pending Verifications Tab */}
        {activeTab === 'pending' && (
          <div>
            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className={`p-4 rounded-lg border mb-6 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedUsers.length} users selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowBulkActions(true)}
                      variant="outline"
                      size="sm"
                    >
                      Bulk Actions
                    </Button>
                    <Button
                      onClick={() => setSelectedUsers([])}
                      variant="ghost"
                      size="sm"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className={`overflow-hidden rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className={isDark ? 'bg-zinc-900' : 'bg-zinc-50'}>
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === pendingUsers.length && pendingUsers.length > 0}
                        onChange={handleSelectAll}
                        className={`rounded ${isDark ? 'bg-zinc-700 border-zinc-600' : 'bg-white border-zinc-300'}`}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Applied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                          <span className="ml-2 text-zinc-500">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                        No pending verifications found
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map(user => (
                      <tr key={user._id} className={isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => handleUserSelection(user._id)}
                            className={`rounded ${isDark ? 'bg-zinc-700 border-zinc-600' : 'bg-white border-zinc-300'}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img
                              src={user.profilePicture || 'https://via.placeholder.com/40'}
                              alt={user.fullName}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                            <div>
                              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {user.fullName}
                              </div>
                              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.userType === 'creator' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {user.userType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {timeAgo(user.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowApproveModal(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/20"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRejectModal(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && moderationStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Verification Stats */}
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <h3 className="text-lg font-medium mb-4 text-zinc-900 dark:text-zinc-100">
                User Verification Settings
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Auto-Approve Brands</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    moderationStats.userVerification.autoApproveBrands
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {moderationStats.userVerification.autoApproveBrands ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Auto-Approve Creators</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    moderationStats.userVerification.autoApproveCreators
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {moderationStats.userVerification.autoApproveCreators ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Verification Method</span>
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {moderationStats.userVerification.verificationMethod}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Moderation Stats */}
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
              <h3 className="text-lg font-medium mb-4 text-zinc-900 dark:text-zinc-100">
                Content Moderation Settings
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Moderation Type</span>
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {moderationStats.contentModeration.moderationType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Auto-Approve Content</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    moderationStats.contentModeration.autoApproveContent
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {moderationStats.contentModeration.autoApproveContent ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Manual Review Required</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    moderationStats.contentModeration.manualReviewRequired
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {moderationStats.contentModeration.manualReviewRequired ? 'Required' : 'Not Required'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'} lg:col-span-2`}>
              <h3 className="text-lg font-medium mb-4 text-zinc-900 dark:text-zinc-100">
                Recent Activity (Last 7 Days)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      User Verifications
                    </p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {moderationStats.activity.recentVerifications}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Content Moderations
                    </p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {moderationStats.activity.recentModerations}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedUser(null);
          setNotes('');
        }}
        title="Approve User"
      >
        <div className="space-y-4">
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <img
                src={selectedUser.profilePicture || 'https://via.placeholder.com/40'}
                alt={selectedUser.fullName}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedUser.fullName}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedUser.email}
                </p>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300'
              }`}
              placeholder="Add any notes about this approval..."
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setShowApproveModal(false);
                setSelectedUser(null);
                setNotes('');
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleApproveUser(selectedUser._id, notes)}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedUser(null);
          setRejectionReason('');
          setNotes('');
        }}
        title="Reject User"
      >
        <div className="space-y-4">
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <img
                src={selectedUser.profilePicture || 'https://via.placeholder.com/40'}
                alt={selectedUser.fullName}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedUser.fullName}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedUser.email}
                </p>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Rejection Reason *
            </label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300'
              }`}
            >
              <option value="">Select a reason...</option>
              {rejectionReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300'
              }`}
              placeholder="Add any additional notes..."
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedUser(null);
                setRejectionReason('');
                setNotes('');
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleRejectUser(selectedUser._id, rejectionReason, notes)}
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason}
            >
              Reject User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal
        isOpen={showBulkActions}
        onClose={() => {
          setShowBulkActions(false);
          setRejectionReason('');
        }}
        title={`Bulk Actions (${selectedUsers.length} users)`}
      >
        <div className="space-y-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Choose an action to apply to all selected users
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleBulkApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve All
            </Button>
            <Button
              onClick={() => {
                setShowBulkActions(false);
                setRejectionReason('');
              }}
              variant="outline"
            >
              Reject All
            </Button>
          </div>
          
          {showBulkActions && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Rejection Reason *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300'
                  }`}
                >
                  <option value="">Select a reason...</option>
                  {rejectionReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => {
                    setShowBulkActions(false);
                    setRejectionReason('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkReject}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!rejectionReason}
                >
                  Reject All
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Verification;
