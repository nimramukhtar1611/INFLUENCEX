import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

const ContractContext = createContext();

export const useContract = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContract must be used within a ContractProvider');
  }
  return context;
};

export const ContractProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [currentContract, setCurrentContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [counts, setCounts] = useState({});

  // ==================== CONTRACT STATUS CONFIGURATION ====================
  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'bg-gray-100 text-gray-800',
      icon: '📝',
      nextActions: ['edit', 'send', 'delete'],
    },
    pending_signature: {
      label: 'Pending Signature',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⏳',
      nextActions: ['sign', 'cancel'],
    },
    signed: {
      label: 'Signed',
      color: 'bg-green-100 text-green-800',
      icon: '✅',
      nextActions: ['view', 'download'],
    },
    active: {
      label: 'Active',
      color: 'bg-blue-100 text-blue-800',
      icon: '⚙️',
      nextActions: ['view', 'amend', 'terminate'],
    },
    completed: {
      label: 'Completed',
      color: 'bg-purple-100 text-purple-800',
      icon: '🏆',
      nextActions: ['view', 'download'],
    },
    terminated: {
      label: 'Terminated',
      color: 'bg-red-100 text-red-800',
      icon: '❌',
      nextActions: ['view'],
    },
    expired: {
      label: 'Expired',
      color: 'bg-orange-100 text-orange-800',
      icon: '⏰',
      nextActions: ['view', 'renew'],
    },
  };

  // ==================== FETCH USER CONTRACTS ====================
  const fetchUserContracts = useCallback(async (status = 'all', page = 1) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/contracts/user', {
        params: {
          status: status || 'all',
          page,
          limit: 10,
        },
      });

      if (response.data?.success) {
        setContracts(response.data.contracts || []);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1,
        });
        setCounts(response.data.counts || {});
      } else {
        const errorMsg = response.data?.error || 'Failed to load contracts';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load contracts';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ==================== FETCH SINGLE CONTRACT ====================
  const fetchContract = useCallback(async (contractId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/contracts/${contractId}`);

      if (response.data?.success) {
        setCurrentContract(response.data.contract);
        return response.data.contract;
      } else {
        const errorMsg = response.data?.error || 'Failed to load contract';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load contract';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== CREATE CONTRACT ====================
  const createContract = useCallback(async (contractData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/contracts/generate', contractData);

      if (response.data?.success) {
        toast.success('Contract created successfully');
        await fetchUserContracts();
        return response.data.contract;
      } else {
        const errorMsg = response.data?.error || 'Failed to create contract';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create contract';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchUserContracts]);

  // ==================== CREATE CONTRACT FROM DEAL ====================
  const createContractFromDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/contracts/create-from-deal/${dealId}`);

      if (response.data?.success) {
        toast.success('Contract created from deal successfully');
        await fetchUserContracts();
        return response.data.contract;
      } else {
        const errorMsg = response.data?.error || 'Failed to create contract from deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create contract from deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchUserContracts]);

  // ==================== SIGN CONTRACT ====================
  const signContract = useCallback(async (contractId, signatureData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/contracts/${contractId}/sign`, signatureData);

      if (response.data?.success) {
        toast.success('Contract signed successfully');
        await fetchUserContracts();
        if (currentContract?._id === contractId) {
          await fetchContract(contractId);
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to sign contract';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to sign contract';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentContract, fetchUserContracts, fetchContract]);

  // ==================== SEND FOR SIGNATURE ====================
  const sendForSignature = useCallback(async (contractId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/contracts/${contractId}/send-for-signature`);

      if (response.data?.success) {
        toast.success('Contract sent for signature');
        await fetchUserContracts();
        if (currentContract?._id === contractId) {
          await fetchContract(contractId);
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to send contract for signature';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send contract for signature';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentContract, fetchUserContracts, fetchContract]);

  // ==================== DOWNLOAD CONTRACT ====================
  const downloadContract = useCallback(async (contractId) => {
    try {
      const response = await api.get(`/contracts/${contractId}/download`, {
        responseType: 'blob'
      });

      if (response.data) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `contract-${contractId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success('Contract downloaded successfully');
        return true;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to download contract';
      toast.error(errorMsg);
      return false;
    }
  }, []);

  // ==================== UPDATE CONTRACT STATUS ====================
  const updateContractStatus = useCallback(async (contractId, newStatus, reason = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/contracts/${contractId}/status`, { status: newStatus, reason });

      if (response.data?.success) {
        setContracts(prev =>
          prev.map(contract => (contract._id === contractId ? { ...contract, status: newStatus } : contract))
        );
        if (currentContract?._id === contractId) {
          setCurrentContract(prev => ({ ...prev, status: newStatus }));
        }
        toast.success(`Contract ${newStatus} successfully`);
        return true;
      } else {
        const errorMsg = response.data?.error || `Failed to ${newStatus} contract`;
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || `Failed to ${newStatus} contract`;
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentContract]);

  // ==================== GET STATUS CONFIG ====================
  const getStatusConfig = useCallback((status) => {
    return statusConfig[status] || statusConfig.draft;
  }, []);

  // ==================== RESET CURRENT CONTRACT ====================
  const resetCurrentContract = useCallback(() => {
    setCurrentContract(null);
  }, []);

  const value = {
    contracts,
    currentContract,
    loading,
    error,
    pagination,
    counts,
    statusConfig,
    fetchUserContracts,
    fetchContract,
    createContract,
    createContractFromDeal,
    signContract,
    sendForSignature,
    downloadContract,
    updateContractStatus,
    getStatusConfig,
    resetCurrentContract,
    setCurrentContract,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};

export default ContractContext;
