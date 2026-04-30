import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, History, Loader2, RefreshCw, ShieldCheck, CreditCard, Activity, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme } from '../../hooks/useTheme';
import BrandLayout from '../../components/Brand/BrandLayout';

const formatCurrency = (value, currency = 'usd') => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
    minimumFractionDigits: 2
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const formatLimitValue = (value) => {
  const numeric = Number(value);
  if (numeric === -1) return '∞';
  return Number.isFinite(numeric) ? String(numeric) : '-';
};

const normalizePlanId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'object') {
    return (value.planId || value.id || value._id || '').trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
};

const ROLE_PLAN_COPY = {
  brand: {
    starter: { description: 'For early-stage brands launching creator campaigns', features: ['Campaign launch workflows', 'Advanced creator search', 'Basic collaboration', 'Performance visibility'] },
    professional: { description: 'For scaling brand teams running performance campaigns', features: ['AI Creator Matching Engine', 'Priority support', 'Higher collaboration limits', 'Advanced ROI intelligence'] },
    enterprise: { description: 'For enterprise brands and agencies', features: ['AI Counter Dealing', 'High-volume workflow support', 'Advanced account controls', 'Custom integrations'] }
  },
  creator: {
    free: { description: 'Perfect for getting started', features: ['2 completed deals total', 'Basic visibility', 'Core collaboration tools', 'Standard support'] },
    starter: { description: 'For creators building paid-collab momentum', features: ['10 completed deals total', 'More active deals capacity', 'Improved discoverability', 'Performance tracking'] },
    professional: { description: 'For creators focused on premium growth', features: ['30 completed deals total', 'Creator Growth OS access', 'Deeper performance insights', 'Priority support'] },
    enterprise: { description: 'For top creators running at scale', features: ['Infinite deals', 'AI Counter Dealing', 'Maximum workflow headroom', 'Enterprise support'] }
  }
};

const getRoleSpecificPlanCopy = ({ userType, planId, fallbackDescription, fallbackFeatures }) => {
  const role = String(userType || '').toLowerCase();
  const normalizedPlanId = normalizePlanId(planId);
  const roleCopy = ROLE_PLAN_COPY[role]?.[normalizedPlanId];
  return {
    description: roleCopy?.description || fallbackDescription,
    features: (roleCopy?.features?.length ? roleCopy.features : fallbackFeatures)
  };
};

const SubscriptionManager = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    plans, currentSubscription, invoices, upcomingInvoice, limits, usage,
    loading, busy, isSubscriptionUser, refreshAll, startCheckout,
    startPlanChange, openBillingPortal, downloadInvoice
  } = useSubscription();

  const [interval, setInterval] = useState('month');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const tabs = [
    { id: 'plans', label: 'Plans', icon: ShieldCheck },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'usage', label: 'Usage', icon: Activity }
  ];

  const [activeTab, setActiveTab] = useState('plans');

  const actionButton = (
    <button
      onClick={refreshAll}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isDark 
          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
      }`}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('plan')) setSelectedPlanId(params.get('plan'));
    if (['year', 'month'].includes(params.get('interval'))) setInterval(params.get('interval'));
    if (params.get('checkout') === 'success') {
      toast.success('Subscription updated successfully.');
      refreshAll();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search, refreshAll, setInterval]);

  const activePlanId = useMemo(() => {
    if (!currentSubscription) return null;
    return normalizePlanId(currentSubscription.planDetails?.planId || currentSubscription.planId);
  }, [currentSubscription]);

  const selectedPlanIdNormalized = normalizePlanId(selectedPlanId);
  const isSelectedPlanFree = selectedPlanIdNormalized === 'free';
  const hasActiveStripeSubscription = Boolean(currentSubscription?.stripeSubscriptionId) && ['active', 'trialing', 'past_due'].includes(currentSubscription?.status);

  const handleSubscribeOrChange = async () => {
    const selectedPlan = plans.find(p => normalizePlanId(p.id) === selectedPlanIdNormalized);
    if (!selectedPlan || isSelectedPlanFree) return;

    if (hasActiveStripeSubscription) {
      if (normalizePlanId(selectedPlan.id) !== activePlanId) {
        await startPlanChange({ planId: selectedPlan.id, interval });
      } else {
        await openBillingPortal();
      }
    } else {
      await startCheckout({ planId: selectedPlan.id, interval });
    }
  };

  if (!isSubscriptionUser) {
    return (
      <div className={`p-12 text-center rounded-3xl border-2 border-dashed ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-white'}`}>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
          <p className="mt-2 text-zinc-500">Subscription management is for Brands and Creators only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="relative z-10">
        <BrandLayout
          title="Subscription"
          subtitle="Manage your billing, invoices and premium features."
          actionButton={actionButton}
          tabs={tabs}
          onTabChange={setActiveTab}
          activeTab={activeTab}
        >
          <div className="p-6">
          {/* Top Status Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className={`flex items-center px-4 py-2 rounded-full border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-3">Current</span>
              <span className="text-xs font-bold">{currentSubscription?.planDetails?.name || 'Free Tier'}</span>
            </div>
            <div className={`flex items-center px-4 py-2 rounded-full border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-3">Status</span>
              <span className="text-xs font-bold uppercase text-emerald-500">{currentSubscription?.status || 'Active'}</span>
            </div>
            <div className={`flex items-center px-4 py-2 rounded-full border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-3">Renewal</span>
              <span className="text-xs font-bold">{formatDate(currentSubscription?.billingPeriod?.end)}</span>
            </div>
        </div>
        
      {/* Plan Selection Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">Available Plans</h2>
          <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            {['month', 'year'].map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  interval === i 
                    ? (isDark ? 'bg-white text-white' : 'bg-black text-white shadow-lg') 
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                {i}ly
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const planId = normalizePlanId(plan.id);
            const isActive = activePlanId === planId;
            const isSelected = selectedPlanIdNormalized === planId;
            const isFree = planId === 'free';
            const copy = getRoleSpecificPlanCopy({ userType: user?.userType, planId, fallbackDescription: plan.description, fallbackFeatures: plan.features });

            return (
              <div
                key={plan.id}
                onClick={() => !isFree && setSelectedPlanId(plan.id)}
                className={`group relative p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between min-h-[320px] ${
                  isActive 
                    ? (isDark ? 'bg-white border-white text-white' : 'bg-black border-black text-white shadow-2xl scale-[1.02]')
                    : isSelected
                      ? (isDark ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-zinc-900 shadow-xl scale-[1.02]')
                      : (isDark ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-100 hover:border-zinc-300')
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold tracking-tight">{plan.name}</h3>
                    {isActive && <CheckCircle className={`w-5 h-5 ${isDark && isActive ? 'text-white' : 'text-emerald-500'}`} />}
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-bold tracking-tighter">
                      {formatCurrency(interval === 'year' ? plan.price * 12 : plan.price, plan.currency)}
                    </span>
                    <span className={`text-xs ml-1 ${isActive ? (isDark ? 'text-white' : 'text-zinc-400') : 'text-zinc-500'}`}>/{interval}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {copy.features.slice(0, 4).map((f, idx) => (
                      <li key={idx} className="flex items-start text-xs font-medium">
                        <ShieldCheck className={`w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 ${isActive ? (isDark ? 'text-zinc-400' : 'text-zinc-500') : 'text-indigo-500'}`} />
                        <span className="opacity-80 leading-relaxed">{typeof f === 'string' ? f : f.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {!isFree && !isActive && (
                  <div className={`mt-auto text-center py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                    isSelected ? (isDark ? 'bg-white text-white border-white' : 'bg-black text-white border-black') : 'border-zinc-700 text-zinc-500 group-hover:border-zinc-500'
                  }`}>
                    {isSelected ? 'Ready to Upgrade' : 'Select Plan'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900 text-white border border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-800 rounded-2xl">
              <CreditCard className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-bold">Secure Billing</p>
              <p className="text-xs text-zinc-500">Payments are processed securely via Stripe.</p>
            </div>
          </div>
          <button
            onClick={handleSubscribeOrChange}
            disabled={busy || isSelectedPlanFree || (!selectedPlanId && !hasActiveStripeSubscription)}
            className="w-full md:w-auto px-8 py-3 rounded-full bg-white text-gray-700 text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 inline-flex items-center justify-center"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {hasActiveStripeSubscription ? 'Update Subscription' : 'Get Started Now'}
          </button>
        </div>
      </div>

      {/* Grid for Usage and Invoices */}
      <div className="grid grid-cols-1 mt-4 lg:grid-cols-2 gap-8">
        {/* Usage Section */}
        <div className={`p-8 rounded-3xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Plan Usage
            </h2>
          </div>
          <div className="space-y-6">
            {(user?.userType === 'brand' ? [
              { label: 'Campaigns', used: usage?.campaignsUsed, total: limits?.campaigns },
              { label: 'Deals', used: usage?.activeDealsUsed, total: limits?.activeDeals }
            ] : [
              { label: 'Active Deals', used: usage?.activeDealsUsed, total: limits?.activeDeals },
              { label: 'Completed', used: usage?.completedDealsUsed, total: limits?.completedDeals }
            ]).map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>{item.label}</span>
                  <span>{item.used ?? 0} / {formatLimitValue(item.total)}</span>
                </div>
                <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                  <div 
                    className="h-full rounded-full bg-zinc-400" 
                    style={{ width: `${Math.min(((item.used || 0) / (item.total === -1 ? 100 : item.total || 1)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices Section */}
        <div className={`p-8 rounded-3xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center">
              <History className="w-4 h-4 mr-2" /> Billing History
            </h2>
          </div>
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-center py-10 text-xs text-zinc-500 italic">No transaction records found.</p>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id || inv._id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-600' : 'bg-gray-50 border-transparent hover:border-zinc-200'}`}>
                  <div>
                    <p className="text-xs font-bold tracking-tight">{inv.number || 'Invoice ID'}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{formatDate(inv.date || inv.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold">{formatCurrency(inv.amount, inv.currency)}</span>
                    <button 
                      onClick={() => downloadInvoice(inv.id || inv._id)}
                      className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>

        <div className="pt-6 text-center border-t border-zinc-800/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            Securely logged in as <span className="text-zinc-400">{user?.email}</span>
          </p>
        </div>
        </div>
        </BrandLayout>
      </div>
    </div>
  );
};

export default SubscriptionManager;