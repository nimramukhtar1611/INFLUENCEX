import api from './api';

class ContractService {
  async getUserContracts(page = 1, limit = 10, status = '') {
    try {
      const params = { page, limit };
      if (status) params.status = status;
      const response = await api.get('/contracts/user', { params });
      return response.data;
    } catch (error) {
      console.error('Get user contracts error:', error);
      throw error;
    }
  }

  async getContract(contractId) {
    try {
      const response = await api.get(`/contracts/${contractId}`);
      return response.data;
    } catch (error) {
      console.error('Get contract error:', error);
      throw error;
    }
  }

  async getContractByDeal(dealId) {
    try {
      const response = await api.get(`/contracts/deal/${dealId}`);
      return response.data;
    } catch (error) {
      console.error('Get contract by deal error:', error);
      throw error;
    }
  }

  async signContract(contractId, signatureData) {
    try {
      const response = await api.post(`/contracts/${contractId}/sign`, signatureData);
      return response.data;
    } catch (error) {
      console.error('Sign contract error:', error);
      throw error;
    }
  }

  async downloadContract(contractId) {
    try {
      const response = await api.get(`/contracts/${contractId}/download`);
      return response.data;
    } catch (error) {
      console.error('Download contract error:', error);
      throw error;
    }
  }

  async createContract(contractData) {
    try {
      const response = await api.post('/contracts/generate', contractData);
      return response.data;
    } catch (error) {
      console.error('Create contract error:', error);
      throw error;
    }
  }

  async createContractFromDeal(dealId) {
    try {
      const response = await api.post(`/contracts/create-from-deal/${dealId}`);
      return response.data;
    } catch (error) {
      console.error('Create contract from deal error:', error);
      throw error;
    }
  }

  async sendForSignature(contractId) {
    try {
      const response = await api.post(`/contracts/${contractId}/send-for-signature`);
      return response.data;
    } catch (error) {
      console.error('Send for signature error:', error);
      throw error;
    }
  }

  // ==================== UPDATE CONTRACT ====================
  async updateContract(contractId, updateData) {
    try {
      const response = await api.put(`/contracts/${contractId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Update contract error:', error);
      throw error;
    }
  }

  // ==================== DELETE CONTRACT ====================
  async deleteContract(contractId) {
    try {
      const response = await api.delete(`/contracts/${contractId}`);
      return response.data;
    } catch (error) {
      console.error('Delete contract error:', error);
      throw error;
    }
  }

  // ==================== GET CONTRACT TEMPLATES ====================
  async getContractTemplates() {
    try {
      const response = await api.get('/contracts/templates');
      return response.data;
    } catch (error) {
      console.error('Get contract templates error:', error);
      throw error;
    }
  }

  // ==================== PREVIEW CONTRACT ====================
  async previewContract(contractData) {
    try {
      const response = await api.post('/contracts/preview', contractData);
      return response.data;
    } catch (error) {
      console.error('Preview contract error:', error);
      throw error;
    }
  }

  // ==================== VALIDATE CONTRACT ====================
  async validateContract(contractData) {
    try {
      const response = await api.post('/contracts/validate', contractData);
      return response.data;
    } catch (error) {
      console.error('Validate contract error:', error);
      throw error;
    }
  }

  // ==================== UPDATE CONTRACT STATUS ====================
  async updateContractStatus(contractId, status, reason = '') {
    try {
      const response = await api.put(`/contracts/${contractId}/status`, { status, reason });
      return response.data;
    } catch (error) {
      console.error('Update contract status error:', error);
      throw error;
    }
  }
}

export default new ContractService();