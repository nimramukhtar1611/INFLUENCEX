// hooks/useUsageLimits.js
import { useState, useEffect } from 'react';
import adminService from '../services/adminService';
import { useAuth } from './useAuth';

export const useUsageLimits = () => {
  const { user } = useAuth();
  const [usageLimits, setUsageLimits] = useState({
    maxCampaignsPerBrand: 50,
    maxActiveDealsPerCreator: 20,
    maxFileSize: 100,
    maxFilesPerUpload: 10,
    dailyUploadLimit: 100,
    storageQuotaPerUser: 1000
  });
  const [currentUsage, setCurrentUsage] = useState({
    campaigns: 0,
    activeDeals: 0,
    storageUsed: 0,
    uploadsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch usage limits for admin users
    if (user?.userType === 'admin' || user?.role === 'admin') {
      fetchUsageLimits();
    } else {
      // For non-admin users, use default limits and don't make API calls
      setLoading(false);
    }
  }, [user]);

  const fetchUsageLimits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only fetch usage limits from admin API if user is admin
      if (user?.userType === 'admin' || user?.role === 'admin') {
        const limitsResponse = await adminService.getUsageLimits();
        if (limitsResponse.success) {
          setUsageLimits(limitsResponse.data);
        }
      }
      
      // Calculate current usage based on user type
      if (user) {
        const usage = await calculateCurrentUsage();
        setCurrentUsage(usage);
      }
    } catch (err) {
      console.error('Failed to fetch usage limits:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch usage limits');
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentUsage = async () => {
    // This would be implemented based on actual API calls to get current usage
    // For now, return placeholder values
    return {
      campaigns: 0,
      activeDeals: 0,
      storageUsed: 0,
      uploadsToday: 0
    };
  };

  const checkCampaignLimit = () => {
    if (user?.userType === 'brand') {
      return {
        canCreate: currentUsage.campaigns < usageLimits.maxCampaignsPerBrand,
        current: currentUsage.campaigns,
        limit: usageLimits.maxCampaignsPerBrand,
        remaining: usageLimits.maxCampaignsPerBrand - currentUsage.campaigns
      };
    }
    return { canCreate: true };
  };

  const checkActiveDealsLimit = () => {
    if (user?.userType === 'creator') {
      return {
        canAccept: currentUsage.activeDeals < usageLimits.maxActiveDealsPerCreator,
        current: currentUsage.activeDeals,
        limit: usageLimits.maxActiveDealsPerCreator,
        remaining: usageLimits.maxActiveDealsPerCreator - currentUsage.activeDeals
      };
    }
    return { canAccept: true };
  };

  const checkFileSizeLimit = (fileSize) => {
    return {
      canUpload: fileSize <= usageLimits.maxFileSize * 1024 * 1024, // Convert MB to bytes
      current: fileSize,
      limit: usageLimits.maxFileSize * 1024 * 1024,
      remaining: (usageLimits.maxFileSize * 1024 * 1024) - fileSize
    };
  };

  const checkStorageQuota = () => {
    return {
      canUpload: currentUsage.storageUsed < usageLimits.storageQuotaPerUser * 1024 * 1024, // Convert MB to bytes
      current: currentUsage.storageUsed,
      limit: usageLimits.storageQuotaPerUser * 1024 * 1024,
      remaining: (usageLimits.storageQuotaPerUser * 1024 * 1024) - currentUsage.storageUsed
    };
  };

  const checkDailyUploadLimit = () => {
    return {
      canUpload: currentUsage.uploadsToday < usageLimits.dailyUploadLimit,
      current: currentUsage.uploadsToday,
      limit: usageLimits.dailyUploadLimit,
      remaining: usageLimits.dailyUploadLimit - currentUsage.uploadsToday
    };
  };

  const refreshUsage = () => {
    fetchUsageLimits();
  };

  return {
    usageLimits,
    currentUsage,
    loading,
    error,
    refreshUsage,
    checkCampaignLimit,
    checkActiveDealsLimit,
    checkFileSizeLimit,
    checkStorageQuota,
    checkDailyUploadLimit
  };
};
