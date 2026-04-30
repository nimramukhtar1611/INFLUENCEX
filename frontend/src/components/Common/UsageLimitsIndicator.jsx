// components/Common/UsageLimitsIndicator.jsx
import React from 'react';
import { AlertTriangle, TrendingUp, Users, HardDrive, Upload } from 'lucide-react';
import { useUsageLimits } from '../../hooks/useUsageLimits';
import { useTheme } from '../../hooks/useTheme';

const UsageLimitsIndicator = ({ type = 'campaign' }) => {
  const { isDark } = useTheme();
  const { 
    checkCampaignLimit, 
    checkActiveDealsLimit, 
    checkStorageQuota, 
    checkDailyUploadLimit,
    loading 
  } = useUsageLimits();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={`h-16 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
      </div>
    );
  }

  const getLimitInfo = () => {
    switch (type) {
      case 'campaign':
        return checkCampaignLimit();
      case 'deals':
        return checkActiveDealsLimit();
      case 'storage':
        return checkStorageQuota();
      case 'uploads':
        return checkDailyUploadLimit();
      default:
        return checkCampaignLimit();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'campaign':
        return TrendingUp;
      case 'deals':
        return Users;
      case 'storage':
        return HardDrive;
      case 'uploads':
        return Upload;
      default:
        return TrendingUp;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'campaign':
        return 'Campaigns';
      case 'deals':
        return 'Active Deals';
      case 'storage':
        return 'Storage';
      case 'uploads':
        return 'Daily Uploads';
      default:
        return 'Campaigns';
    }
  };

  const limitInfo = getLimitInfo();
  const Icon = getIcon();
  const label = getLabel();
  const usagePercentage = limitInfo.limit > 0 ? (limitInfo.current / limitInfo.limit) * 100 : 0;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  return (
    <div className={`p-4 rounded-lg border ${
      isAtLimit 
        ? isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
        : isNearLimit
        ? isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'
        : isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${
            isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-zinc-500'
          }`} />
          <span className={`text-sm font-medium ${
            isDark ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            {label}
          </span>
        </div>
        <span className={`text-xs font-medium ${
          isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-zinc-500'
        }`}>
          {limitInfo.current} / {limitInfo.limit}
        </span>
      </div>
      
      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-xs ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          {limitInfo.remaining} remaining
        </span>
        
        {!limitInfo.canCreate && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">Limit reached</span>
          </div>
        )}
      </div>
      
      {isNearLimit && !isAtLimit && (
        <p className={`text-xs mt-2 ${
          isDark ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          You're approaching the {label.toLowerCase()} limit. Consider upgrading your plan.
        </p>
      )}
    </div>
  );
};

export default UsageLimitsIndicator;
