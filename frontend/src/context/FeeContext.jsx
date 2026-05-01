import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FeeContext = createContext();

export const useFees = () => {
  const context = useContext(FeeContext);
  if (!context) {
    throw new Error('useFees must be used within a FeeProvider');
  }
  return context;
};

export const FeeProvider = ({ children }) => {
  const [fees, setFees] = useState({
    commissionRate: 10,
    escrowFee: 0,
    taxRate: 0,
    withdrawalFee: 0,
    featuredListingFee: 50,
    minPayoutAmount: 50,
    minEscrowAmount: 100,
    taxInclusive: false,
    withdrawalFeeType: 'fixed',
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current fees from API
  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/global/settings');
      console.log('💰 FeeContext: API Response:', response.status, response.data);
      
      if (response?.data?.success && response?.data?.settings) {
        const settings = response.data.settings;
        
        const newFees = {
          commissionRate: parseFloat(settings.commissionRate ?? 10),
          escrowFee: parseFloat(settings.escrowFee ?? 0),
          taxRate: parseFloat(settings.taxRate ?? 0),
          withdrawalFee: parseFloat(settings.withdrawalFee ?? 0),
          featuredListingFee: parseFloat(settings.featuredListingFee ?? 50),
          minPayoutAmount: parseFloat(settings.minPayoutAmount ?? 50),
          minEscrowAmount: parseFloat(settings.minEscrowAmount ?? 100),
          taxInclusive: Boolean(settings.taxInclusive ?? false),
          withdrawalFeeType: String(settings.withdrawalFeeType ?? 'fixed'),
          lastUpdated: new Date()
        };
        
        setFees(newFees);
        return newFees;
      } else {
        console.warn('💰 FeeContext: Invalid settings response:', response.data);
      }
    } catch (err) {
      console.error('💰 FeeContext: Failed to fetch fees:', err);
      setError(err.message || 'Failed to load fee settings');
      toast.error('Failed to load current fee settings');
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependency on fees.lastUpdated to prevent infinite loop

  // Calculate platform commission
  const calculateCommission = useCallback((amount) => {
    const commissionAmount = (amount * fees.commissionRate) / 100;
    return {
      originalAmount: parseFloat(amount),
      commissionRate: fees.commissionRate,
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
      netAmount: parseFloat((amount - commissionAmount).toFixed(2))
    };
  }, [fees.commissionRate]);

  // Calculate escrow fee
  const calculateEscrowFee = useCallback((amount) => {
    const escrowFeeAmount = (amount * fees.escrowFee) / 100;
    return {
      originalAmount: parseFloat(amount),
      escrowFeeRate: fees.escrowFee,
      escrowFeeAmount: parseFloat(escrowFeeAmount.toFixed(2)),
      totalWithEscrow: parseFloat((amount + escrowFeeAmount).toFixed(2))
    };
  }, [fees.escrowFee]);

  // Calculate withdrawal fee
  const calculateWithdrawalFee = useCallback((amount) => {
    let withdrawalFeeAmount = 0;

    if (fees.withdrawalFeeType === 'fixed') {
      withdrawalFeeAmount = fees.withdrawalFee;
    } else if (fees.withdrawalFeeType === 'percentage') {
      withdrawalFeeAmount = (amount * fees.withdrawalFee) / 100;
    }

    return {
      originalAmount: parseFloat(amount),
      withdrawalFeeType: fees.withdrawalFeeType,
      withdrawalFeeAmount: parseFloat(withdrawalFeeAmount.toFixed(2)),
      netAmount: parseFloat((amount - withdrawalFeeAmount).toFixed(2))
    };
  }, [fees.withdrawalFee, fees.withdrawalFeeType]);

  // Calculate tax
  const calculateTax = useCallback((amount) => {
    const taxAmount = (amount * fees.taxRate) / 100;
    return {
      originalAmount: parseFloat(amount),
      taxRate: fees.taxRate,
      taxInclusive: fees.taxInclusive,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalWithTax: parseFloat((amount + taxAmount).toFixed(2))
    };
  }, [fees.taxRate, fees.taxInclusive]);

  // Calculate total fees for a transaction
  const calculateTotalFees = useCallback((amount, options = {}) => {
    const {
      includeCommission = true,
      includeEscrow = false,
      includeWithdrawal = false,
      includeTax = false
    } = options;

    const results = {
      originalAmount: parseFloat(amount),
      fees: {},
      totalFees: 0,
      netAmount: parseFloat(amount)
    };

    // Calculate commission
    if (includeCommission) {
      const commission = calculateCommission(amount);
      results.fees.commission = commission;
      results.totalFees += commission.commissionAmount;
      results.netAmount -= commission.commissionAmount;
    }

    // Calculate escrow fee
    if (includeEscrow) {
      const escrow = calculateEscrowFee(amount);
      results.fees.escrow = escrow;
      results.totalFees += escrow.escrowFeeAmount;
      if (!fees.taxInclusive) {
        results.netAmount += escrow.escrowFeeAmount;
      }
    }

    // Calculate withdrawal fee
    if (includeWithdrawal) {
      const withdrawal = calculateWithdrawalFee(results.netAmount);
      results.fees.withdrawal = withdrawal;
      results.totalFees += withdrawal.withdrawalFeeAmount;
      results.netAmount -= withdrawal.withdrawalFeeAmount;
    }

    // Calculate tax
    if (includeTax && !fees.taxInclusive) {
      const tax = calculateTax(results.originalAmount);
      results.fees.tax = tax;
      results.totalFees += tax.taxAmount;
      results.netAmount -= tax.taxAmount;
    }

    // Round final values
    results.totalFees = parseFloat(results.totalFees.toFixed(2));
    results.netAmount = parseFloat(results.netAmount.toFixed(2));

    return results;
  }, [calculateCommission, calculateEscrowFee, calculateWithdrawalFee, calculateTax, fees.taxInclusive]);

  // Validate minimum amount
  const validateMinimumAmount = useCallback((amount, type = 'payout') => {
    const minAmount = type === 'payout' ? fees.minPayoutAmount : fees.minEscrowAmount;
    
    return {
      isValid: parseFloat(amount) >= minAmount,
      minimumAmount: minAmount,
      actualAmount: parseFloat(amount),
      difference: parseFloat((minAmount - amount).toFixed(2))
    };
  }, [fees.minPayoutAmount, fees.minEscrowAmount]);

  // Refresh fees (call after admin updates)
  const refreshFees = useCallback(async () => {
    await fetchFees();
  }, [fetchFees]);

  // Initialize fees on mount
  useEffect(() => {
    fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const value = {
    // State
    fees,
    loading,
    error,
    
    // Actions
    refreshFees,
    
    // Calculation methods
    calculateCommission,
    calculateEscrowFee,
    calculateWithdrawalFee,
    calculateTax,
    calculateTotalFees,
    validateMinimumAmount
  };

  return (
    <FeeContext.Provider value={value}>
      {children}
    </FeeContext.Provider>
  );
};
