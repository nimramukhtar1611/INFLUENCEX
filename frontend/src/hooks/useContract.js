// hooks/useContract.js - COMPLETE PRODUCTION-READY VERSION
import { useState, useCallback } from 'react';
import contractService from '../services/contractService';
import toast from 'react-hot-toast';

export const useContract = () => {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [currentContract, setCurrentContract] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
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
  const fetchUserContracts = useCallback(async (status = 'all', page = 1, limit = 10) => {
    try {
      setLoading(true);
      console.log('Fetching user contracts with status:', status, 'page:', page);
      
      const response = await contractService.getUserContracts(status, page, limit);
      
      console.log('User contracts response:', response);
      
      if (response?.success) {
        setContracts(response.contracts || []);
        setPagination(response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        });
        setCounts(response.counts || {});
      } else {
        console.error('Failed to fetch contracts:', response?.error);
        toast.error(response?.error || 'Failed to load contracts');
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH SINGLE CONTRACT ====================
  const fetchContract = useCallback(async (contractId) => {
    try {
      setLoading(true);
      const response = await contractService.getContract(contractId);
      
      if (response?.success && response.contract) {
        setCurrentContract(response.contract);
        return response.contract;
      } else {
        console.error('Contract not found or invalid response', response);
        return null;
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== CREATE CONTRACT ====================
  const createContract = useCallback(async (contractData) => {
    try {
      setLoading(true);
      const response = await contractService.createContract(contractData);
      
      if (response?.success && response.contract) {
        toast.success('Contract created successfully');
        setContracts(prev => [response.contract, ...prev]);
        return response.contract;
      } else {
        toast.error(response?.error || 'Failed to create contract');
        return null;
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== CREATE CONTRACT FROM DEAL ====================
  const createContractFromDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      const response = await contractService.createContractFromDeal(dealId);
      
      if (response?.success && response.contract) {
        toast.success('Contract created from deal successfully');
        setContracts(prev => [response.contract, ...prev]);
        return response.contract;
      } else {
        toast.error(response?.error || 'Failed to create contract from deal');
        return null;
      }
    } catch (error) {
      console.error('Error creating contract from deal:', error);
      toast.error('Failed to create contract from deal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== SIGN CONTRACT ====================
  const signContract = useCallback(async (contractId, signatureData) => {
    try {
      setLoading(true);
      const response = await contractService.signContract(contractId, signatureData);
      
      if (response?.success) {
        toast.success('Contract signed successfully');
        
        // Update contracts list
        setContracts(prev => prev.map(c => 
          c._id === contractId ? { ...c, status: 'signed' } : c
        ));
        
        // Update current contract if loaded
        if (currentContract?._id === contractId) {
          setCurrentContract(prev => ({ ...prev, status: 'signed' }));
        }
        
        return true;
      } else {
        toast.error(response?.error || 'Failed to sign contract');
        return false;
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('Failed to sign contract');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentContract]);

  // ==================== SEND FOR SIGNATURE ====================
  const sendForSignature = useCallback(async (contractId) => {
    try {
      setLoading(true);
      const response = await contractService.sendForSignature(contractId);
      
      if (response?.success) {
        toast.success('Contract sent for signature');
        
        // Update contracts list
        setContracts(prev => prev.map(c => 
          c._id === contractId ? { ...c, status: 'pending_signature' } : c
        ));
        
        // Update current contract if loaded
        if (currentContract?._id === contractId) {
          setCurrentContract(prev => ({ ...prev, status: 'pending_signature' }));
        }
        
        return true;
      } else {
        toast.error(response?.error || 'Failed to send contract for signature');
        return false;
      }
    } catch (error) {
      console.error('Error sending contract for signature:', error);
      toast.error('Failed to send contract for signature');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentContract]);

  // ==================== DOWNLOAD CONTRACT ====================
  const downloadContract = useCallback(async (contractId) => {
    try {
      const response = await contractService.downloadContract(contractId);
      
      if (response?.success) {
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
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast.error('Failed to download contract');
      return false;
    }
  }, []);

  // ==================== GET CONTRACT BY DEAL ====================
  const getContractByDeal = useCallback(async (dealId) => {
    try {
      const response = await contractService.getContractByDeal(dealId);
      
      if (response?.success && response.contract) {
        return response.contract;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching contract by deal:', error);
      return null;
    }
  }, []);

  // ==================== GET STATUS CONFIG ====================
  const getStatusConfig = useCallback((status) => {
    return statusConfig[status] || statusConfig.draft;
  }, []);

  return {
    loading,
    contracts,
    currentContract,
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
    getContractByDeal,
    getStatusConfig,
    setCurrentContract,
  };
};

export default useContract;
