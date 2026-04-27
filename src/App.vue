<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { 
  Search, 
  RotateCcw, 
  Plus, 
  Edit2,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutDashboard,
  MapPin,
  Loader2,
  Menu,
  Save,
  X,
  FileDown,
  FileUp,
  ListFilter
} from 'lucide-vue-next';
import { 
  getAccounts, 
  createAccount, 
  updateAccount, 
  geocodeAddress 
} from './services/api';
import { ElMessage } from 'element-plus';

// --- Types ---
type WorkflowStatus = 'All Accounts' | 'Step 1' | 'Step 2' | 'Step 3' | 'Fully Verified' | 'Decommissioned';

interface AccountRecord {
  id: string | number;
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

// --- State ---
const records = ref<AccountRecord[]>([]);
const activeTab = ref<WorkflowStatus>('All Accounts');
const isSidebarOpen = ref(true);
const isAddModalOpen = ref(false);
const isBulkModalOpen = ref(false);
const isLoading = ref(false);
const isGeocoding = ref(false);
const selectedRecords = ref<AccountRecord[]>([]);
const editingId = ref<string | number | null>(null);
const editFormData = ref<any>(null);
const bulkFormData = reactive({
  idType: '',
  progressStatus: '',
  dsp: '',
  simStatus: '',
  mpin: '',
  hasDti: null as boolean | null,
  hasSelfie: null as boolean | null,
  hasStorePhoto: null as boolean | null,
  onSystem: null as boolean | null,
  hasSyncedGpo: null as boolean | null
});

// --- Filters State ---
const initialFilters = {
  mobileNumber: '',
  firstName: '',
  lastName: '',
  middleName: '',
  idType: '',
  progressStatus: '',
  submittedAt: '',
  dsp: '',
  storeName: '',
  fullAddress: '',
  latitude: '',
  longitude: '',
  simStatus: '',
  mpin: '',
  remark: '',
  hasDti: false,
  hasSelfie: false,
  hasStorePhoto: false,
  onSystem: false,
  hasSyncedGpo: false
};
const filters = reactive({ ...initialFilters });

// --- Form State ---
const initialForm = {
  mobileNumber: '',
  firstName: '',
  lastName: '',
  middleName: '',
  idType: '',
  progressStatus: 'Pending',
  submittedAt: new Date().toISOString().slice(0, 10),
  dsp: '',
  storeName: '',
  fullAddress: '',
  latitude: '',
  longitude: '',
  simStatus: 'Pending',
  mpin: '',
  hasDti: false,
  hasSelfie: false,
  hasStorePhoto: false,
  onSystem: false,
  hasSyncedGpo: false,
  remark: ''
};
const formData = ref({ ...initialForm });

// --- Options ---
const dspOptions = ['Manila', 'Laguna', 'Pampanga', 'Cebu'];
const idTypeOptions = [
  'National ID', "Driver's License", 'UMID', 'Passport', 'SSS ID', 
  'ACR ID', 'HDMF', 'IBP ID', 'NBI Clearance', 'Postal ID', 'PRC ID'
];
const progressStatusOptions = [
  'Step 1 Done', 'Step 2 Done', 'Step 3 Done', 'Need Fix', 
  'Approved', 'Rejected', 'Fully Verified', 'Disabled', 
  'Decommissioned', 'Ready for KYC', 'Pending'
];
const simStatusOptions = [
  'Pending', 'Ready', 'Invalid', 'Expired'
];

// --- Subpage Configuration ---
const tabConfig = computed(() => {
  const configs: Record<WorkflowStatus, { filters: string[], columns: string[] }> = {
    'All Accounts': {
      filters: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'fullAddress', 'latitude', 'longitude', 'simStatus', 'mpin', 'hasDti', 'hasSelfie', 'hasStorePhoto', 'onSystem', 'hasSyncedGpo', 'remark'],
      columns: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'fullAddress', 'latitude', 'longitude', 'simStatus', 'mpin', 'documentation', 'remark']
    },
    'Step 1': {
      filters: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'hasDti', 'remark'],
      columns: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'hasDti', 'remark']
    },
    'Step 2': {
      filters: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'simStatus', 'mpin', 'hasDti', 'onSystem', 'hasSyncedGpo', 'remark'],
      columns: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'fullAddress', 'latitude', 'longitude', 'simStatus', 'mpin', 'hasDti', 'onSystem', 'hasSyncedGpo', 'remark']
    },
    'Step 3': {
      filters: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'simStatus', 'mpin', 'hasDti', 'hasSelfie', 'hasStorePhoto', 'onSystem', 'hasSyncedGpo', 'remark'],
      columns: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'fullAddress', 'latitude', 'longitude', 'simStatus', 'mpin', 'hasDti', 'hasSelfie', 'hasStorePhoto', 'onSystem', 'hasSyncedGpo', 'remark']
    },
    'Fully Verified': {
      filters: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'dsp', 'storeName', 'simStatus', 'mpin', 'remark'],
      columns: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'fullAddress', 'simStatus', 'mpin', 'remark']
    },
    'Decommissioned': {
      filters: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'dsp', 'storeName', 'simStatus', 'mpin', 'remark'],
      columns: ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus', 'submittedAt', 'dsp', 'storeName', 'fullAddress', 'simStatus', 'mpin', 'remark']
    }
  };
  return configs[activeTab.value];
});

// --- Logic functions ---

let geocodeTimer: any = null;

const getStatusRestrictionInfo = (data: any) => {
  const hasBasic = data.mobileNumber && data.firstName && data.lastName && data.middleName && 
                   data.idType && data.submittedAt && data.dsp && data.storeName && 
                   data.fullAddress && data.latitude && data.longitude;

  const set1Met = !!(hasBasic && (data.simStatus === 'Ready' || data.simStatus === 'Pending'));
  const set2Met = !!(hasBasic && data.simStatus === 'Ready' && data.mpin && data.hasDti && data.onSystem && data.hasSyncedGpo);
  const set3Met = !!(set2Met && data.hasSelfie && data.hasStorePhoto);

  return { set1Met, set2Met, set3Met };
};

const isStatusDisabled = (status: string, data: any) => {
  const { set1Met, set2Met, set3Met } = getStatusRestrictionInfo(data);
  
  if (['Decommissioned', 'Disabled', 'Need Fix', 'Pending'].includes(status)) {
    return false;
  }

  const set1Statuses = ['Step 1 Done', 'Step 2 Done', 'Step 3 Done', 'Approved', 'Rejected', 'Fully Verified', 'Ready for KYC'];
  const set2Statuses = ['Step 2 Done', 'Step 3 Done', 'Approved', 'Rejected', 'Fully Verified'];
  const set3Statuses = ['Step 3 Done', 'Fully Verified'];

  if (set1Statuses.includes(status) && !set1Met) return true;
  if (set2Statuses.includes(status) && !set2Met) return true;
  if (set3Statuses.includes(status) && !set3Met) return true;

  return false;
};

const getRemainingTime = (dateStr: string) => {
  if (!dateStr) return null;
  const submittedDate = new Date(dateStr);
  const now = new Date();
  const d1 = new Date(submittedDate.getFullYear(), submittedDate.getMonth(), submittedDate.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffMs = d2.getTime() - d1.getTime();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
  
  if (diffMs >= fifteenDaysMs) {
    return { text: 'Expired (15+ Days)', isExpired: true };
  } else {
    const remainingMs = fifteenDaysMs - diffMs;
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    return { text: `${remainingDays} days remaining`, isExpired: false };
  }
};

const getCanonicalSubpage = (record: AccountRecord): WorkflowStatus | null => {
  const basicData = record.mobileNumber && record.firstName && record.lastName && record.middleName && record.idType;
  const step2Data = basicData && record.submittedAt && record.dsp && record.storeName && record.fullAddress && record.latitude && record.longitude;
  const step3Data = step2Data && record.mpin && record.hasDti && record.onSystem && record.hasSyncedGpo;
  const verifiedData = step3Data && record.hasSelfie && record.hasStorePhoto;

  if (basicData && 
      ['Disabled', 'Decommissioned'].includes(record.progressStatus) && 
      ['Invalid', 'Expired'].includes(record.simStatus)) {
    return 'Decommissioned';
  }

  if (verifiedData && record.progressStatus === 'Fully Verified' && record.simStatus === 'Ready') {
    return 'Fully Verified';
  }

  if (step3Data && 
      ['Step 2 Done', 'Need Fix', 'Approved', 'Rejected', 'Ready for KYC'].includes(record.progressStatus) && 
      record.simStatus === 'Ready') {
    return 'Step 3';
  }

  if (step2Data && 
      ['Step 1 Done', 'Ready for KYC'].includes(record.progressStatus) && 
      ['Ready', 'Pending'].includes(record.simStatus)) {
    return 'Step 2';
  }

  if (basicData && record.progressStatus === 'Pending') {
    return 'Step 1';
  }

  return null;
};

// --- Computed ---
const countdownText = computed(() => {
  const info = getRemainingTime(formData.value.submittedAt);
  return info ? info.text : null;
});

const isExpired = computed(() => {
  const info = getRemainingTime(formData.value.submittedAt);
  return info ? info.isExpired : false;
});

// --- Watchers ---
watch(() => isExpired.value, (newExpired) => {
  if (newExpired && formData.value.progressStatus !== 'Ready for KYC' && formData.value.progressStatus !== 'Decommissioned') {
    formData.value.progressStatus = 'Ready for KYC';
  }
});

watch(() => editFormData.value?.submittedAt, (newDate) => {
  if (editFormData.value && newDate) {
    const info = getRemainingTime(newDate);
    if (info?.isExpired && editFormData.value.progressStatus !== 'Ready for KYC' && editFormData.value.progressStatus !== 'Decommissioned') {
      editFormData.value.progressStatus = 'Ready for KYC';
    }
  }
});

watch(() => formData.value.fullAddress, (newVal) => {
  if (geocodeTimer) clearTimeout(geocodeTimer);
  if (!newVal || newVal.length <= 5) return;
  
  geocodeTimer = setTimeout(async () => {
    isGeocoding.value = true;
    try {
      const geo = await geocodeAddress(newVal);
      if (geo && geo.lat && geo.lng) {
        formData.value.latitude = geo.lat.toString();
        formData.value.longitude = geo.lng.toString();
      }
    } catch (e) {
      console.error('Geocoding error', e);
    } finally {
      isGeocoding.value = false;
    }
  }, 1000);
});

watch(() => editFormData.value?.fullAddress, (newVal) => {
  if (editingId.value) {
    if (geocodeTimer) clearTimeout(geocodeTimer);
    if (!newVal || newVal.length <= 5) return;
    
    geocodeTimer = setTimeout(async () => {
      isGeocoding.value = true;
      try {
        const geo = await geocodeAddress(newVal);
        if (geo && geo.lat && geo.lng) {
          editFormData.value.latitude = geo.lat.toString();
          editFormData.value.longitude = geo.lng.toString();
        }
      } catch (e) {
        console.error('Geocoding error', e);
      } finally {
        isGeocoding.value = false;
      }
    }, 1000);
  }
});

// --- Computed ---
const isEditModalOpen = computed({
  get: () => !!editingId.value,
  set: (val: boolean) => {
    if (!val) {
      editingId.value = null;
      editFormData.value = null;
    }
  }
});

const filteredRecords = computed(() => {
  return records.value.filter(record => {
    // Tab filtering
    if (activeTab.value !== 'All Accounts' && getCanonicalSubpage(record) !== activeTab.value) return false;

    // Search filters
    if (filters.mobileNumber && !record.mobileNumber.includes(filters.mobileNumber)) return false;
    if (filters.firstName && !record.firstName.toLowerCase().includes(filters.firstName.toLowerCase())) return false;
    if (filters.lastName && !record.lastName.toLowerCase().includes(filters.lastName.toLowerCase())) return false;
    if (filters.middleName && !record.middleName.toLowerCase().includes(filters.middleName.toLowerCase())) return false;
    if (filters.idType && record.idType !== filters.idType) return false;
    if (filters.progressStatus && record.progressStatus !== filters.progressStatus) return false;
    if (filters.dsp && record.dsp !== filters.dsp) return false;
    if (filters.simStatus && record.simStatus !== filters.simStatus) return false;
    if (filters.storeName && !record.storeName.toLowerCase().includes(filters.storeName.toLowerCase())) return false;
    if (filters.remark && !record.remark.toLowerCase().includes(filters.remark.toLowerCase())) return false;
    if (filters.submittedAt && record.submittedAt !== filters.submittedAt) return false;
    if (filters.fullAddress && !record.fullAddress.toLowerCase().includes(filters.fullAddress.toLowerCase())) return false;
    if (filters.latitude && !record.latitude.includes(filters.latitude)) return false;
    if (filters.longitude && !record.longitude.includes(filters.longitude)) return false;
    if (filters.mpin && !record.mpin.includes(filters.mpin)) return false;
    
    // Checkbox filters
    if (filters.hasDti && !record.hasDti) return false;
    if (filters.hasSelfie && !record.hasSelfie) return false;
    if (filters.hasStorePhoto && !record.hasStorePhoto) return false;
    if (filters.onSystem && !record.onSystem) return false;
    if (filters.hasSyncedGpo && !record.hasSyncedGpo) return false;

    return true;
  });
});

// --- Actions ---
const handleBulkUpdate = async () => {
  if (selectedRecords.value.length === 0) return;
  
  isLoading.value = true;
  try {
    const promises = selectedRecords.value.map(record => {
      const updates: any = {};
      if (bulkFormData.idType) updates.idType = bulkFormData.idType;
      if (bulkFormData.progressStatus) updates.progressStatus = bulkFormData.progressStatus;
      if (bulkFormData.dsp) updates.dsp = bulkFormData.dsp;
      if (bulkFormData.simStatus) updates.simStatus = bulkFormData.simStatus;
      if (bulkFormData.mpin) updates.mpin = bulkFormData.mpin;
      if (bulkFormData.hasDti !== null) updates.hasDti = bulkFormData.hasDti;
      if (bulkFormData.hasSelfie !== null) updates.hasSelfie = bulkFormData.hasSelfie;
      if (bulkFormData.hasStorePhoto !== null) updates.hasStorePhoto = bulkFormData.hasStorePhoto;
      if (bulkFormData.onSystem !== null) updates.onSystem = bulkFormData.onSystem;
      if (bulkFormData.hasSyncedGpo !== null) updates.hasSyncedGpo = bulkFormData.hasSyncedGpo;
      
      return updateAccount(record.id, { ...record, ...updates });
    });
    
    await Promise.all(promises);
    await fetchRecords();
    isBulkModalOpen.value = false;
    ElMessage.success(`Successfully updated ${selectedRecords.value.length} records`);
    selectedRecords.value = [];
    
    // Reset bulk form
    bulkFormData.idType = '';
    bulkFormData.progressStatus = '';
    bulkFormData.dsp = '';
    bulkFormData.simStatus = '';
    bulkFormData.mpin = '';
    bulkFormData.hasDti = null;
    bulkFormData.hasSelfie = null;
    bulkFormData.hasStorePhoto = null;
    bulkFormData.onSystem = null;
    bulkFormData.hasSyncedGpo = null;
  } catch (e) {
    ElMessage.error('Failed to update records in bulk');
  } finally {
    isLoading.value = false;
  }
};

const checkAndAutoStatus = async (recordsList: AccountRecord[]) => {
  let updatedCount = 0;
  for (const record of recordsList) {
    const info = getRemainingTime(record.submittedAt);
    if (info?.isExpired && record.progressStatus !== 'Ready for KYC' && record.progressStatus !== 'Decommissioned') {
      try {
        await updateAccount(record.id, { ...record, progressStatus: 'Ready for KYC' });
        updatedCount++;
      } catch (e) {
        console.error('Auto status update failed for', record.id);
      }
    }
  }
  if (updatedCount > 0) {
    return true; // Indicates we need to reload data
  }
  return false;
};

const fetchRecords = async () => {
  isLoading.value = true;
  try {
    const data = await getAccounts();
    records.value = data;
    const shouldReload = await checkAndAutoStatus(data);
    if (shouldReload) {
      records.value = await getAccounts();
    }
  } catch (e) {
    ElMessage.error('Failed to load records');
  } finally {
    isLoading.value = false;
  }
};

const clearFilters = () => {
  Object.assign(filters, initialFilters);
};

const handleSaveRecord = async () => {
  const mandatoryFields = ['mobileNumber', 'firstName', 'lastName', 'middleName', 'idType', 'progressStatus'];
  const missing = mandatoryFields.filter(f => !formData.value[f as keyof typeof formData.value]);
  if (missing.length > 0) {
    ElMessage.warning(`Please fill in all mandatory fields: ${missing.join(', ')}`);
    return;
  }

  try {
    const newRecord = await createAccount(formData.value);
    records.value.unshift(newRecord);
    isAddModalOpen.value = false;
    formData.value = { ...initialForm };
    ElMessage.success('Record saved successfully');
  } catch (e) {
    ElMessage.error('Failed to save record');
  }
};

const handleEditRow = (record: AccountRecord) => {
  editingId.value = record.id;
  editFormData.value = { ...record };
};

const handleSaveRow = async () => {
  if (!editingId.value) return;
  try {
    const updated = await updateAccount(editingId.value, editFormData.value);
    const index = records.value.findIndex(r => r.id === editingId.value);
    if (index !== -1) {
      records.value[index] = updated;
    }
    editingId.value = null;
    editFormData.value = null;
    ElMessage.success('Record updated successfully');
  } catch (e) {
    ElMessage.error('Failed to update record');
  }
};

const handleCancelEdit = () => {
  editingId.value = null;
  editFormData.value = null;
};

const getBadgeVariant = (status: string) => {
  if (['Fully Verified', 'Approved', 'Ready', 'Active'].includes(status)) return 'success';
  if (['Pending', 'Step 1 Done', 'Step 2 Done', 'Step 3 Done'].includes(status)) return 'warning';
  if (['Rejected', 'Disabled', 'Decommissioned', 'Invalid'].includes(status)) return 'danger';
  if (['Ready for KYC'].includes(status)) return 'info';
  return 'info';
};

const tabs = [
  { id: 'All Accounts' as WorkflowStatus, label: 'All Accounts', icon: LayoutDashboard, color: 'text-indigo-600' },
  { id: 'Step 1' as WorkflowStatus, label: 'Step 1', icon: Clock, color: 'text-amber-600' },
  { id: 'Step 2' as WorkflowStatus, label: 'Step 2', icon: Search, color: 'text-sky-600' },
  { id: 'Step 3' as WorkflowStatus, label: 'Step 3', icon: CheckCircle2, color: 'text-emerald-600' },
  { id: 'Fully Verified' as WorkflowStatus, label: 'Fully Verified', icon: CheckCircle2, color: 'text-indigo-600' },
  { id: 'Decommissioned' as WorkflowStatus, label: 'Decommissioned', icon: AlertCircle, color: 'text-gray-600' },
];

onMounted(() => {
  fetchRecords();
});

const isFilterFieldVisible = (field: string) => tabConfig.value.filters.includes(field);
const isColumnVisible = (column: string) => tabConfig.value.columns.includes(column);

</script>

<template>
  <div class="min-h-screen bg-gray-50 flex font-sans">
    <!-- Sidebar -->
    <aside 
      class="bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-40"
      :class="[isSidebarOpen ? 'w-64' : 'w-20']"
    >
      <div class="p-6 flex items-center justify-between border-b border-gray-100 mb-6">
        <div v-if="isSidebarOpen" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Building2 class="text-white" :size="18" />
          </div>
          <span class="font-black text-gray-900 tracking-tighter text-xl">ProgressHQ</span>
        </div>
        <button @click="isSidebarOpen = !isSidebarOpen" class="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
          <Menu v-if="!isSidebarOpen" :size="20" />
          <X v-else :size="20" />
        </button>
      </div>

      <nav class="flex-1 px-4 space-y-1">
        <div v-if="isSidebarOpen" class="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Segmentation</div>
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
          :class="[activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900']"
        >
          <component :is="tab.icon" :size="18" :class="[activeTab === tab.id ? tab.color : 'text-gray-400 group-hover:text-gray-600']" />
          <span v-if="isSidebarOpen" class="text-sm font-semibold tracking-tight">{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="bg-white px-10 py-8 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight mb-1">Account Progress</h1>
          <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{{ activeTab }}</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            v-if="selectedRecords.length > 0"
            @click="isBulkModalOpen = true"
            class="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black flex items-center gap-2 border border-indigo-200 transition-all uppercase tracking-widest mr-4"
          >
            <Edit2 :size="14" />
            Bulk Edit ({{ selectedRecords.length }})
          </button>
          <button class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center gap-2 border border-gray-200 transition-all">
            <FileUp :size="16" />
            Batch Import
          </button>
          <button class="px-4 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100 transition-all">
            <FileDown :size="16" />
            Export CSV
          </button>
          <button @click="isAddModalOpen = true" class="px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all text-xs font-bold ml-2">
            <Plus :size="16" />
            Add Record
          </button>
        </div>
      </header>

      <!-- Content Area -->
      <div class="p-10 space-y-8">
        <!-- Deep Filter Card -->
        <section class="bg-white rounded-[2rem] border border-gray-200 p-8 shadow-sm">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-indigo-50 rounded-lg">
                <ListFilter class="text-indigo-600" :size="20" />
              </div>
              <h2 class="font-bold text-gray-900 tracking-tight">Deep Filter</h2>
            </div>
            <button @click="clearFilters" class="text-rose-600 hover:text-rose-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all">
              <RotateCcw :size="14" />
              Clear All Filters
            </button>
          </div>

          <div class="grid grid-cols-5 gap-6 mb-8">
            <div v-if="isFilterFieldVisible('mobileNumber')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mobile Number</label>
              <el-input v-model="filters.mobileNumber" placeholder="09..." />
            </div>
            <div v-if="isFilterFieldVisible('firstName')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">First Name</label>
              <el-input v-model="filters.firstName" placeholder="Search name..." />
            </div>
            <div v-if="isFilterFieldVisible('lastName')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Name</label>
              <el-input v-model="filters.lastName" placeholder="Search name..." />
            </div>
            <div v-if="isFilterFieldVisible('middleName')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Middle Name</label>
              <el-input v-model="filters.middleName" placeholder="Search name..." />
            </div>
            <div v-if="isFilterFieldVisible('idType')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Type</label>
              <el-select v-model="filters.idType" placeholder="All ID Types" class="w-full" clearable>
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('progressStatus')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progress Status</label>
              <el-select v-model="filters.progressStatus" placeholder="All Statuses" class="w-full" clearable>
                <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('submittedAt')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted At</label>
              <el-date-picker v-model="filters.submittedAt" type="date" value-format="YYYY-MM-DD" placeholder="dd/mm/yyyy" class="!w-full" />
            </div>
            <div v-if="isFilterFieldVisible('dsp')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DSP</label>
              <el-select v-model="filters.dsp" placeholder="All DSPs" class="w-full" clearable>
                <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('storeName')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Store Name</label>
              <el-input v-model="filters.storeName" placeholder="Search store..." />
            </div>
            <div v-if="isFilterFieldVisible('fullAddress')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Address</label>
              <el-input v-model="filters.fullAddress" placeholder="Search address..." />
            </div>
            <div v-if="isFilterFieldVisible('latitude')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Latitude</label>
              <el-input v-model="filters.latitude" placeholder="Search lat..." />
            </div>
            <div v-if="isFilterFieldVisible('longitude')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Longitude</label>
              <el-input v-model="filters.longitude" placeholder="Search lng..." />
            </div>
            <div v-if="isFilterFieldVisible('simStatus')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SIM Status</label>
              <el-select v-model="filters.simStatus" placeholder="All States" class="w-full" clearable>
                <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('mpin')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MPIN</label>
              <el-input v-model="filters.mpin" placeholder="Search mpin..." />
            </div>
            <div v-if="isFilterFieldVisible('remark')" class="space-y-1.5">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remark</label>
              <el-input v-model="filters.remark" placeholder="Search remark..." />
            </div>
          </div>

          <div class="space-y-6">
            <div class="flex flex-wrap gap-8 py-6 border-y border-gray-100">
              <el-checkbox v-if="isFilterFieldVisible('hasDti')" v-model="filters.hasDti" label="DTI" />
              <el-checkbox v-if="isFilterFieldVisible('hasSelfie')" v-model="filters.hasSelfie" label="SELFIE" />
              <el-checkbox v-if="isFilterFieldVisible('hasStorePhoto')" v-model="filters.hasStorePhoto" label="STORE" />
              <el-checkbox v-if="isFilterFieldVisible('onSystem')" v-model="filters.onSystem" label="IN SYSTEM" />
              <el-checkbox v-if="isFilterFieldVisible('hasSyncedGpo')" v-model="filters.hasSyncedGpo" label="SYNCED GPO" />
            </div>
            
            <div class="flex items-center justify-between">
              <div v-if="isFilterFieldVisible('remark')" class="w-2/3">
                <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Remark</label>
                <el-input v-model="filters.remark" placeholder="Search remark..." />
              </div>
              <button class="px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 ml-auto">
                Apply Filters
              </button>
            </div>
          </div>
        </section>

        <!-- Table Card -->
        <section class="bg-white rounded-[2rem] border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          <div class="flex-1 overflow-auto">
            <el-table 
              v-loading="isLoading"
              :data="filteredRecords" 
              style="width: 100%"
              class="custom-table"
              @selection-change="(val: any) => selectedRecords = val"
            >
              <el-table-column type="selection" width="55" fixed />
              
              <el-table-column v-if="isColumnVisible('mobileNumber')" prop="mobileNumber" label="Mobile Number" width="160">
                <template #default="{ row }">
                  <div class="text-sm font-bold text-gray-900 tracking-tight">{{ row.mobileNumber }}</div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('firstName')" prop="firstName" label="First Name" width="140">
                <template #default="{ row }">
                  <span class="text-sm font-semibold text-gray-700">{{ row.firstName }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('lastName')" prop="lastName" label="Last Name" width="140">
                <template #default="{ row }">
                  <span class="text-sm font-semibold text-gray-700">{{ row.lastName }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('middleName')" prop="middleName" label="Middle Name" width="140">
                <template #default="{ row }">
                  <span class="text-sm font-medium text-gray-500">{{ row.middleName }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('idType')" prop="idType" label="ID Type" width="140">
                <template #default="{ row }">
                  <span class="text-[10px] font-black uppercase text-gray-400 tracking-wider">{{ row.idType }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('progressStatus')" prop="progressStatus" label="Progress Status" width="160">
                <template #default="{ row }">
                  <el-tag :type="getBadgeVariant(row.progressStatus)" round effect="plain" class="!px-4 font-bold border-none bg-opacity-70">
                    {{ row.progressStatus }}
                  </el-tag>
                </template>
              </el-table-column>

               <el-table-column v-if="isColumnVisible('submittedAt')" prop="submittedAt" label="Submitted At" width="180">
                <template #default="{ row }">
                   <div class="flex flex-col">
                      <span class="text-xs font-bold text-gray-600">{{ row.submittedAt }}</span>
                      <span v-if="getRemainingTime(row.submittedAt)?.text" 
                            class="text-[9px] font-bold mt-0.5"
                            :class="getRemainingTime(row.submittedAt)?.isExpired ? 'text-rose-500' : 'text-amber-500'"
                      >
                        {{ getRemainingTime(row.submittedAt)?.text }}
                      </span>
                   </div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('dsp')" prop="dsp" label="DSP" width="140">
                <template #default="{ row }">
                  <span class="text-sm font-black text-indigo-600">{{ row.dsp }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('storeName')" prop="storeName" label="Store Name" width="200">
                <template #default="{ row }">
                  <span class="text-xs font-bold text-gray-800">{{ row.storeName }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('fullAddress')" prop="fullAddress" label="Full Address" width="280">
                <template #default="{ row }">
                  <span class="text-[10px] font-medium text-gray-400 italic truncate block w-full">{{ row.fullAddress }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('latitude')" prop="latitude" label="Latitude" width="140">
                <template #default="{ row }">
                  <span class="text-[10px] font-mono text-gray-400">{{ row.latitude }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('longitude')" prop="longitude" label="Longitude" width="140">
                <template #default="{ row }">
                  <span class="text-[10px] font-mono text-gray-400">{{ row.longitude }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('simStatus')" prop="simStatus" label="SIM Status" width="140">
                <template #default="{ row }">
                  <el-tag :type="getBadgeVariant(row.simStatus)" effect="dark" size="small" class="!px-3 !h-6 !text-[10px] font-black border-none">
                    {{ row.simStatus }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('mpin')" prop="mpin" label="MPIN" width="120">
                <template #default="{ row }">
                  <span class="text-xs font-mono font-bold text-gray-500">{{ row.mpin }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('hasDti')" prop="hasDti" label="DTI" width="100">
                <template #default="{ row }">
                   <div v-if="row.hasDti" class="text-emerald-600 text-[10px] font-black uppercase">Yes</div>
                   <div v-else class="text-gray-300 text-[10px] font-bold">No</div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('hasSelfie')" prop="hasSelfie" label="Selfie" width="100">
                <template #default="{ row }">
                   <div v-if="row.hasSelfie" class="text-sky-600 text-[10px] font-black uppercase">Yes</div>
                   <div v-else class="text-gray-300 text-[10px] font-bold">No</div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('hasStorePhoto')" prop="hasStorePhoto" label="Store" width="100">
                <template #default="{ row }">
                   <div v-if="row.hasStorePhoto" class="text-amber-600 text-[10px] font-black uppercase">Yes</div>
                   <div v-else class="text-gray-300 text-[10px] font-bold">No</div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('onSystem')" prop="onSystem" label="In System" width="100">
                <template #default="{ row }">
                   <div v-if="row.onSystem" class="text-indigo-600 text-[10px] font-black uppercase">Yes</div>
                   <div v-else class="text-gray-300 text-[10px] font-bold">No</div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('hasSyncedGpo')" prop="hasSyncedGpo" label="Synced to GPO" width="120">
                <template #default="{ row }">
                   <div v-if="row.hasSyncedGpo" class="text-purple-600 text-[10px] font-black uppercase">Yes</div>
                   <div v-else class="text-gray-300 text-[10px] font-bold">No</div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('documentation')" label="Documentation" width="220">
                <template #default="{ row }">
                   <div class="flex flex-wrap gap-2">
                      <div v-if="row.hasDti" class="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-100">
                        <CheckCircle2 :size="10" /> DTI
                      </div>
                      <div v-if="row.hasSelfie" class="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-600 rounded text-[9px] font-bold border border-sky-100">
                        <Users :size="10" /> SELFIE
                      </div>
                      <div v-if="row.hasStorePhoto" class="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded text-[9px] font-bold border border-amber-100">
                        <Building2 :size="10" /> STORE
                      </div>
                      <div v-if="row.onSystem" class="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100">
                        <LayoutDashboard :size="10" /> SYS
                      </div>
                      <div v-if="row.hasSyncedGpo" class="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded text-[9px] font-bold border border-purple-100">
                        <RotateCcw :size="10" /> GPO
                      </div>
                   </div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('remark')" prop="remark" label="Remark" min-width="180">
                <template #default="{ row }">
                  <span class="text-xs font-medium text-gray-500">{{ row.remark }}</span>
                </template>
              </el-table-column>

              <el-table-column label="Actions" width="160" fixed="right">
                <template #default="{ row }">
                   <div class="flex items-center gap-2">
                      <button @click="handleEditRow(row)" class="text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all uppercase tracking-widest">
                        EDIT
                      </button>
                      <button @click="handleSaveRow" class="text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 transition-all uppercase tracking-widest">
                        SAVE
                      </button>
                   </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- Pagination Footer -->
          <div class="bg-white border-t border-gray-100 p-6 flex items-center justify-between">
            <div class="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Displaying <span class="text-gray-900">15</span> results per page</span>
              <el-select value="15 / page" size="small" :teleported="false" class="!w-24">
                <el-option label="15 / page" value="15" />
                <el-option label="30 / page" value="30" />
                <el-option label="50 / page" value="50" />
              </el-select>
            </div>
            <div class="flex items-center gap-2">
              <el-pagination 
                layout="prev, pager, next" 
                :total="100" 
                class="custom-pagination"
              />
              <div class="flex items-center gap-2 ml-4">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Go to</span>
                <el-input placeholder="1" size="small" class="!w-12 text-center" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Add Record Modal -->
    <el-dialog
      v-model="isAddModalOpen"
      title="Add Record"
      width="850px"
      class="custom-dialog"
      :close-on-click-modal="false"
    >
      <div class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-x-8 gap-y-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number *</label>
              <el-input v-model="formData.mobileNumber" placeholder="09XXXXXXXXX" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Name *</label>
              <el-input v-model="formData.firstName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Name *</label>
              <el-input v-model="formData.lastName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Middle Name *</label>
              <el-input v-model="formData.middleName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Type *</label>
              <el-select v-model="formData.idType" class="w-full">
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress Status *</label>
              <el-select v-model="formData.progressStatus" class="w-full">
                 <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" :disabled="isStatusDisabled(opt, formData)" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted At</label>
              <el-date-picker v-model="formData.submittedAt" type="date" value-format="YYYY-MM-DD" class="w-full" />
              <div v-if="countdownText" class="mt-1 p-2 rounded text-[10px] font-bold flex items-center gap-1" :class="isExpired ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'">
                <Clock :size="12" /> {{ countdownText }}
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DSP</label>
              <el-select v-model="formData.dsp" class="w-full" placeholder="Select DSP">
                 <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Store Name</label>
              <el-input v-model="formData.storeName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SIM Status</label>
              <el-select v-model="formData.simStatus" class="w-full">
                 <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Address</label>
            <el-input v-model="formData.fullAddress" type="textarea" :rows="2" placeholder="Start typing address..." />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Latitude</label>
              <el-input v-model="formData.latitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Longitude</label>
              <el-input v-model="formData.longitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MPIN</label>
              <el-input v-model="formData.mpin" placeholder="4-digit MPIN" />
            </div>
          </div>

          <div v-if="formData.latitude && formData.longitude" class="rounded-2xl overflow-hidden border border-gray-200 shadow-inner h-48 bg-gray-50 relative">
             <div v-if="isGeocoding" class="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Loader2 class="animate-spin text-indigo-600 mb-2" :size="24" />
                <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Updating Location...</span>
             </div>
             <iframe 
               width="100%" 
               height="100%" 
               frameborder="0" 
               style="border:0" 
               :src="`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&z=15&output=embed`" 
               allowfullscreen
             ></iframe>
          </div>
          <div v-else class="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400">
             <MapPin :size="32" class="mb-2 opacity-20" />
             <p class="text-[10px] font-bold uppercase tracking-widest">Waiting for address coordinates...</p>
          </div>

          <div class="grid grid-cols-5 gap-4 py-6 border-y border-gray-100">
             <el-checkbox v-model="formData.hasDti" label="DTI" />
             <el-checkbox v-model="formData.hasSelfie" label="Selfie" />
             <el-checkbox v-model="formData.hasStorePhoto" label="Store" />
             <el-checkbox v-model="formData.onSystem" label="SYS" />
             <el-checkbox v-model="formData.hasSyncedGpo" label="GPO" />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Remark</label>
            <el-input v-model="formData.remark" type="textarea" :rows="3" />
          </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 px-8 py-6 bg-gray-50 border-t border-gray-100">
          <el-button @click="isAddModalOpen = false" class="!rounded-xl text-xs font-bold">Cancel</el-button>
          <el-button type="primary" class="!bg-indigo-600 !rounded-xl text-xs font-bold shadow-lg shadow-indigo-100" @click="handleSaveRecord">Save Record</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="isEditModalOpen"
      title="Edit Account Details"
      width="850px"
      class="custom-dialog"
      :before-close="handleCancelEdit"
    >
      <div v-if="editFormData" class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-x-8 gap-y-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</label>
              <el-input v-model="editFormData.mobileNumber" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Name</label>
              <el-input v-model="editFormData.firstName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Name</label>
              <el-input v-model="editFormData.lastName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Middle Name</label>
              <el-input v-model="editFormData.middleName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Type</label>
              <el-select v-model="editFormData.idType" class="w-full">
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress Status</label>
              <el-select v-model="editFormData.progressStatus" class="w-full">
                 <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" :disabled="isStatusDisabled(opt, editFormData)" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submitted At</label>
              <el-date-picker v-model="editFormData.submittedAt" type="date" value-format="YYYY-MM-DD" class="w-full" />
              <div v-if="getRemainingTime(editFormData.submittedAt)?.text" class="mt-1 p-2 rounded text-[10px] font-bold flex items-center gap-1" :class="getRemainingTime(editFormData.submittedAt)?.isExpired ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'">
                <Clock :size="12" /> {{ getRemainingTime(editFormData.submittedAt)?.text }}
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DSP</label>
              <el-select v-model="editFormData.dsp" class="w-full" placeholder="Select DSP">
                 <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Store Name</label>
              <el-input v-model="editFormData.storeName" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SIM Status</label>
              <el-select v-model="editFormData.simStatus" class="w-full">
                 <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Address</label>
            <el-input v-model="editFormData.fullAddress" type="textarea" :rows="2" />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Latitude</label>
              <el-input v-model="editFormData.latitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Longitude</label>
              <el-input v-model="editFormData.longitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MPIN</label>
              <el-input v-model="editFormData.mpin" placeholder="4-digit MPIN" />
            </div>
          </div>

          <div v-if="editFormData.latitude && editFormData.longitude" class="rounded-2xl overflow-hidden border border-gray-200 shadow-inner h-48 bg-gray-50 relative">
             <div v-if="isGeocoding" class="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Loader2 class="animate-spin text-indigo-600 mb-2" :size="24" />
                <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Updating Location...</span>
             </div>
             <iframe 
               width="100%" 
               height="100%" 
               frameborder="0" 
               style="border:0" 
               :src="`https://maps.google.com/maps?q=${editFormData.latitude},${editFormData.longitude}&z=15&output=embed`" 
               allowfullscreen
             ></iframe>
          </div>
          <div v-else class="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400">
             <MapPin :size="32" class="mb-2 opacity-20" />
             <p class="text-[10px] font-bold uppercase tracking-widest">No location coordinates set</p>
          </div>

          <div class="grid grid-cols-5 gap-4 py-6 border-y border-gray-100">
             <el-checkbox v-model="editFormData.hasDti" label="DTI" />
             <el-checkbox v-model="editFormData.hasSelfie" label="Selfie" />
             <el-checkbox v-model="editFormData.hasStorePhoto" label="Store" />
             <el-checkbox v-model="editFormData.onSystem" label="SYS" />
             <el-checkbox v-model="editFormData.hasSyncedGpo" label="GPO" />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Remark</label>
            <el-input v-model="editFormData.remark" type="textarea" :rows="3" />
          </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 px-8 py-6 bg-gray-50 border-t border-gray-100">
          <el-button @click="handleCancelEdit" class="!rounded-xl text-xs font-bold">Cancel</el-button>
          <el-button type="primary" class="!bg-indigo-600 !rounded-xl text-xs font-bold shadow-lg shadow-indigo-100" @click="handleSaveRow">Save Record</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Bulk Edit Modal -->
    <el-dialog
      v-model="isBulkModalOpen"
      title="Bulk Edit Records"
      width="600px"
      class="custom-dialog"
    >
      <div class="p-8 space-y-6">
        <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
          <AlertCircle class="text-indigo-600" :size="20" />
          <p class="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
            You are editing {{ selectedRecords.length }} selected records. Only changed fields will be applied.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID Type</label>
            <el-select v-model="bulkFormData.idType" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress Status</label>
            <el-select v-model="bulkFormData.progressStatus" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DSP</label>
            <el-select v-model="bulkFormData.dsp" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SIM Status</label>
            <el-select v-model="bulkFormData.simStatus" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MPIN</label>
          <el-input v-model="bulkFormData.mpin" placeholder="4-digit MPIN (leave blank for no change)" />
        </div>

        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">DTI</span>
             <el-radio-group v-model="bulkFormData.hasDti" size="small">
               <el-radio-button :value="true">Yes</el-radio-button>
               <el-radio-button :value="false">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Selfie</span>
             <el-radio-group v-model="bulkFormData.hasSelfie" size="small">
               <el-radio-button :value="true">Yes</el-radio-button>
               <el-radio-button :value="false">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Store</span>
             <el-radio-group v-model="bulkFormData.hasStorePhoto" size="small">
               <el-radio-button :value="true">Yes</el-radio-button>
               <el-radio-button :value="false">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">SYS</span>
             <el-radio-group v-model="bulkFormData.onSystem" size="small">
               <el-radio-button :value="true">Yes</el-radio-button>
               <el-radio-button :value="false">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl col-span-2">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Synced GPO</span>
             <el-radio-group v-model="bulkFormData.hasSyncedGpo" size="small">
               <el-radio-button :value="true">Yes</el-radio-button>
               <el-radio-button :value="false">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 px-8 py-6 bg-gray-50 border-t border-gray-100">
          <el-button @click="isBulkModalOpen = false" class="!rounded-xl text-xs font-bold">Cancel</el-button>
          <el-button type="primary" class="!bg-indigo-600 !rounded-xl text-xs font-bold shadow-lg shadow-indigo-100" @click="handleBulkUpdate">Update Multiple</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style>
/* Scoped styles can go here if they don't use @apply with global utilities */
</style>
