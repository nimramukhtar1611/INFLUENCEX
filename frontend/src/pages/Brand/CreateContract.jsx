import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useContract } from '../../hooks/useContract';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { DollarSign, FileText, Plus, X, ArrowLeft, Briefcase, Calendar, User, Building } from 'lucide-react';
import contractService from '../../services/contractService';
import creatorService from '../../services/creatorService';
import toast from 'react-hot-toast';

const CreateContract = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { campaigns, fetchBrandCampaigns, loading: campaignsLoading } = useCampaign();
  const { createContract, loading: contractLoading } = useContract();

  const searchParams = new URLSearchParams(location.search);
  const creatorId = searchParams.get('creator');
  const dealId = searchParams.get('deal');

  const [formData, setFormData] = useState({
    title: '',
    campaignId: '',
    creatorId: creatorId || '',
    dealId: dealId || '',
    type: 'standard', // standard, nda, work_for_hire, exclusive
    duration: '',
    startDate: '',
    endDate: '',
    compensation: {
      type: 'fixed', // fixed, hourly, milestone, revenue_share
      amount: '',
      currency: 'USD',
      paymentSchedule: 'upon_completion' // upfront, milestone, upon_completion, recurring
    },
    scopeOfWork: '',
    deliverables: [{ type: 'content', platform: 'instagram', description: '', quantity: 1, deadline: '' }],
    terms: {
      confidentiality: false,
      exclusivity: false,
      ownership: 'brand', // brand, creator, shared
      usageRights: 'limited', // limited, unlimited, exclusive
      territory: 'worldwide',
      term: '12_months'
    },
    clauses: [],
    specialConditions: '',
    governingLaw: 'California',
    disputeResolution: 'arbitration'
  });

  const [errors, setErrors] = useState({});
  const [addingClause, setAddingClause] = useState(false);
  const [newClause, setNewClause] = useState({ title: '', content: '' });
  const [creators, setCreators] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);

  useEffect(() => {
    fetchBrandCampaigns('all', 1, 100);
    fetchCreators();
    
    // If dealId is provided, load deal data and pre-fill form
    if (dealId) {
      loadDealData(dealId);
    }
  }, [dealId]);

  const fetchCreators = async () => {
    try {
      setCreatorsLoading(true);
      const result = await creatorService.searchCreators({});
      if (result.success && result.creators) {
        setCreators(result.creators);
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setCreatorsLoading(false);
    }
  };

  const loadDealData = async (dealId) => {
    try {
      // This would load deal data and pre-fill the contract form
      // For now, we'll just set the dealId
      setFormData(prev => ({ ...prev, dealId }));
    } catch (error) {
      console.error('Error loading deal data:', error);
      toast.error('Failed to load deal data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleDeliverableChange = (index, field, value) => {
    const newDeliverables = [...formData.deliverables];
    newDeliverables[index] = { ...newDeliverables[index], [field]: value };
    setFormData(prev => ({ ...prev, deliverables: newDeliverables }));
  };

  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, { 
        type: 'content', 
        platform: 'instagram', 
        description: '', 
        quantity: 1, 
        deadline: '' 
      }]
    }));
  };

  const removeDeliverable = (index) => {
    if (formData.deliverables.length > 1) {
      setFormData(prev => ({
        ...prev,
        deliverables: prev.deliverables.filter((_, i) => i !== index)
      }));
    }
  };

  const addClause = () => {
    if (newClause.title && newClause.content) {
      setFormData(prev => ({
        ...prev,
        clauses: [...prev.clauses, newClause]
      }));
      setNewClause({ title: '', content: '' });
      setAddingClause(false);
    }
  };

  const removeClause = (index) => {
    setFormData(prev => ({
      ...prev,
      clauses: prev.clauses.filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Contract title is required';
    if (!formData.campaignId) newErrors.campaignId = 'Campaign is required';
    if (!formData.creatorId) newErrors.creatorId = 'Creator is required';
    if (!formData.duration) newErrors.duration = 'Duration is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.scopeOfWork.trim()) newErrors.scopeOfWork = 'Scope of work is required';
    
    if (formData.compensation.type === 'fixed' && !formData.compensation.amount) {
      newErrors.amount = 'Compensation amount is required';
    }
    
    // Validate deliverables
    const invalidDeliverables = formData.deliverables.filter(del => 
      !del.description.trim() || !del.platform || !del.deadline
    );
    if (invalidDeliverables.length > 0) {
      newErrors.deliverables = 'All deliverables must have description, platform, and deadline';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const contractData = {
      ...formData,
      compensation: {
        ...formData.compensation,
        amount: parseFloat(formData.compensation.amount)
      }
    };

    const result = await createContract(contractData);
    if (result) {
      toast.success('Contract created successfully');
      navigate(`/brand/contracts/${result._id}`);
    }
  };

  const inputClasses = `w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none transition-all ${
    isDark ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-500 text-white' : 'bg-white border-zinc-200 focus:border-black text-black'
  }`;

  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-8 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-current transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-semibold tracking-tight">Create <span className="font-bold">Contract</span></h1>
          <p className="text-sm text-zinc-500">Draft your legal agreement terms.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Contract Type Selection */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Contract Type</h2>
          <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            {['standard', 'nda', 'work_for_hire', 'exclusive'].map((type) => (
              <button 
                key={type}
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, type }))} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  formData.type === type 
                  ? (isDark ? 'bg-black text-white' : 'bg-black text-white shadow-lg') 
                  : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <FileText className="w-4 h-4" /> 
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </section>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Contract Title</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Influencer Marketing Agreement" 
              className={inputClasses} 
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Campaign</label>
            <select 
              name="campaignId" 
              value={formData.campaignId} 
              onChange={handleChange}
              className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
            >
              <option className="!bg-black text-white" value="">Select Campaign</option>
              {campaigns.map(c => <option className="!bg-black text-white" key={c._id} value={c._id}>{c.title}</option>)}
            </select>
            {errors.campaignId && <p className="text-red-500 text-xs">{errors.campaignId}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Creator</label>
            <select 
              name="creatorId" 
              value={formData.creatorId} 
              onChange={handleChange}
              disabled={creatorsLoading}
              className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'} ${creatorsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option className="!bg-black text-white" value="">Select Creator</option>
              {creators.map(c => (
                <option className="!bg-black text-white" key={c._id} value={c._id}>
                  {c.name || c.username || c.displayName || c.firstName || c.lastName || 'Creator'}
                </option>
              ))}
            </select>
            {errors.creatorId && <p className="text-red-500 text-xs">{errors.creatorId}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Duration</label>
            <input 
              type="text" 
              name="duration" 
              value={formData.duration} 
              onChange={handleChange} 
              placeholder="12 months" 
              className={inputClasses} 
            />
            {errors.duration && <p className="text-red-500 text-xs">{errors.duration}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Governing Law</label>
            <select 
              name="governingLaw" 
              value={formData.governingLaw} 
              onChange={handleChange}
              className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
            >
              <option value="California">California</option>
              <option value="New York">New York</option>
              <option value="Texas">Texas</option>
              <option value="Florida">Florida</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              value={formData.startDate} 
              onChange={handleChange} 
              className={inputClasses} 
            />
            {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">End Date</label>
            <input 
              type="date" 
              name="endDate" 
              value={formData.endDate} 
              onChange={handleChange} 
              className={inputClasses} 
            />
            {errors.endDate && <p className="text-red-500 text-xs">{errors.endDate}</p>}
          </div>
        </div>

        {/* Compensation Section */}
        <section className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Compensation</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Type</label>
              <select 
                value={formData.compensation.type} 
                onChange={(e) => handleNestedChange('compensation', 'type', e.target.value)} 
                className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
              >
                <option value="fixed">Fixed Amount</option>
                <option value="hourly">Hourly Rate</option>
                <option value="milestone">Milestone Based</option>
                <option value="revenue_share">Revenue Share</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Amount</label>
              <input 
                type="number" 
                value={formData.compensation.amount} 
                onChange={(e) => handleNestedChange('compensation', 'amount', e.target.value)} 
                placeholder="5000" 
                className={inputClasses} 
              />
              {errors.amount && <p className="text-red-500 text-xs">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Payment Schedule</label>
              <select 
                value={formData.compensation.paymentSchedule} 
                onChange={(e) => handleNestedChange('compensation', 'paymentSchedule', e.target.value)} 
                className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
              >
                <option value="upfront">Upfront</option>
                <option value="milestone">Milestone</option>
                <option value="upon_completion">Upon Completion</option>
                <option value="recurring">Recurring</option>
              </select>
            </div>
          </div>
        </section>

        {/* Scope of Work */}
        <section className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Scope of Work</label>
          <textarea 
            name="scopeOfWork" 
            value={formData.scopeOfWork} 
            onChange={handleChange} 
            rows="4" 
            className={`${inputClasses} resize-none`} 
            placeholder="Describe the scope of work and responsibilities..." 
          />
          {errors.scopeOfWork && <p className="text-red-500 text-xs">{errors.scopeOfWork}</p>}
        </section>

        {/* Deliverables Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Deliverables</h2>
            <button type="button" onClick={addDeliverable} className="text-[10px] font-bold uppercase flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {formData.deliverables.map((del, idx) => (
              <div key={idx} className={`group relative p-5 rounded-2xl border transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
                {formData.deliverables.length > 1 && (
                  <button onClick={() => removeDeliverable(idx)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select 
                    value={del.platform} 
                    className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
                    onChange={(e) => handleDeliverableChange(idx, 'platform', e.target.value)}
                  >
                    <option className="!bg-black text-white" value="instagram">Instagram</option>
                    <option className="!bg-black text-white" value="tiktok">TikTok</option>
                    <option className="!bg-black text-white" value="youtube">YouTube</option>
                    <option className="!bg-black text-white" value="twitter">Twitter</option>
                  </select>
                  <input 
                    type="date" 
                    value={del.deadline} 
                    className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
                    onChange={(e) => handleDeliverableChange(idx, 'deadline', e.target.value)} 
                  />
                  <textarea 
                    value={del.description} 
                    className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'} col-span-2 resize-none`}
                    onChange={(e) => handleDeliverableChange(idx, 'description', e.target.value)} 
                    placeholder="Describe this deliverable..." 
                    rows="2"
                  />
                </div>
              </div>
            ))}
          </div>
          {errors.deliverables && <p className="text-red-500 text-xs">{errors.deliverables}</p>}
        </section>

        {/* Terms & Conditions */}
        <section className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-white border'}`}>
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Terms & Conditions</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.terms.confidentiality} 
                  onChange={(e) => handleNestedChange('terms', 'confidentiality', e.target.checked)}
                  className="rounded" 
                />
                <span className="text-sm">Confidentiality Clause</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.terms.exclusivity} 
                  onChange={(e) => handleNestedChange('terms', 'exclusivity', e.target.checked)}
                  className="rounded" 
                />
                <span className="text-sm">Exclusivity Agreement</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Ownership</label>
              <select 
                value={formData.terms.ownership} 
                onChange={(e) => handleNestedChange('terms', 'ownership', e.target.value)} 
                className={`${inputClasses} ${isDark ? 'bg-black' : 'bg-white'}`}
              >
                <option value="brand">Brand Owns</option>
                <option value="creator">Creator Owns</option>
                <option value="shared">Shared Ownership</option>
              </select>
            </div>
          </div>
        </section>

        {/* Special Conditions */}
        <section className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Special Conditions</label>
          <textarea 
            name="specialConditions" 
            value={formData.specialConditions} 
            onChange={handleChange} 
            rows="3" 
            className={`${inputClasses} resize-none`} 
            placeholder="Any special conditions or requirements..." 
          />
        </section>

        {/* Custom Clauses */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Custom Clauses</h2>
            <button 
              type="button" 
              onClick={() => setAddingClause(true)} 
              className="text-[10px] font-bold uppercase flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Clause
            </button>
          </div>

          {addingClause && (
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                  type="text" 
                  placeholder="Clause Title" 
                  value={newClause.title} 
                  onChange={(e) => setNewClause(prev => ({ ...prev, title: e.target.value }))} 
                  className={inputClasses} 
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={addClause} 
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                  >
                    Add
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAddingClause(false)} 
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <textarea 
                placeholder="Clause Content" 
                value={newClause.content} 
                onChange={(e) => setNewClause(prev => ({ ...prev, content: e.target.value }))} 
                className={`${inputClasses} resize-none`} 
                rows="3"
              />
            </div>
          )}

          <div className="space-y-2">
            {formData.clauses.map((clause, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{clause.title}</h4>
                    <p className="text-xs text-zinc-500 mt-1">{clause.content}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeClause(idx)} 
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-6 pt-6 border-t border-zinc-800/10 dark:border-zinc-200/10">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all duration-300 hover:translate-x-[-4px] active:scale-95"
          >
            Cancel
          </button>

          <button 
            type="submit" 
            disabled={contractLoading}
            className={`
              relative px-8 py-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] 
              transition-all duration-300 shadow-xl overflow-hidden
              ${contractLoading ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95 hover:shadow-2xl'}
              ${isDark ? 'bg-white text-white border border-white' : 'bg-black text-white border border-black'}
            `}
          >
            <span className="flex items-center justify-center gap-2">
              {contractLoading && (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {contractLoading ? 'Creating' : 'Create Contract'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateContract;
