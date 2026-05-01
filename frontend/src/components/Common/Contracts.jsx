import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Shield,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import contractService from '../../services/contractService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Contracts = () => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    if (contracts) {
      let filtered = [...contracts];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.contractNumber?.toLowerCase().includes(query) ||
          c.brandId?.brandName?.toLowerCase().includes(query) ||
          c.creatorId?.displayName?.toLowerCase().includes(query) ||
          c.campaignId?.title?.toLowerCase().includes(query)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }
      setFilteredContracts(filtered);
    }
  }, [contracts, searchQuery, statusFilter]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await contractService.getUserContracts();
      if (res?.success) {
        setContracts(res.contracts || []);
      } else {
        toast.error(res?.error || 'Failed to load contracts');
      }
    } catch (error) {
      console.error('Fetch contracts error:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (contract) => {
    try {
      if (contract.pdfUrl) {
        window.open(contract.pdfUrl, '_blank');
      } else {
        const res = await contractService.downloadContract(contract._id);
        if (res?.success) {
          window.open(res.url, '_blank');
        } else {
          toast.error('Failed to download contract');
        }
      }
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const getStandardizedStatusColor = (status) => {
    return getStatusColor(status, 'status', false);
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': 
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'draft': return AlertCircle;
      case 'expired': return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600">View and manage all your agreements</p>
        </div>
        <Button
          variant="primary"
          icon={FileText}
        >
          Create New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{contracts.filter(c => c.status === 'signed' || c.status === 'active').length}</p>
          <p className="text-sm text-gray-600">Active Contracts</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{contracts.filter(c => c.status === 'sent' || c.status === 'viewed' || c.status === 'partially_signed').length}</p>
          <p className="text-sm text-gray-600">Pending Signatures</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{contracts.filter(c => c.status === 'signed').length}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(contracts.reduce((sum, c) => sum + (c.paymentTerms?.total || 0), 0))}
          </p>
          <p className="text-sm text-gray-600">Total Value</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search contracts by title, brand, or creator..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="signed">Signed</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="draft">Draft</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signed</th>
                  <th className="px-6 py-3-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => {
                  const otherParty = contract.brandId?.brandName || contract.creatorId?.displayName;
                  const isBrand = contract.brandId?.brandName;
                  
                  return (
                    <tr key={contract._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{contract.contractNumber}</div>
                            <div className="text-sm text-gray-500">{contract.campaignId?.title || 'Campaign'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{contract.brandId?.brandName}</div>
                        <div className="text-sm text-gray-500">{contract.creatorId?.displayName}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(contract.paymentTerms?.total || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit gap-1 ${getStandardizedStatusColor(contract.status)}`}>
                          {React.createElement(getStatusIcon(contract.status), { className: `w-3 h-3 ${getStatusIconColor(contract.status)}` })}
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {contract.signedAt ? formatDate(contract.signedAt) : 'Not signed'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowPreviewModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDownload(contract)}
                          className="text-gray-400 hover:text-gray-600 mr-3"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-500">Contracts will appear here once deals are created.</p>
          </div>
        )}
      </div>

      {/* Contract Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Contract Details"
        size="lg"
      >
        {selectedContract && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedContract.title}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStandardizedStatusColor(selectedContract.status)}`}>
                {React.createElement(getStatusIcon(selectedContract.status), { className: `w-3 h-3 ${getStatusIconColor(selectedContract.status)}` })}
                {selectedContract.status}
              </span>
            </div>

            {/* Contract Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  Brand
                </div>
                <p className="font-medium">{selectedContract.brandId?.brandName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  Creator
                </div>
                <p className="font-medium">{selectedContract.creatorId?.displayName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Value
                </div>
                <p className="font-medium">{formatCurrency(selectedContract.paymentTerms?.total || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  Expiry
                </div>
                <p className="font-medium">{selectedContract.expiresAt ? formatDate(selectedContract.expiresAt) : '—'}</p>
              </div>
            </div>

            {/* Terms */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Terms & Conditions</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedContract.content || 'No terms provided.'}
                </p>
              </div>
            </div>

            {/* Deliverables */}
            {selectedContract.deliverables && selectedContract.deliverables.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Deliverables</h4>
                <div className="space-y-2">
                  {selectedContract.deliverables.map((del, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">{del.description}</p>
                      {del.requirements && <p className="text-sm text-gray-600 mt-1">Requirements: {del.requirements}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature Status */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Signature Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Brand</span>
                  </div>
                  {selectedContract.signedByBrand ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Signed {selectedContract.signatures?.find(s => s.userType === 'brand')?.signedAt ? formatDate(selectedContract.signatures.find(s => s.userType === 'brand').signedAt) : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-yellow-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Creator</span>
                  </div>
                  {selectedContract.signedByCreator ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Signed {selectedContract.signatures?.find(s => s.userType === 'creator')?.signedAt ? formatDate(selectedContract.signatures.find(s => s.userType === 'creator').signedAt) : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-yellow-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                icon={Download}
                onClick={() => handleDownload(selectedContract)}
              >
                Download PDF
              </Button>
              {(selectedContract.status === 'sent' || selectedContract.status === 'viewed') && (
                <Button
                  variant="primary"
                  icon={CheckCircle}
                >
                  Sign Contract
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contracts;