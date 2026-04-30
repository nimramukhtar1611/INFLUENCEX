import api from './api';

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const emptyPagination = (page = 1, limit = 10) => ({
  page: toNumber(page, 1),
  limit: toNumber(limit, 10),
  total: 0,
  pages: 0,
});

class AdminService {
  // Get dashboard data
  async getDashboard() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get platform analytics
  async getAnalytics(params = {}) {
    try {
      const response = await api.get('/admin/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Analytics error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all users with filters
  async getUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get single user
  async getUser(userId) {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update user
  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Verify user
  async verifyUser(userId) {
    try {
      const response = await api.post(`/admin/users/${userId}/verify`);
      return response.data;
    } catch (error) {
      console.error('Verify user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Suspend user
  async suspendUser(userId, reason, duration) {
    try {
      const response = await api.post(`/admin/users/${userId}/suspend`, { reason, duration });
      return response.data;
    } catch (error) {
      console.error('Suspend user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Activate user
  async activateUser(userId) {
    try {
      const response = await api.post(`/admin/users/${userId}/activate`);
      return response.data;
    } catch (error) {
      console.error('Activate user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all brands
  async getBrands(params = {}) {
    try {
      const response = await api.get('/admin/users', {
        params: { ...params, user_type: 'brand' }
      });

      const users = response.data?.users || [];
      const brands = users.map((user) => ({
        ...user,
        brandName: user.brandName || user.fullName || user.email,
        stats: {
          totalCampaigns: user.stats?.campaigns || 0,
          totalSpent: user.stats?.spent || 0,
          totalCreators: user.stats?.creators || 0,
          averageRating: user.stats?.rating || 0,
        }
      }));

      return {
        success: true,
        brands,
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get brands error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all creators
  async getCreators(params = {}) {
    try {
      const response = await api.get('/admin/users', {
        params: { ...params, user_type: 'creator' }
      });

      const users = response.data?.users || [];
      const creators = users.map((user) => ({
        ...user,
        displayName: user.displayName || user.fullName || user.email,
        stats: {
          totalEarnings: user.stats?.earnings || 0,
          completedCampaigns: user.stats?.campaigns || 0,
          averageRating: user.stats?.rating || 0,
        }
      }));

      return {
        success: true,
        creators,
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get creators error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all campaigns
  async getCampaigns(params = {}) {
    try {
      const response = await api.get('/admin/campaigns', { params });

      const campaigns = (response.data?.data || []).map((campaign) => ({
        ...campaign,
        spent: toNumber(campaign.spent, toNumber(campaign.stats?.totalSpent, 0)),
      }));

      return {
        success: response.data?.success ?? true,
        campaigns,
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get campaigns error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get campaign details
  async getCampaign(campaignId) {
    try {
      const response = await api.get(`/admin/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Get campaign error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update campaign status
  async updateCampaignStatus(campaignId, status, reason) {
    try {
      const payload = { status };
      if (reason) payload.reason = reason;
      const response = await api.put(`/admin/campaigns/${campaignId}/status`, payload);
      return response.data;
    } catch (error) {
      console.error('Update campaign status error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all deals
  async getDeals(params = {}) {
    try {
      const response = await api.get('/admin/deals', { params });
      return {
        success: response.data?.success ?? true,
        deals: response.data?.deals || [],
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get deals error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get deal details
  async getDeal(dealId) {
    try {
      const response = await api.get(`/admin/deals/${dealId}`);
      return response.data;
    } catch (error) {
      console.error('Get deal error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all payments
  async getPayments(params = {}) {
    try {
      const response = await api.get('/admin/payments', { params });
      return {
        success: response.data?.success ?? true,
        payments: response.data?.payments || [],
        summary: response.data?.summary || { totalAmount: 0, totalFees: 0, totalNet: 0, count: 0 },
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get payments error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get payment details
  async getPayment(paymentId) {
    try {
      const response = await api.get(`/admin/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Get payment error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Refund payment
  async refundPayment(paymentId, reason) {
    try {
      const response = await api.post(`/admin/payments/${paymentId}/refund`, { reason });
      return response.data;
    } catch (error) {
      console.error('Refund payment error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all disputes
  async getDisputes(params = {}) {
    try {
      const response = await api.get('/admin/disputes', { params });
      return response.data;
    } catch (error) {
      console.error('Get disputes error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get fraud review queue
  async getFraudReviewQueue(params = {}) {
    try {
      const response = await api.get('/admin/fraud/review-queue', { params });
      return {
        success: response.data?.success ?? true,
        queue: response.data?.queue || 'manual_review',
        creators: response.data?.creators || [],
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get fraud review queue error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get fraud details for one creator
  async getFraudCreatorDetails(creatorId) {
    try {
      const response = await api.get(`/admin/fraud/creators/${creatorId}`);
      return response.data;
    } catch (error) {
      console.error('Get fraud creator details error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update fraud review status (clear hold / mark manual review)
  async updateFraudReviewStatus(creatorId, action, notes = '') {
    try {
      const response = await api.patch(`/admin/fraud/creators/${creatorId}/review`, {
        action,
        notes,
      });
      return response.data;
    } catch (error) {
      console.error('Update fraud review status error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get dispute details
  async getDispute(disputeId) {
    try {
      const response = await api.get(`/admin/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      console.error('Get dispute error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update dispute
  async updateDispute(disputeId, disputeData) {
    try {
      const response = await api.put(`/admin/disputes/${disputeId}`, disputeData);
      return response.data;
    } catch (error) {
      console.error('Update dispute error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Resolve dispute
  async resolveDispute(disputeId, resolution) {
    try {
      const response = await api.post(`/admin/disputes/${disputeId}/resolve`, resolution);
      return response.data;
    } catch (error) {
      console.error('Resolve dispute error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get moderation queue
  async getModerationQueue(params = {}) {
    try {
      return {
        success: true,
        items: [],
        pagination: emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get moderation queue error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Approve item
  async approveItem(type, id, notes) {
    try {
      const response = await api.post(`/admin/moderation/${type}/${id}/approve`, { notes });
      return response.data;
    } catch (error) {
      console.error('Approve item error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Reject item
  async rejectItem(type, id, reason) {
    try {
      const response = await api.post(`/admin/moderation/${type}/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Reject item error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get platform settings
  async getSettings() {
    try {
      const response = await api.get('/admin/settings');
      return response.data;
    } catch (error) {
      console.error('Get settings error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update platform settings
  async updateSettings(settingsData) {
    try {
      const response = await api.put('/admin/settings', settingsData);
      return response.data;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get fee structure
  async getFees() {
    try {
      const response = await api.get('/admin/fees');
      return response.data;
    } catch (error) {
      console.error('Get fees error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update fee structure
  async updateFees(feeData) {
    try {
      const response = await api.put('/admin/fees', feeData);
      return response.data;
    } catch (error) {
      console.error('Update fees error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get reports
  async getReports(params = {}) {
    try {
      const response = await api.get('/admin/reports', { params });
      return {
        success: response.data?.success ?? true,
        reports: response.data?.reports || [],
        pagination: response.data?.pagination || emptyPagination(params.page, params.limit),
      };
    } catch (error) {
      console.error('Get reports error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Generate report
  async generateReport(reportType, dateRange, format = 'pdf') {
    try {
      const response = await api.post('/admin/reports/generate', { type: reportType, dateRange, format });
      return response.data;
    } catch (error) {
      console.error('Generate report error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Download report
  async downloadReport(reportId, format = 'pdf') {
    try {
      const response = await api.get(`/admin/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Download report error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get system health
  async getSystemHealth() {
    try {
      const response = await api.get('/admin/health');
      return response.data;
    } catch (error) {
      console.error('Get system health error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get system logs
  async getLogs(params = {}) {
    try {
      const response = await api.get('/admin/system/logs', { params });
      return response.data;
    } catch (error) {
      console.error('Get logs error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Clear cache
  async clearCache() {
    try {
      const response = await api.post('/admin/system/clear-cache');
      return response.data;
    } catch (error) {
      console.error('Clear cache error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get audit logs
  async getAuditLogs(params = {}) {
    try {
      const response = await api.get('/admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Approve withdrawal
  async approveWithdrawal(withdrawalId, notes) {
    try {
      const response = await api.post(`/admin/withdrawals/${withdrawalId}/approve`, { notes });
      return response.data;
    } catch (error) {
      console.error('Approve withdrawal error:', error);
      throw error.response?.data || error.message;
    }
  }

  // 2FA Methods
  async get2FAStatus() {
    try {
      const response = await api.get('/admin/2fa/status');
      return response.data;
    } catch (error) {
      console.error('Get 2FA status error:', error);
      throw error.response?.data || error.message;
    }
  }

  async generate2FA() {
    try {
      const response = await api.post('/admin/2fa/generate');
      return response.data;
    } catch (error) {
      console.error('Generate 2FA error:', error);
      throw error.response?.data || error.message;
    }
  }

  async verify2FA(token) {
    try {
      const response = await api.post('/admin/2fa/verify', { token });
      return response.data;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      throw error.response?.data || error.message;
    }
  }

  async disable2FA(token) {
    try {
      const response = await api.post('/admin/2fa/disable', { token });
      return response.data;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Rotate logs
  async rotateLogs() {
    try {
      const response = await api.post('/admin/system/rotate-logs');
      return response.data;
    } catch (error) {
      console.error('Rotate logs error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Create backup
  async createBackup() {
    try {
      const response = await api.post('/admin/system/create-backup');
      return response.data;
    } catch (error) {
      console.error('Create backup error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Maintenance mode
  async setMaintenanceMode(enabled) {
    try {
      const response = await api.post('/admin/system/maintenance-mode', { enabled });
      return response.data;
    } catch (error) {
      console.error('Maintenance mode error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Upload profile picture
  async uploadProfilePicture(formData) {
    try {
      const response = await api.post('/upload/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Upload profile picture error:', error);
      throw error.response?.data || error.message;
    }
  }

  // ==================== ADMIN ACCOUNT MANAGEMENT ====================

  // Update admin email
  async updateAdminEmail(emailData) {
    try {
      const response = await api.put('/admin/account/email', emailData);
      return response.data;
    } catch (error) {
      console.error('Update admin email error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update admin password
  async updateAdminPassword(passwordData) {
    try {
      const response = await api.put('/admin/account/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Update admin password error:', error);
      throw error.response?.data || error.message;
    }
  }

  // ==================== USAGE LIMITS MANAGEMENT ====================

  // Get usage limits settings
  async getUsageLimits() {
    try {
      const response = await api.get('/admin/usage-limits');
      return response.data;
    } catch (error) {
      console.error('Get usage limits error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update usage limits settings
  async updateUsageLimits(limitsData) {
    try {
      const response = await api.put('/admin/usage-limits', limitsData);
      return response.data;
    } catch (error) {
      console.error('Update usage limits error:', error);
      throw error.response?.data || error.message;
    }
  }

  // ==================== FILE UPLOAD SETTINGS MANAGEMENT ====================

  // Get file upload settings
  async getFileUploadSettings() {
    try {
      const response = await api.get('/admin/file-upload-settings');
      return response.data;
    } catch (error) {
      console.error('Get file upload settings error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update file upload settings
  async updateFileUploadSettings(settingsData) {
    try {
      const response = await api.put('/admin/file-upload-settings', settingsData);
      return response.data;
    } catch (error) {
      console.error('Update file upload settings error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Add file type to allowed list
  async addFileType(fileType) {
    try {
      const response = await api.post('/admin/file-types', { fileType });
      return response.data;
    } catch (error) {
      console.error('Add file type error:', error);
      console.error('Error response:', error.response?.data);
      
      // Extract error message properly - handle different error formats
      let errorMessage = 'Failed to add file type';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors (array format)
        if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(err => err.msg || err.message).join(', ');
        }
        // Handle single error message
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
        // Handle message field
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Handle array of messages
        else if (Array.isArray(errorData) && errorData.length > 0) {
          errorMessage = errorData.map(err => err.msg || err.message || err).join(', ');
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Remove file type from allowed list
  async removeFileType(fileType) {
    try {
      const response = await api.delete(`/admin/file-types/${fileType}`);
      return response.data;
    } catch (error) {
      console.error('Remove file type error:', error);
      console.error('Error response:', error.response?.data);
      
      // Extract error message properly - handle different error formats
      let errorMessage = 'Failed to remove file type';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors (array format)
        if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(err => err.msg || err.message).join(', ');
        }
        // Handle single error message
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
        // Handle message field
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Handle array of messages
        else if (Array.isArray(errorData) && errorData.length > 0) {
          errorMessage = errorData.map(err => err.msg || err.message || err).join(', ');
        }
      }
      
      throw new Error(errorMessage);
    }
  }
}

export default new AdminService();