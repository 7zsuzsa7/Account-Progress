/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  Plus, 
  Download, 
  Upload, 
  ChevronRight, 
  Filter, 
  MoreVertical,
  Edit2,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  ListFilter,
  LayoutDashboard,
  MapPin,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Geocoding Service ---
const getCoordinatesFromAddress = async (address: string) => {
  if (!address || address.length < 5) return null;
  
  try {
    const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the latitude and longitude for this address: "${address}". 
      If multiple exists, pick the most relevant one in the Philippines. 
      Respond ONLY with a JSON object containing keys "lat" and "lng" as numbers.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
};

// --- Types ---

type WorkflowStatus = 'All Accounts' | 'Step 1' | 'Step 2' | 'Step 3' | 'Fully Verified' | 'Decommissioned';

interface AccountRecord {
  id: string;
  submittedAt: string;
  dsp: string;
  mobileNumber: string;
  simStatus: string;
  idType: string;
  firstName: string;
  lastName: string;
  middleName: string;
  storeName: string;
  fullAddress: string;
  latitude: string;
  longitude: string;
  mpin: string;
  accountStatus: 'Active' | 'Inactive' | 'Pending';
  progressStatus: string;
  onSystem: boolean;
  hasDti: boolean;
  hasSelfie: boolean;
  hasStorePhoto: boolean;
  hasSyncedGpo: boolean;
  remark: string;
}

// --- Mock Data ---

const MOCK_DATA: AccountRecord[] = [
  {
    id: '1',
    submittedAt: '2024-04-22',
    dsp: 'Manila',
    mobileNumber: '09123456789',
    simStatus: 'Ready',
    idType: 'National ID',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Quincy',
    storeName: 'John\'s General Store',
    fullAddress: '123 Main St, Manila, Philippines',
    latitude: '14.5995',
    longitude: '120.9842',
    mpin: '123456',
    accountStatus: 'Active',
    progressStatus: 'Completed',
    onSystem: true,
    hasDti: true,
    hasSelfie: true,
    hasStorePhoto: true,
    hasSyncedGpo: true,
    remark: 'Verified'
  },
  {
    id: '2',
    submittedAt: '2024-04-22',
    dsp: 'Laguna',
    mobileNumber: '09223334444',
    simStatus: 'Pending',
    idType: 'Passport',
    firstName: 'Jane',
    lastName: 'Smith',
    middleName: 'Marie',
    storeName: 'Smith Mart',
    fullAddress: '456 Business Blvd, Laguna, Philippines',
    latitude: '14.2123',
    longitude: '121.1567',
    mpin: '654321',
    accountStatus: 'Pending',
    progressStatus: 'Pending',
    onSystem: false,
    hasDti: true,
    hasSelfie: true,
    hasStorePhoto: false,
    hasSyncedGpo: false,
    remark: 'Missing store photo'
  },
];

// --- Components ---

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
    info: 'bg-sky-100 text-sky-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const AddRecordModal = ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    firstName: '',
    lastName: '',
    middleName: '',
    idType: '',
    progressStatus: 'Pending',
    submittedAt: new Date().toISOString().slice(0, 10), // date format (YYYY-MM-DD)
    dsp: '',
    storeName: '',
    fullAddress: '',
    latitude: '',
    longitude: '',
    simStatus: 'Pending',
    mpin: '',
    dti: false,
    selfie: false,
    store: false,
    inSystem: false,
    syncedGpo: false,
    remark: ''
  });

  const [countdown, setCountdown] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Geocoding Debounce Effect
  React.useEffect(() => {
    if (!formData.fullAddress || formData.fullAddress.length < 10) return;
    
    const delayDebounceFn = setTimeout(async () => {
      setIsGeocoding(true);
      const coords = await getCoordinatesFromAddress(formData.fullAddress);
      if (coords) {
        setFormData(prev => ({ 
          ...prev, 
          latitude: Number(coords.lat).toFixed(14), 
          longitude: Number(coords.lng).toFixed(14) 
        }));
      }
      setIsGeocoding(false);
    }, 2000); // 2 second debounce

    return () => clearTimeout(delayDebounceFn);
  }, [formData.fullAddress]);

  const handleSave = () => {
    const mandatoryFields = ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus'];
    const missing = mandatoryFields.filter(f => !formData[f as keyof typeof formData]);
    if (missing.length > 0) {
      alert(`Please fill in all mandatory fields: ${missing.join(', ')}`);
      return;
    }
    onSave(formData);
  };

  // DSP Options
  const dspOptions = ['Manila', 'Laguna', 'Pampanga', 'Cebu'];

  // ID Type Options
  const idTypeOptions = [
    'National ID', "Driver's License", 'UMID', 'Passport', 'SSS ID', 
    'ACR ID', 'HDMF', 'IBP ID', 'NBI Clearance', 'Postal ID', 'PRC ID'
  ];

  // Progress Status Options
  const progressStatusOptions = [
    'Step 1 Done', 'Step 2 Done', 'Step 3 Done', 'Need Fix', 
    'Approved', 'Rejected', 'Completed', 'Disabled', 
    'Decommissioned', 'Ready for KYC', 'Pending'
  ];

  // SIM Status Options
  const simStatusOptions = [
    'Pending', 'Ready', 'No Signal', 'Invalid', 'Blocked', 
    'Used', 'Lost', 'Damaged', 'Expired'
  ];

  // Countdown & Auto-Status Effect
  React.useEffect(() => {
    const checkExpiry = () => {
      if (!formData.submittedAt) return;
      
      const submittedDate = new Date(formData.submittedAt);
      const now = new Date();
      const diffMs = now.getTime() - submittedDate.getTime();
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      
      if (diffMs >= fifteenDaysMs) {
        if (formData.progressStatus !== 'Ready for KYC') {
          setFormData(prev => ({ ...prev, progressStatus: 'Ready for KYC' }));
        }
        setCountdown('Expired (15+ Days)');
      } else {
        const remainingMs = fifteenDaysMs - diffMs;
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        setCountdown(`${remainingDays} days remaining`);
      }
    };

    checkExpiry();
    const timer = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [formData.submittedAt, formData.progressStatus]);

  // Simulate Address-to-location-code
  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, fullAddress: value }));
    
    // Simulate auto-population after some typing or blur
    if (value.length > 10) {
      // Mock coordinates based on address length for variety
      const mockLat = (14.5995 + (value.length * 0.0001)).toFixed(6);
      const mockLong = (120.9842 + (value.length * 0.0001)).toFixed(6);
      setFormData(prev => ({ ...prev, latitude: mockLat, longitude: mockLong }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Add Record</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {/* Field: Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Mobile Number <span className="text-rose-500">*</span></label>
              <input 
                type="number" 
                value={formData.mobileNumber}
                onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="09XXXXXXXXX"
              />
            </div>

            {/* Field: First Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">First Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Field: Last Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Last Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Field: Middle Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Middle Name <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                value={formData.middleName}
                onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Field: ID Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">ID Type <span className="text-rose-500">*</span></label>
              <select 
                value={formData.idType}
                onChange={(e) => setFormData({...formData, idType: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select ID Type</option>
                {idTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Field: Progress Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Progress Status <span className="text-rose-500">*</span></label>
              <select 
                value={formData.progressStatus}
                onChange={(e) => setFormData({...formData, progressStatus: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                {progressStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Field: Submitted At (Date + Countdown) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Submitted At</label>
                <span className={`text-[10px] font-bold ${countdown?.includes('Expired') ? 'text-rose-500' : 'text-amber-500'} bg-gray-100 px-2 py-0.5 rounded-full`}>
                  {countdown}
                </span>
              </div>
              <input 
                type="date" 
                value={formData.submittedAt}
                onChange={(e) => setFormData({...formData, submittedAt: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Field: DSP */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">DSP</label>
              <select 
                value={formData.dsp}
                onChange={(e) => setFormData({...formData, dsp: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select DSP</option>
                {dspOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Field: Store Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Store Name</label>
              <input 
                type="text" 
                value={formData.storeName}
                onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

             {/* Field: SIM Status */}
             <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">SIM Status</label>
              <select 
                value={formData.simStatus}
                onChange={(e) => setFormData({...formData, simStatus: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                {simStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* Field: Full Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Full Address</label>
            <textarea 
              rows={3}
              value={formData.fullAddress}
              onChange={handleAddressChange}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              placeholder="Start typing the address to auto-populate coordinates..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Latitude</label>
                  <input 
                    type="text" 
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Longitude</label>
                  <input 
                    type="text" 
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">MPIN</label>
                <input 
                  type="number" 
                  value={formData.mpin}
                  onChange={(e) => setFormData({...formData, mpin: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="4-digit MPIN"
                />
              </div>
            </div>

            {/* Address Location Map Visual */}
            <div className="space-y-1.5 flex flex-col h-full">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Address Location Map</label>
              <div className="flex-1 w-full min-h-[160px] bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner group">
                {formData.latitude && formData.longitude ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    className="border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    src={`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                       {isGeocoding ? (
                         <Loader2 className="text-indigo-500 animate-spin" size={20} />
                       ) : (
                         <MapPin className="text-gray-400" size={20} />
                       )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-400">
                      {isGeocoding ? 'Compiling location data...' : 'Waiting for precise coordinates...'}
                    </span>
                  </div>
                )}
                {isGeocoding && (
                   <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
                      <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-indigo-100 flex items-center gap-2">
                        <Loader2 className="text-indigo-600 animate-spin" size={14} />
                        <span className="text-[10px] font-bold text-indigo-900 tracking-tight">Geocoding...</span>
                      </div>
                   </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkboxes Group */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-6">Verification & System Status</h3>
            <div className="flex flex-wrap gap-x-12 gap-y-6">
              {[
                { label: 'DTI', key: 'dti' },
                { label: 'Selfie', key: 'selfie' },
                { label: 'Store', key: 'store' },
                { label: 'In System', key: 'inSystem' },
                { label: 'Synced to GPO', key: 'syncedGpo' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={(formData as any)[item.key]}
                      onChange={(e) => setFormData({...formData, [item.key]: e.target.checked})}
                    />
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-lg bg-white peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-white scale-0 peer-checked:scale-100 transition-transform" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Remark</label>
          <textarea 
            rows={4}
            value={formData.remark}
            onChange={(e) => setFormData({...formData, remark: e.target.value})}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
          />
        </div>
      </div>
        </div>

        <div className="px-8 py-6 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
          >
            Save Record
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkflowStatus>('All Accounts');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [records, setRecords] = useState<AccountRecord[]>(MOCK_DATA);
  
  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTableGeocoding, setIsTableGeocoding] = useState(false);

  // Geocoding for Inline Edit
  React.useEffect(() => {
    if (!editFormData?.fullAddress || editFormData.fullAddress.length < 10) return;
    
    // Skip if address is the same as the original record to avoid unnecessary calls on row open
    const originalRecord = records.find(r => r.id === editingId);
    if (originalRecord && originalRecord.fullAddress === editFormData.fullAddress) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsTableGeocoding(true);
      const coords = await getCoordinatesFromAddress(editFormData.fullAddress);
      if (coords) {
        setEditFormData((prev: any) => {
          if (!prev || prev.fullAddress !== editFormData.fullAddress) return prev;
          return { 
            ...prev, 
            latitude: Number(coords.lat).toFixed(14), 
            longitude: Number(coords.lng).toFixed(14) 
          };
        });
      }
      setIsTableGeocoding(false);
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [editFormData?.fullAddress, editingId, records]);
  
  // Filter State
  const [filters, setFilters] = useState({
    mobileNumber: '',
    firstName: '',
    lastName: '',
    middleName: '',
    idType: '',
    progressStatus: '',
    submittedAt: '',
    dsp: '',
    storeName: '',
    simStatus: '',
    dti: false,
    selfie: false,
    store: false,
    inSystem: false,
    syncedGpo: false,
    remark: ''
  });

  const dspOptions = ['Manila', 'Laguna', 'Pampanga', 'Cebu'];
  const idTypeOptions = [
    'National ID', "Driver's License", 'UMID', 'Passport', 'SSS ID', 
    'ACR ID', 'HDMF', 'IBP ID', 'NBI Clearance', 'Postal ID', 'PRC ID'
  ];
  const progressStatusOptions = [
    'Step 1 Done', 'Step 2 Done', 'Step 3 Done', 'Need Fix', 
    'Approved', 'Rejected', 'Completed', 'Disabled', 
    'Decommissioned', 'Ready for KYC', 'Pending'
  ];
  const simStatusOptions = [
    'Pending', 'Ready', 'No Signal', 'Invalid', 'Blocked', 
    'Used', 'Lost', 'Damaged', 'Expired'
  ];

  const tabs: { id: WorkflowStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'All Accounts', label: 'All Accounts', icon: <LayoutDashboard size={16} />, color: 'text-indigo-600' },
    { id: 'Step 1', label: 'Step 1', icon: <Clock size={16} />, color: 'text-amber-600' },
    { id: 'Step 2', label: 'Step 2', icon: <Search size={16} />, color: 'text-sky-600' },
    { id: 'Step 3', label: 'Step 3', icon: <CheckCircle2 size={16} />, color: 'text-emerald-600' },
    { id: 'Fully Verified', label: 'Fully Verified', icon: <CheckCircle2 size={16} />, color: 'text-indigo-600' },
    { id: 'Decommissioned', label: 'Decommissioned', icon: <AlertCircle size={16} />, color: 'text-gray-600' },
  ];

  const handleSaveRecord = (data: any) => {
    const newRecord: AccountRecord = {
      id: Math.random().toString(36).substr(2, 9),
      submittedAt: data.submittedAt,
      dsp: data.dsp || 'Unassigned',
      mobileNumber: data.mobileNumber,
      simStatus: data.simStatus,
      idType: data.idType,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      storeName: data.storeName,
      fullAddress: data.fullAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      mpin: data.mpin,
      accountStatus: 'Pending',
      progressStatus: data.progressStatus,
      onSystem: data.inSystem,
      hasDti: data.dti,
      hasSelfie: data.selfie,
      hasStorePhoto: data.store,
      hasSyncedGpo: data.syncedGpo,
      remark: data.remark
    };
    setRecords([newRecord, ...records]);
    setAddModalOpen(false);
  };

  const handleEditRow = (record: AccountRecord) => {
    setEditingId(record.id);
    setEditFormData({ ...record });
  };

  const handleSaveRow = (id: string) => {
    setRecords(records.map(r => r.id === id ? { ...editFormData } : r));
    setEditingId(null);
    setEditFormData(null);
  };

  const getCanonicalSubpage = (record: AccountRecord): WorkflowStatus | null => {
    const basicData = record.mobileNumber && record.firstName && record.lastName && record.middleName && record.idType;
    const step2Data = basicData && record.submittedAt && record.dsp && record.storeName && record.fullAddress && record.latitude && record.longitude;
    const step3Data = step2Data && record.mpin && record.hasDti && record.onSystem && record.hasSyncedGpo;
    const verifiedData = step3Data && record.hasSelfie && record.hasStorePhoto;

    // Decommissioned (Highest - Terminal)
    if (basicData && 
        ['Disabled', 'Decommissioned'].includes(record.progressStatus) && 
        ['No Signal', 'Invalid', 'Blocked', 'Used', 'Lost', 'Damaged', 'Expired'].includes(record.simStatus)) {
      return 'Decommissioned';
    }

    // Fully Verified (Highest - Success)
    if (verifiedData && record.progressStatus === 'Completed' && record.simStatus === 'Ready') {
      return 'Fully Verified';
    }

    // Step 3
    if (step3Data && 
        ['Step 2 Done', 'Need Fix', 'Approved', 'Rejected', 'Ready for KYC'].includes(record.progressStatus) && 
        record.simStatus === 'Ready') {
      return 'Step 3';
    }

    // Step 2
    if (step2Data && 
        ['Step 1 Done', 'Ready for KYC'].includes(record.progressStatus) && 
        ['Ready', 'Pending'].includes(record.simStatus)) {
      return 'Step 2';
    }

    // Step 1
    if (basicData && record.progressStatus === 'Pending') {
      return 'Step 1';
    }

    return null;
  };

  const displayedRecords = records
    .filter(record => {
      // Automatic Segmentation Filter
      if (activeTab !== 'All Accounts') {
        const canonical = getCanonicalSubpage(record);
        if (canonical !== activeTab) return false;
      }
      
      // Manual Filters
      const searchTermMatch = (val: string, search: string) => !search || val.toLowerCase().includes(search.toLowerCase());
      
      return (
        searchTermMatch(record.mobileNumber, filters.mobileNumber) &&
        searchTermMatch(record.firstName, filters.firstName) &&
        searchTermMatch(record.lastName, filters.lastName) &&
        searchTermMatch(record.middleName, filters.middleName) &&
        searchTermMatch(record.storeName, filters.storeName) &&
        (!filters.idType || record.idType === filters.idType) &&
        (!filters.progressStatus || record.progressStatus === filters.progressStatus) &&
        (!filters.dsp || record.dsp === filters.dsp) &&
        (!filters.simStatus || record.simStatus === filters.simStatus) &&
        (!filters.submittedAt || record.submittedAt === filters.submittedAt) &&
        (!filters.dti || record.hasDti) &&
        (!filters.selfie || record.hasSelfie) &&
        (!filters.store || record.hasStorePhoto) &&
        (!filters.inSystem || record.onSystem) &&
        (!filters.syncedGpo || record.hasSyncedGpo) &&
        searchTermMatch(record.remark, filters.remark)
      );
    });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map(r => r.id));
    }
  };

  const handleBulkUpdate = (field: string, value: any) => {
    setRecords(records.map(r => 
      selectedIds.includes(r.id) ? { ...r, [field]: value } : r
    ));
  };

  const hierarchyOptions: WorkflowStatus[] = [
    'All Accounts',
    'Step 1',
    'Step 2',
    'Step 3',
    'Fully Verified',
    'Decommissioned'
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-gray-900 overflow-hidden">
      {/* Sidebar - Data Segmentation Hierarchy */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm"
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-indigo-900">ProgressHQ</span>}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
          >
            <ChevronRight className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-4">
            <div className="px-2">
              {isSidebarOpen && <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Segmentation</h3>}
              <div className="space-y-1">
                {hierarchyOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setActiveTab(option)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      activeTab === option 
                        ? 'bg-indigo-50 text-indigo-600 font-medium' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Building2 size={18} className={activeTab === option ? 'text-indigo-600' : 'text-gray-400'} />
                    {isSidebarOpen && <span className="text-sm">{option}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">ZS</div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xs font-semibold">Zsuzsa 7.</span>
                <span className="text-[10px] text-gray-400">System Admin</span>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between z-10">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Account Progress</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">
                {activeTab}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Upload size={16} />
              Batch Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
              <Download size={16} />
              Export CSV
            </button>
            <button 
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95"
            >
              <Plus size={16} />
              Add Record
            </button>
          </div>
        </header>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          
          {/* Subpage Filter Section */}
          <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ListFilter size={18} className="text-gray-400" />
                <h3 className="font-semibold text-gray-900">Deep Filter</h3>
              </div>
              <button 
                onClick={() => setFilters({
                  mobileNumber: '', firstName: '', lastName: '', middleName: '', idType: '', 
                  progressStatus: '', submittedAt: '', dsp: '', storeName: '', simStatus: '',
                  dti: false, selfie: false, store: false, inSystem: false, syncedGpo: false,
                  remark: ''
                })}
                className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw size={14} /> Clear All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* Text Filters */}
              {['All Accounts', 'Step 1', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="text" 
                      value={filters.mobileNumber}
                      onChange={(e) => setFilters({...filters, mobileNumber: e.target.value})}
                      placeholder="09..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">First Name</label>
                    <input 
                      type="text" 
                      value={filters.firstName}
                      onChange={(e) => setFilters({...filters, firstName: e.target.value})}
                      placeholder="Search name..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Name</label>
                    <input 
                      type="text" 
                      value={filters.lastName}
                      onChange={(e) => setFilters({...filters, lastName: e.target.value})}
                      placeholder="Search name..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Middle Name</label>
                    <input 
                      type="text" 
                      value={filters.middleName}
                      onChange={(e) => setFilters({...filters, middleName: e.target.value})}
                      placeholder="Search name..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </>
              )}

              {/* ID Type Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Type</label>
                <select 
                  value={filters.idType}
                  onChange={(e) => setFilters({...filters, idType: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All ID Types</option>
                  {idTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Progress Status Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress Status</label>
                <select 
                  value={filters.progressStatus}
                  onChange={(e) => setFilters({...filters, progressStatus: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {progressStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              {/* Submitted At Filter */}
              {['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted At</label>
                  <input 
                    type="date" 
                    value={filters.submittedAt}
                    onChange={(e) => setFilters({...filters, submittedAt: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              )}

              {/* DSP Filter */}
              {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DSP</label>
                  <select 
                    value={filters.dsp}
                    onChange={(e) => setFilters({...filters, dsp: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All DSPs</option>
                    {dspOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}

              {/* Store Name Filter */}
              {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Store Name</label>
                  <input 
                    type="text" 
                    value={filters.storeName}
                    onChange={(e) => setFilters({...filters, storeName: e.target.value})}
                    placeholder="Search store..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              )}

              {/* SIM Status Filter */}
              {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SIM Status</label>
                  <select 
                    value={filters.simStatus}
                    onChange={(e) => setFilters({...filters, simStatus: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All States</option>
                    {simStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              )}

              {/* Remark Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remark</label>
                <input 
                  type="text" 
                  value={filters.remark}
                  onChange={(e) => setFilters({...filters, remark: e.target.value})}
                  placeholder="Search remark..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Checkbox Filters */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-8 items-center justify-between">
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                 {[
                   { label: 'DTI', key: 'dti', visible: true },
                   { label: 'Selfie', key: 'selfie', visible: ['All Accounts', 'Step 3'].includes(activeTab) },
                   { label: 'Store Photo', key: 'store', visible: ['All Accounts', 'Step 3'].includes(activeTab) },
                   { label: 'In System', key: 'inSystem', visible: ['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) },
                   { label: 'Synced GPO', key: 'syncedGpo', visible: ['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) }
                 ].filter(f => f.visible).map((item) => (
                   <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                     <input 
                       type="checkbox" 
                       className="peer sr-only"
                       checked={(filters as any)[item.key]}
                       onChange={(e) => setFilters({...filters, [item.key]: e.target.checked})}
                     />
                     <div className="w-5 h-5 border-2 border-gray-200 rounded-lg bg-white peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                       <CheckCircle2 size={12} className="text-white scale-0 peer-checked:scale-100 transition-transform" />
                     </div>
                     <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-900 transition-colors uppercase tracking-widest">{item.label}</span>
                   </label>
                 ))}
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => console.log('Applying Filters:', filters)}
                   className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95"
                 >
                   Apply Filters
                 </button>
              </div>
            </div>
          </section>

          {/* Bulk Action Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-indigo-900 text-white rounded-3xl p-6 shadow-xl flex flex-col gap-6 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                      {selectedIds.length}
                    </div>
                    <div>
                      <h4 className="font-bold">Bulk Actions</h4>
                      <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Updating {selectedIds.length} selected accounts</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all"
                  >
                    Clear Selection
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {/* Selectors for bulk update */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">ID Type</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('idType', e.target.value)}
                      className="w-full bg-indigo-800/50 border border-indigo-700/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="">Update ID Type...</option>
                      {idTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Status</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('progressStatus', e.target.value)}
                      className="w-full bg-indigo-800/50 border border-indigo-700/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="">Update Status...</option>
                      {progressStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">DSP</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('dsp', e.target.value)}
                      className="w-full bg-indigo-800/50 border border-indigo-700/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="">Update DSP...</option>
                      {dspOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">SIM Status</label>
                    <select 
                      onChange={(e) => handleBulkUpdate('simStatus', e.target.value)}
                      className="w-full bg-indigo-800/50 border border-indigo-700/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="">Update SIM...</option>
                      {simStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">MPIN</label>
                    <input 
                      type="text" 
                      placeholder="Bulk MPIN..."
                      onBlur={(e) => e.target.value && handleBulkUpdate('mpin', e.target.value)}
                      className="w-full bg-indigo-800/50 border border-indigo-700/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-8 items-center pt-4 border-t border-white/10">
                  <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Documentation Status:</span>
                  {[
                    { label: 'DTI', key: 'hasDti' },
                    { label: 'Selfie', key: 'hasSelfie' },
                    { label: 'Store', key: 'hasStorePhoto' },
                    { label: 'SYS', key: 'onSystem' },
                    { label: 'GPO', key: 'hasSyncedGpo' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-white/70">{item.label}</span>
                      <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
                        <button 
                          onClick={() => handleBulkUpdate(item.key, true)}
                          className="px-2 py-0.5 text-[9px] font-bold hover:bg-emerald-500 rounded bg-transparent transition-all"
                        >
                          SET
                        </button>
                        <button 
                          onClick={() => handleBulkUpdate(item.key, false)}
                          className="px-2 py-0.5 text-[9px] font-bold hover:bg-rose-500 rounded bg-transparent transition-all"
                        >
                          UNSET
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-4 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                        checked={selectedIds.length === records.length && records.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    {/* Dynamic Headers */}
                    {[
                      { label: 'Mobile Number', show: true },
                      { label: 'First Name', show: true },
                      { label: 'Last Name', show: true },
                      { label: 'Middle Name', show: true },
                      { label: 'ID Type', show: true },
                      { label: 'Progress Status', show: true },
                      { label: 'Submitted At', show: ['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) },
                      { label: 'DSP', show: ['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) },
                      { label: 'Store Name', show: ['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) },
                      { label: 'Full Address', show: ['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) },
                      { label: 'Latitude', show: ['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) },
                      { label: 'Longitude', show: ['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) },
                      { label: 'SIM Status', show: ['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) },
                      { label: 'MPIN', show: ['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) },
                      { label: 'Documentation', show: activeTab === 'All Accounts' },
                      { label: 'DTI', show: activeTab === 'Step 1' },
                      { label: 'DTI', show: ['Step 2', 'Step 3'].includes(activeTab) }, // Re-using label but logic is different
                      { label: 'Selfie', show: activeTab === 'Step 3' },
                      { label: 'Store', show: activeTab === 'Step 3' },
                      { label: 'SYS', show: ['Step 2', 'Step 3'].includes(activeTab) },
                      { label: 'GPO', show: ['Step 2', 'Step 3'].includes(activeTab) },
                      { label: 'Remark', show: activeTab !== 'All Accounts' },
                      { label: 'Actions', show: true, align: 'center' }
                    ].filter(h => h.show).map((h, i) => (
                      <th key={i} className={`px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[120px] ${h.align === 'center' ? 'text-center' : 'text-left'}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence mode="popLayout">
                    {displayedRecords.map((record, index) => {
                      const isEditing = editingId === record.id;
                      const isSelected = selectedIds.includes(record.id);
                      
                      return (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          key={record.id} 
                          className={`hover:bg-gray-50/80 transition-colors group ${isSelected ? 'bg-indigo-50/50' : ''}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(record.id)}
                            />
                          </td>
                          {/* Common Columns */}
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                             {isEditing ? (
                               <input type="text" className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-sm font-mono" value={editFormData.mobileNumber} onChange={(e) => setEditFormData({...editFormData, mobileNumber: e.target.value})} />
                             ) : record.mobileNumber}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                             {isEditing ? (
                               <input type="text" className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-sm" value={editFormData.firstName} onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})} />
                             ) : record.firstName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                             {isEditing ? (
                               <input type="text" className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-sm" value={editFormData.lastName} onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})} />
                             ) : record.lastName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                             {isEditing ? (
                               <input type="text" className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-sm" value={editFormData.middleName} onChange={(e) => setEditFormData({...editFormData, middleName: e.target.value})} />
                             ) : record.middleName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-gray-400 tracking-tighter uppercase">
                             {isEditing ? (
                               <select className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.idType} onChange={(e) => setEditFormData({...editFormData, idType: e.target.value})}>
                                 {idTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                               </select>
                             ) : record.idType}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                             {isEditing ? (
                               <select className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.progressStatus} onChange={(e) => setEditFormData({...editFormData, progressStatus: e.target.value})}>
                                 {progressStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                               </select>
                             ) : (
                               <Badge variant={record.progressStatus === 'Completed' ? 'success' : record.progressStatus === 'Rejected' ? 'error' : 'info'}>{record.progressStatus}</Badge>
                             )}
                          </td>

                          {/* Conditional Columns */}
                          {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                               {isEditing ? (
                                 <input type="date" className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.submittedAt} onChange={(e) => setEditFormData({...editFormData, submittedAt: e.target.value})} />
                               ) : record.submittedAt}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                               {isEditing ? (
                                 <select className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.dsp} onChange={(e) => setEditFormData({...editFormData, dsp: e.target.value})}>
                                   {dspOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                 </select>
                               ) : record.dsp}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                               {isEditing ? (
                                 <input type="text" className="w-40 bg-white border border-gray-200 rounded px-2 py-1 text-sm" value={editFormData.storeName} onChange={(e) => setEditFormData({...editFormData, storeName: e.target.value})} />
                               ) : record.storeName}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                            <td className="px-4 py-4 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-400" title={record.fullAddress}>
                               {isEditing ? (
                                 <input type="text" className="w-40 bg-white border border-gray-200 rounded px-2 py-1 text-sm" value={editFormData.fullAddress} onChange={(e) => setEditFormData({...editFormData, fullAddress: e.target.value})} />
                               ) : record.fullAddress}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                               {isEditing ? (
                                 <div className="relative">
                                   <input type="text" className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.latitude} onChange={(e) => setEditFormData({...editFormData, latitude: e.target.value})} />
                                   {isTableGeocoding && <Loader2 size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />}
                                 </div>
                               ) : record.latitude}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                               {isEditing ? (
                                 <div className="relative">
                                   <input type="text" className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.longitude} onChange={(e) => setEditFormData({...editFormData, longitude: e.target.value})} />
                                   {isTableGeocoding && <Loader2 size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />}
                                 </div>
                               ) : record.longitude}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap">
                               {isEditing ? (
                                 <select className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-xs" value={editFormData.simStatus} onChange={(e) => setEditFormData({...editFormData, simStatus: e.target.value})}>
                                   {simStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                 </select>
                               ) : (
                                 <Badge variant={record.simStatus === 'Activated' ? 'success' : 'warning'}>{record.simStatus}</Badge>
                               )}
                            </td>
                          )}
                          {['All Accounts', 'Step 2', 'Step 3', 'Fully Verified', 'Decommissioned'].includes(activeTab) && (
                            <td className="px-4 py-4 whitespace-nowrap text-xs font-mono text-gray-400">
                               {isEditing ? (
                                 <input type="text" className="w-20 bg-white border border-gray-200 rounded px-2 py-1 text-xs font-mono" value={editFormData.mpin} onChange={(e) => setEditFormData({...editFormData, mpin: e.target.value})} />
                               ) : record.mpin}
                            </td>
                          )}

                          {/* Documentation / Info Icons */}
                          {activeTab === 'All Accounts' && (
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                 {[
                                   { label: 'DTI', key: 'hasDti' },
                                   { label: 'Selfie', key: 'hasSelfie' },
                                   { label: 'Store', key: 'hasStorePhoto' },
                                   { label: 'SYS', key: 'onSystem' },
                                   { label: 'GPO', key: 'hasSyncedGpo' }
                                 ].map(doc => {
                                   const isActive = isEditing ? editFormData[doc.key] : record[doc.key as keyof AccountRecord];
                                   return (
                                     <div key={doc.key} onClick={() => isEditing && setEditFormData({...editFormData, [doc.key]: !editFormData[doc.key]})} className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${isEditing ? 'cursor-pointer border hover:bg-indigo-50' : ''} ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-300 border-transparent'}`}>
                                       <CheckCircle2 size={8} strokeWidth={isActive ? 4 : 2} />
                                       <span className="text-[8px] font-bold uppercase tracking-tighter">{doc.label}</span>
                                     </div>
                                   );
                                 })}
                              </div>
                            </td>
                          )}

                          {/* Individual Step Columns */}
                          {(activeTab === 'Step 1' || activeTab === 'Step 2' || activeTab === 'Step 3') && (
                            <td className="px-4 py-4 whitespace-nowrap">
                              {(() => {
                                const isActive = isEditing ? editFormData.hasDti : record.hasDti;
                                return (
                                  <div onClick={() => isEditing && setEditFormData({...editFormData, hasDti: !editFormData.hasDti})} className={`px-2 py-1 rounded inline-flex items-center gap-1.5 transition-all ${isEditing ? 'cursor-pointer border' : ''} ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-300'}`}>
                                    <CheckCircle2 size={10} />
                                    <span className="text-[9px] font-bold uppercase">DTI</span>
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                          {activeTab === 'Step 3' && (
                             <td className="px-4 py-4 whitespace-nowrap">
                                {(() => {
                                  const isActive = isEditing ? editFormData.hasSelfie : record.hasSelfie;
                                  return (
                                    <div onClick={() => isEditing && setEditFormData({...editFormData, hasSelfie: !editFormData.hasSelfie})} className={`px-2 py-1 rounded inline-flex items-center gap-1.5 transition-all ${isEditing ? 'cursor-pointer border' : ''} ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-300'}`}>
                                      <CheckCircle2 size={10} />
                                      <span className="text-[9px] font-bold uppercase">Selfie</span>
                                    </div>
                                  );
                                })()}
                             </td>
                          )}
                          {activeTab === 'Step 3' && (
                             <td className="px-4 py-4 whitespace-nowrap">
                                {(() => {
                                  const isActive = isEditing ? editFormData.hasStorePhoto : record.hasStorePhoto;
                                  return (
                                    <div onClick={() => isEditing && setEditFormData({...editFormData, hasStorePhoto: !editFormData.hasStorePhoto})} className={`px-2 py-1 rounded inline-flex items-center gap-1.5 transition-all ${isEditing ? 'cursor-pointer border' : ''} ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-300'}`}>
                                      <CheckCircle2 size={10} />
                                      <span className="text-[9px] font-bold uppercase">Store</span>
                                    </div>
                                  );
                                })()}
                             </td>
                          )}
                          {(activeTab === 'Step 2' || activeTab === 'Step 3') && (
                             <td className="px-4 py-4 whitespace-nowrap">
                                {(() => {
                                  const isActive = isEditing ? editFormData.onSystem : record.onSystem;
                                  return (
                                    <div onClick={() => isEditing && setEditFormData({...editFormData, onSystem: !editFormData.onSystem})} className={`px-2 py-1 rounded inline-flex items-center gap-1.5 transition-all ${isEditing ? 'cursor-pointer border' : ''} ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-300'}`}>
                                      <CheckCircle2 size={10} />
                                      <span className="text-[9px] font-bold uppercase">SYS</span>
                                    </div>
                                  );
                                })()}
                             </td>
                          )}
                          {(activeTab === 'Step 2' || activeTab === 'Step 3') && (
                             <td className="px-4 py-4 whitespace-nowrap">
                                {(() => {
                                  const isActive = isEditing ? editFormData.hasSyncedGpo : record.hasSyncedGpo;
                                  return (
                                    <div onClick={() => isEditing && setEditFormData({...editFormData, hasSyncedGpo: !editFormData.hasSyncedGpo})} className={`px-2 py-1 rounded inline-flex items-center gap-1.5 transition-all ${isEditing ? 'cursor-pointer border' : ''} ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-300'}`}>
                                      <CheckCircle2 size={10} />
                                      <span className="text-[9px] font-bold uppercase">GPO</span>
                                    </div>
                                  );
                                })()}
                             </td>
                          )}

                          {/* Remark Section */}
                          {activeTab !== 'All Accounts' && (
                             <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                               {isEditing ? (
                                 <input type="text" className="w-40 bg-white border border-gray-200 rounded px-2 py-1 text-sm font-light italic" value={editFormData.remark} onChange={(e) => setEditFormData({...editFormData, remark: e.target.value})} />
                               ) : record.remark}
                            </td>
                          )}

                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                               {isEditing ? (
                                 <>
                                   <button 
                                     onClick={() => { setEditingId(null); setEditFormData(null); }}
                                     className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-all uppercase"
                                   >
                                     Cancel
                                   </button>
                                   <button 
                                     onClick={() => handleSaveRow(record.id)}
                                     className="px-4 py-1 bg-indigo-600 rounded-lg text-[10px] font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all uppercase"
                                   >
                                     SAVE
                                   </button>
                                 </>
                               ) : (
                                 <>
                                   <button 
                                     onClick={() => handleEditRow(record)}
                                     className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-all uppercase"
                                   >
                                     <Edit2 size={10} className="text-gray-400" /> EDIT
                                   </button>
                                   <button 
                                     className="px-3 py-1 bg-indigo-50 text-indigo-400 rounded-lg text-[10px] font-bold cursor-not-allowed opacity-50 uppercase"
                                     disabled
                                   >
                                     SAVE
                                   </button>
                                 </>
                               )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {records.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                     <Search className="text-gray-200" size={32} />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No data records found for this workflow segment.</p>
                </div>
              )}
            </div>

            {/* Pagination / Footer */}
            <footer className="mt-auto border-t border-gray-100 px-8 py-4 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 font-medium tracking-tight">
                  Displaying <span className="font-bold text-gray-900">15</span> results per page
                </span>
                <select className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option>15 / page</option>
                  <option>50 / page</option>
                  <option>100 / page</option>
                </select>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm text-gray-400 transition-all">
                    <ChevronRight className="rotate-180" size={18} />
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 text-white font-bold text-xs shadow-sm">1</button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm text-gray-500 text-xs font-medium">2</button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm text-gray-500 text-xs font-medium">3</button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm text-gray-400 transition-all">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs text-gray-400">Go to</span>
                   <input 
                    type="text" 
                    defaultValue="1"
                    className="w-10 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                   />
                </div>
              </div>
            </footer>
          </div>
        </div>
      </main>

      <AddRecordModal 
        isOpen={isAddModalOpen} 
        onClose={() => setAddModalOpen(false)} 
        onSave={handleSaveRecord} 
      />
    </div>
  );
}
