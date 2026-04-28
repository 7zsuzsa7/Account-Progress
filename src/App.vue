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
  deleteAccount,
  geocodeAddress 
} from './services/api';
import { t } from './i18n';
import { ElMessage, ElMessageBox } from 'element-plus';

// --- Types ---
type WorkflowStatus = 'All Accounts' | 'Step 1' | 'Step 2' | 'Step 3' | 'Fully Verified' | 'Decommissioned';

interface AccountRecord {
  id: string | number;
  submitted_at: string;
  dsp: string;
  mobile_number: string;
  sim_status: string;
  id_type: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  store_name: string;
  address_full: string;
  latitude: string;
  longitude: string;
  passwords: string;
  account_status: 'Active' | 'Inactive' | 'Pending';
  progress_status: string;
  is_on_system: number;
  dti_done: number;
  selfie_done: number;
  store_photo_done: number;
  synced_to_gpo: number;
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
  id_type: '',
  progress_status: '',
  dsp: '',
  sim_status: '',
  passwords: '',
  dti_done: null as number | null,
  selfie_done: null as number | null,
  store_photo_done: null as number | null,
  is_on_system: null as number | null,
  synced_to_gpo: null as number | null
});

// --- Filters State ---
const initialFilters = {
  mobile_number: '',
  first_name: '',
  last_name: '',
  middle_name: '',
  id_type: '',
  progress_status: '',
  submitted_at: '',
  dsp: '',
  store_name: '',
  address_full: '',
  latitude: '',
  longitude: '',
  sim_status: '',
  passwords: '',
  remark: '',
  dti_done: false,
  selfie_done: false,
  store_photo_done: false,
  is_on_system: false,
  synced_to_gpo: false
};
const filters = reactive({ ...initialFilters });

// --- Form State ---
const initialForm = {
  mobile_number: '',
  first_name: '',
  last_name: '',
  middle_name: '',
  id_type: '',
  progress_status: 'Pending',
  submitted_at: new Date().toISOString().slice(0, 10),
  dsp: '',
  store_name: '',
  address_full: '',
  latitude: '',
  longitude: '',
  sim_status: 'Pending',
  passwords: '',
  dti_done: 0,
  selfie_done: 0,
  store_photo_done: 0,
  is_on_system: 0,
  synced_to_gpo: 0,
  remark: '',
  account_status: 'Pending'
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
      filters: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'address_full', 'latitude', 'longitude', 'sim_status', 'passwords', 'dti_done', 'selfie_done', 'store_photo_done', 'is_on_system', 'synced_to_gpo', 'remark'],
      columns: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'address_full', 'latitude', 'longitude', 'sim_status', 'passwords', 'documentation', 'remark']
    },
    'Step 1': {
      filters: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'dti_done', 'remark'],
      columns: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'dti_done', 'remark']
    },
    'Step 2': {
      filters: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'sim_status', 'passwords', 'dti_done', 'is_on_system', 'synced_to_gpo', 'remark'],
      columns: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'address_full', 'latitude', 'longitude', 'sim_status', 'passwords', 'dti_done', 'is_on_system', 'synced_to_gpo', 'remark']
    },
    'Step 3': {
      filters: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'sim_status', 'passwords', 'dti_done', 'selfie_done', 'store_photo_done', 'is_on_system', 'synced_to_gpo', 'remark'],
      columns: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'address_full', 'latitude', 'longitude', 'sim_status', 'passwords', 'dti_done', 'selfie_done', 'store_photo_done', 'is_on_system', 'synced_to_gpo', 'remark']
    },
    'Fully Verified': {
      filters: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'dsp', 'store_name', 'sim_status', 'passwords', 'remark'],
      columns: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'address_full', 'sim_status', 'passwords', 'remark']
    },
    'Decommissioned': {
      filters: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'dsp', 'store_name', 'sim_status', 'passwords', 'remark'],
      columns: ['mobile_number', 'first_name', 'last_name', 'middle_name', 'id_type', 'progress_status', 'submitted_at', 'dsp', 'store_name', 'address_full', 'sim_status', 'passwords', 'remark']
    }
  };
  return configs[activeTab.value];
});

// --- Logic functions ---

let geocodeTimer: any = null;

const getStatusRestrictionInfo = (data: any) => {
  const hasBasic = data.mobile_number && data.first_name && data.last_name && 
                   data.id_type && data.submitted_at && data.dsp && data.store_name && 
                   data.address_full && data.latitude && data.longitude;

  const set1Met = !!(hasBasic && (data.sim_status === 'Ready' || data.sim_status === 'Pending'));
  const set2Met = !!(hasBasic && data.sim_status === 'Ready' && data.passwords && data.dti_done && data.is_on_system && data.synced_to_gpo);
  const set3Met = !!(set2Met && data.selfie_done && data.store_photo_done);

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
  const basicData = record.mobile_number && record.first_name && record.last_name && record.id_type;
  const step2Data = basicData && record.submitted_at && record.dsp && record.store_name && record.address_full && record.latitude && record.longitude;
  const step3Data = step2Data && record.passwords && record.dti_done && record.is_on_system && record.synced_to_gpo;
  const verifiedData = step3Data && record.selfie_done && record.store_photo_done;

  // 1. Terminal / Exception Statuses
  if (record.progress_status === 'Decommissioned' || record.progress_status === 'Disabled') {
    return 'Decommissioned';
  }

  // 2. Fully Verified - Destination for completed records
  if (record.progress_status === 'Fully Verified' || record.progress_status === 'Approved') {
    return 'Fully Verified';
  }

  // 3. Status-based routing (Workflow)
  // Logic: When a step is "Done", it moves to the NEXT subpage to await the next step actions.
  
  if (record.progress_status === 'Step 3 Done') {
    // Finished Step 3 tasks, moved to Fully Verified subpage for final verification
    return 'Fully Verified';
  }

  if (record.progress_status === 'Step 2 Done' || ['Step 3 Done', 'Approved'].includes(record.progress_status)) {
    // Completed Step 2, currently in Step 3 stage
    return 'Step 3';
  }

  if (record.progress_status === 'Step 1 Done') {
    // Completed Step 1, currently in Step 2 stage
    return 'Step 2';
  }

  if (record.progress_status === 'Pending' || record.progress_status === 'Ready for KYC') {
    return 'Step 1';
  }

  // 4. Data-driven fallbacks (if status is generic like 'Need Fix')
  if (verifiedData) return 'Fully Verified';
  if (step3Data) return 'Step 3';
  if (step2Data) return 'Step 2';
  if (basicData) return 'Step 1';

  return null;
};

// --- Computed ---
const countdownText = computed(() => {
  const info = getRemainingTime(formData.value.submitted_at);
  return info ? info.text : null;
});

const isExpired = computed(() => {
  const info = getRemainingTime(formData.value.submitted_at);
  return info ? info.isExpired : false;
});

const isPhoneNumberDuplicate = computed(() => {
  if (!formData.value.mobile_number) return false;
  return records.value.some(r => r.mobile_number === formData.value.mobile_number);
});

// --- Watchers ---
watch(() => isExpired.value, (newExpired) => {
  if (newExpired && formData.value.progress_status !== 'Ready for KYC' && formData.value.progress_status !== 'Decommissioned') {
    formData.value.progress_status = 'Ready for KYC';
  }
});

watch(() => editFormData.value?.submitted_at, (newDate) => {
  if (editFormData.value && newDate) {
    const info = getRemainingTime(newDate);
    if (info?.isExpired && editFormData.value.progress_status !== 'Ready for KYC' && editFormData.value.progress_status !== 'Decommissioned') {
      editFormData.value.progress_status = 'Ready for KYC';
    }
  }
});

watch(() => formData.value.address_full, (newVal) => {
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

watch(() => editFormData.value?.address_full, (newVal) => {
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
    if (filters.mobile_number && !record.mobile_number.includes(filters.mobile_number)) return false;
    if (filters.first_name && !record.first_name.toLowerCase().includes(filters.first_name.toLowerCase())) return false;
    if (filters.last_name && !record.last_name.toLowerCase().includes(filters.last_name.toLowerCase())) return false;
    if (filters.middle_name && !record.middle_name.toLowerCase().includes(filters.middle_name.toLowerCase())) return false;
    if (filters.id_type && record.id_type !== filters.id_type) return false;
    if (filters.progress_status && record.progress_status !== filters.progress_status) return false;
    if (filters.dsp && record.dsp !== filters.dsp) return false;
    if (filters.sim_status && record.sim_status !== filters.sim_status) return false;
    if (filters.store_name && !record.store_name.toLowerCase().includes(filters.store_name.toLowerCase())) return false;
    if (filters.remark && !record.remark.toLowerCase().includes(filters.remark.toLowerCase())) return false;
    if (filters.submitted_at && record.submitted_at !== filters.submitted_at) return false;
    if (filters.address_full && !record.address_full.toLowerCase().includes(filters.address_full.toLowerCase())) return false;
    if (filters.latitude && !record.latitude.includes(filters.latitude)) return false;
    if (filters.longitude && !record.longitude.includes(filters.longitude)) return false;
    if (filters.passwords && !record.passwords.includes(filters.passwords)) return false;
    
    // Checkbox filters
    if (filters.dti_done && !record.dti_done) return false;
    if (filters.selfie_done && !record.selfie_done) return false;
    if (filters.store_photo_done && !record.store_photo_done) return false;
    if (filters.is_on_system && !record.is_on_system) return false;
    if (filters.synced_to_gpo && !record.synced_to_gpo) return false;

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
      if (bulkFormData.id_type) updates.id_type = bulkFormData.id_type;
      if (bulkFormData.progress_status) updates.progress_status = bulkFormData.progress_status;
      if (bulkFormData.dsp) updates.dsp = bulkFormData.dsp;
      if (bulkFormData.sim_status) updates.sim_status = bulkFormData.sim_status;
      if (bulkFormData.passwords) updates.passwords = bulkFormData.passwords;
      if (bulkFormData.dti_done !== null) updates.dti_done = bulkFormData.dti_done;
      if (bulkFormData.selfie_done !== null) updates.selfie_done = bulkFormData.selfie_done;
      if (bulkFormData.store_photo_done !== null) updates.store_photo_done = bulkFormData.store_photo_done;
      if (bulkFormData.is_on_system !== null) updates.is_on_system = bulkFormData.is_on_system;
      if (bulkFormData.synced_to_gpo !== null) updates.synced_to_gpo = bulkFormData.synced_to_gpo;
      
      return updateAccount(record.id, { ...record, ...updates });
    });
    
    await Promise.all(promises);
    await fetchRecords();
    isBulkModalOpen.value = false;
    ElMessage.success(`Successfully updated ${selectedRecords.value.length} records`);
    selectedRecords.value = [];
    
    // Reset bulk form
    bulkFormData.id_type = '';
    bulkFormData.progress_status = '';
    bulkFormData.dsp = '';
    bulkFormData.sim_status = '';
    bulkFormData.passwords = '';
    bulkFormData.dti_done = null;
    bulkFormData.selfie_done = null;
    bulkFormData.store_photo_done = null;
    bulkFormData.is_on_system = null;
    bulkFormData.synced_to_gpo = null;
  } catch (e) {
    ElMessage.error('Failed to update records in bulk');
  } finally {
    isLoading.value = false;
  }
};

const checkAndAutoStatus = async (recordsList: AccountRecord[]) => {
  let updatedCount = 0;
  for (const record of recordsList) {
    const info = getRemainingTime(record.submitted_at);
    if (info?.isExpired && record.progress_status !== 'Ready for KYC' && record.progress_status !== 'Decommissioned') {
      try {
        await updateAccount(record.id, { ...record, progress_status: 'Ready for KYC' });
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
  const mandatoryFields = ['mobile_number', 'first_name', 'last_name', 'id_type', 'progress_status'];
  const missing = mandatoryFields.filter(f => !formData.value[f as keyof typeof formData.value]);
  if (missing.length > 0) {
    ElMessage.warning(`Please fill in all mandatory fields: ${missing.join(', ')}`);
    return;
  }

  if (isPhoneNumberDuplicate.value) {
    ElMessage.error('This mobile number is already in use for another account.');
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

const handleDeleteItem = async (row: AccountRecord) => {
  try {
    await ElMessageBox.confirm(
      t('pages.accountProgress.deleteConfirm'),
      t('common.warning'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    );
    await deleteAccount(row.id);
    ElMessage.success(t('pages.accountProgress.deleteSuccess'));
    fetchRecords();
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(t('pages.accountProgress.deleteError'));
    }
  }
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
  <div class="min-h-screen bg-[#f0f2f5] flex font-sans text-[#303133]">
    <!-- Sidebar -->
    <aside 
      class="bg-[#001529] border-r border-gray-200 transition-all duration-300 flex flex-col z-40"
      :class="[isSidebarOpen ? 'w-64' : 'w-20']"
    >
      <div class="p-6 flex items-center justify-between border-b border-[#002140] mb-6">
        <div v-if="isSidebarOpen" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-[#409eff] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 class="text-white" :size="18" />
          </div>
          <span class="font-bold text-white tracking-tight text-xl">ProgressHQ</span>
        </div>
        <button @click="isSidebarOpen = !isSidebarOpen" class="p-2 hover:bg-[#002140] rounded-lg text-gray-400">
          <Menu v-if="!isSidebarOpen" :size="20" />
          <X v-else :size="20" />
        </button>
      </div>

      <nav class="flex-1 px-2 space-y-1">
        <div v-if="isSidebarOpen" class="px-4 py-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Segmentation</div>
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group"
          :class="[activeTab === tab.id ? 'bg-[#409eff] text-white shadow-md shadow-blue-500/20' : 'text-gray-400 hover:bg-[#002140] hover:text-white']"
        >
          <component :is="tab.icon" :size="18" :class="[activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-white']" />
          <span v-if="isSidebarOpen" class="text-[13px] font-medium tracking-tight">{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div>
          <h1 class="text-xl font-bold text-[#1f2f3d] tracking-tight">Account Progress</h1>
        </div>

        <div class="flex items-center gap-2">
          <button 
            v-if="selectedRecords.length > 0"
            @click="isBulkModalOpen = true"
            class="px-4 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded text-[13px] font-medium flex items-center gap-2 transition-all"
          >
            <Edit2 :size="14" />
            {{ t('common.edit') }} ({{ selectedRecords.length }})
          </button>
          <button class="px-4 py-1.5 bg-[#409eff] text-white hover:bg-[#66b1ff] rounded text-[13px] font-medium flex items-center gap-2 transition-all">
            <FileUp :size="14" />
            {{ t('common.batchImport') }}
          </button>
          <button class="px-4 py-1.5 bg-[#67c23a] text-white hover:bg-[#85ce61] rounded text-[13px] font-medium flex items-center gap-2 transition-all">
            <FileDown :size="14" />
            {{ t('common.exportCsv') }}
          </button>
          <button @click="isAddModalOpen = true" class="px-4 py-1.5 bg-[#409eff] text-white rounded shadow-sm flex items-center gap-2 hover:bg-[#66b1ff] active:scale-95 transition-all text-[13px] font-medium">
            <Plus :size="14" />
            {{ t('common.create') }}
          </button>
        </div>
      </header>

      <!-- Content Area -->
      <div class="p-6 space-y-4">
        <!-- Filter Section -->
        <section class="bg-white rounded-md border border-gray-200 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <ListFilter class="text-[#409eff]" :size="18" />
              <h2 class="text-[14px] font-bold text-[#1f2f3d]">Deep Filter</h2>
            </div>
            <button @click="clearFilters" class="text-[#f56c6c] hover:text-[#f78989] text-[12px] font-medium flex items-center gap-1.5 transition-all">
              <RotateCcw :size="14" />
              {{ t('common.reset') }}
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 mb-6">
            <div v-if="isFilterFieldVisible('mobile_number')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.mobileNumber') }}</label>
              <el-input v-model="filters.mobile_number" placeholder="09XXXXXXXXX" />
            </div>
            <div v-if="isFilterFieldVisible('first_name')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.firstName') }}</label>
              <el-input v-model="filters.first_name" placeholder="First Name" />
            </div>
            <div v-if="isFilterFieldVisible('last_name')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.lastName') }}</label>
              <el-input v-model="filters.last_name" placeholder="Last Name" />
            </div>
            <div v-if="isFilterFieldVisible('middle_name')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.middleName') }}</label>
              <el-input v-model="filters.middle_name" placeholder="Middle Name" />
            </div>
            <div v-if="isFilterFieldVisible('id_type')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.idType') }}</label>
              <el-select v-model="filters.id_type" placeholder="Select ID Type" class="w-full" clearable>
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('progress_status')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.progressStatus') }}</label>
              <el-select v-model="filters.progress_status" placeholder="Select Status" class="w-full" clearable>
                <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('submitted_at')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.submittedAt') }}</label>
              <el-date-picker v-model="filters.submitted_at" type="date" value-format="YYYY-MM-DD" placeholder="dd/mm/yyyy" class="!w-full" />
            </div>
            <div v-if="isFilterFieldVisible('dsp')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.dsp') }}</label>
              <el-select v-model="filters.dsp" placeholder="Select DSP" class="w-full" clearable>
                <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('store_name')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.storeName') }}</label>
              <el-input v-model="filters.store_name" placeholder="Search store name" />
            </div>
            <div v-if="isFilterFieldVisible('address_full')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.addressFull') }}</label>
              <el-input v-model="filters.address_full" placeholder="Search address" />
            </div>
            <div v-if="isFilterFieldVisible('latitude')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.latitude') }}</label>
              <el-input v-model="filters.latitude" placeholder="Search latitude" />
            </div>
            <div v-if="isFilterFieldVisible('longitude')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.longitude') }}</label>
              <el-input v-model="filters.longitude" placeholder="Search longitude" />
            </div>
            <div v-if="isFilterFieldVisible('sim_status')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.simStatus') }}</label>
              <el-select v-model="filters.sim_status" placeholder="Select SIM Status" class="w-full" clearable>
                <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div v-if="isFilterFieldVisible('passwords')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('pages.accountProgress.passwords') }}</label>
              <el-input v-model="filters.passwords" placeholder="Search Password" />
            </div>
            <div v-if="isFilterFieldVisible('remark')" class="flex flex-col gap-1.5">
              <label class="text-[12px] font-medium text-[#606266]">{{ t('common.remark') }}</label>
              <el-input v-model="filters.remark" placeholder="Search remark" />
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <div class="flex flex-wrap gap-6">
              <el-checkbox v-if="isFilterFieldVisible('dti_done')" v-model="filters.dti_done" :label="t('pages.accountProgress.dti')" />
              <el-checkbox v-if="isFilterFieldVisible('selfie_done')" v-model="filters.selfie_done" :label="t('pages.accountProgress.selfie')" />
              <el-checkbox v-if="isFilterFieldVisible('store_photo_done')" v-model="filters.store_photo_done" :label="t('pages.accountProgress.storePhoto')" />
              <el-checkbox v-if="isFilterFieldVisible('is_on_system')" v-model="filters.is_on_system" :label="t('pages.accountProgress.onSystem')" />
              <el-checkbox v-if="isFilterFieldVisible('synced_to_gpo')" v-model="filters.synced_to_gpo" :label="t('pages.accountProgress.syncedToGpo')" />
            </div>
            <button class="px-8 py-2 bg-[#409eff] text-white rounded shadow-sm text-[13px] font-medium hover:bg-[#66b1ff] active:scale-95 transition-all">
              {{ t('common.search') }}
            </button>
          </div>
        </section>

        <!-- Table Card -->
        <section class="bg-white rounded-md border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
          <div class="flex-1 overflow-auto">
            <el-table 
              v-loading="isLoading"
              :data="filteredRecords" 
              style="width: 100%"
              class="custom-table"
              header-cell-class-name="custom-table-header"
              @selection-change="(val: any) => selectedRecords = val"
            >
              <el-table-column type="selection" width="55" fixed />
              
              <el-table-column type="selection" width="55" fixed />
              
              <el-table-column v-if="isColumnVisible('mobile_number')" prop="mobile_number" :label="t('pages.accountProgress.mobileNumber')" width="160" sortable>
                <template #default="{ row }">
                  <div class="text-sm font-bold text-gray-900 tracking-tight">{{ row.mobile_number }}</div>
                </template>
              </el-table-column>
              
              <el-table-column v-if="isColumnVisible('first_name')" prop="first_name" :label="t('pages.accountProgress.firstName')" width="140" sortable>
                <template #default="{ row }">
                  <span class="text-sm font-semibold text-gray-700">{{ row.first_name }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('last_name')" prop="last_name" :label="t('pages.accountProgress.lastName')" width="140" sortable>
                <template #default="{ row }">
                  <span class="text-sm font-semibold text-gray-700">{{ row.last_name }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('middle_name')" prop="middle_name" :label="t('pages.accountProgress.middleName')" width="140" sortable>
                <template #default="{ row }">
                  <span class="text-sm font-semibold text-gray-700">{{ row.middle_name }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('id_type')" prop="id_type" :label="t('pages.accountProgress.idType')" width="140" sortable>
                <template #default="{ row }">
                  <span class="text-[10px] font-black uppercase text-gray-400 tracking-wider">{{ row.id_type }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('progress_status')" prop="progress_status" :label="t('pages.accountProgress.progressStatus')" width="160" sortable>
                <template #default="{ row }">
                  <el-tag :type="getBadgeVariant(row.progress_status)" round effect="plain" class="!px-4 font-bold border-none bg-opacity-70">
                    {{ row.progress_status }}
                  </el-tag>
                </template>
              </el-table-column>

               <el-table-column v-if="isColumnVisible('submitted_at')" prop="submitted_at" :label="t('pages.accountProgress.submittedAt')" width="180" sortable>
                <template #default="{ row }">
                   <div class="flex flex-col">
                      <span class="text-xs font-bold text-gray-600">{{ row.submitted_at }}</span>
                      <span v-if="getRemainingTime(row.submitted_at)?.text" 
                            class="text-[9px] font-bold mt-0.5"
                            :class="getRemainingTime(row.submitted_at)?.isExpired ? 'text-rose-500' : 'text-amber-500'"
                      >
                        {{ getRemainingTime(row.submitted_at)?.text }}
                      </span>
                   </div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('dsp')" prop="dsp" :label="t('pages.accountProgress.dsp')" width="140" sortable>
                <template #default="{ row }">
                  <span class="text-sm font-black text-indigo-600">{{ row.dsp }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('store_name')" prop="store_name" :label="t('pages.accountProgress.storeName')" width="200">
                <template #default="{ row }">
                  <span class="text-xs font-bold text-gray-800">{{ row.store_name }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('address_full')" prop="address_full" :label="t('pages.accountProgress.addressFull')" width="280">
                <template #default="{ row }">
                  <span class="text-[10px] font-medium text-gray-400 italic truncate block w-full">{{ row.address_full }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('latitude')" prop="latitude" :label="t('pages.accountProgress.latitude')" width="140">
                <template #default="{ row }">
                  <span class="text-[10px] font-mono text-gray-400">{{ row.latitude }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('longitude')" prop="longitude" :label="t('pages.accountProgress.longitude')" width="140">
                <template #default="{ row }">
                  <span class="text-[10px] font-mono text-gray-400">{{ row.longitude }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('sim_status')" prop="sim_status" :label="t('pages.accountProgress.simStatus')" width="140" sortable>
                <template #default="{ row }">
                  <el-tag :type="getBadgeVariant(row.sim_status)" effect="dark" size="small" class="!px-3 !h-6 !text-[10px] font-black border-none">
                    {{ row.sim_status }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('passwords')" prop="passwords" :label="t('pages.accountProgress.passwords')" width="120">
                <template #default="{ row }">
                  <span class="text-xs font-mono font-bold text-gray-500">{{ row.passwords }}</span>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('documentation')" :label="t('pages.accountProgress.title')" width="220">
                <template #default="{ row }">
                   <div class="flex flex-wrap gap-2">
                      <div v-if="row.dti_done" class="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-100">
                        <CheckCircle2 :size="10" /> DTI
                      </div>
                      <div v-if="row.selfie_done" class="flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-600 rounded text-[9px] font-bold border border-sky-100">
                        <Users :size="10" /> SELFIE
                      </div>
                      <div v-if="row.store_photo_done" class="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded text-[9px] font-bold border border-amber-100">
                        <Building2 :size="10" /> STORE
                      </div>
                      <div v-if="row.is_on_system" class="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100">
                        <LayoutDashboard :size="10" /> SYS
                      </div>
                      <div v-if="row.synced_to_gpo" class="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded text-[9px] font-bold border border-purple-100">
                        <RotateCcw :size="10" /> GPO
                      </div>
                   </div>
                </template>
              </el-table-column>

              <el-table-column v-if="isColumnVisible('remark')" prop="remark" :label="t('common.remark')" min-width="180">
                <template #default="{ row }">
                  <span class="text-xs font-medium text-gray-500">{{ row.remark }}</span>
                </template>
              </el-table-column>

              <el-table-column :label="t('common.actions')" width="160" fixed="right">
                <template #default="{ row }">
                   <div class="flex items-center gap-2">
                      <button @click="handleEditRow(row)" class="text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all uppercase tracking-widest">
                        EDIT
                      </button>
                      <button @click="ElMessageBox.confirm('Delete this record?', 'Warning', { type: 'warning' }).then(() => deleteAccount(row.id)).then(() => fetchRecords())" class="text-[10px] font-black text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-all uppercase tracking-widest">
                        DELETE
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
      :title="t('common.create')"
      width="850px"
      class="custom-dialog"
      :close-on-click-modal="false"
    >
      <div class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-x-8 gap-y-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.mobileNumber') }} *</label>
              <el-input v-model="formData.mobile_number" placeholder="09XXXXXXXXX" :class="{'duplicate-input': isPhoneNumberDuplicate}" />
              <div v-if="isPhoneNumberDuplicate" class="mt-1 p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2">
                <AlertCircle class="text-rose-600" :size="12" />
                <span class="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Number already registered</span>
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.firstName') }} *</label>
              <el-input v-model="formData.first_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.lastName') }} *</label>
              <el-input v-model="formData.last_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.middleName') }}</label>
              <el-input v-model="formData.middle_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.idType') }} *</label>
              <el-select v-model="formData.id_type" class="w-full">
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.progressStatus') }} *</label>
              <el-select v-model="formData.progress_status" class="w-full">
                 <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" :disabled="isStatusDisabled(opt, formData)" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.submittedAt') }}</label>
              <el-date-picker v-model="formData.submitted_at" type="date" value-format="YYYY-MM-DD" class="w-full" />
              <div v-if="getRemainingTime(formData.submitted_at)?.text" class="mt-1 p-2 rounded text-[10px] font-bold flex items-center gap-1" :class="getRemainingTime(formData.submitted_at)?.isExpired ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'">
                <Clock :size="12" /> {{ getRemainingTime(formData.submitted_at)?.text }}
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.dsp') }}</label>
              <el-select v-model="formData.dsp" class="w-full" placeholder="Select DSP">
                 <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.storeName') }}</label>
              <el-input v-model="formData.store_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.simStatus') }}</label>
              <el-select v-model="formData.sim_status" class="w-full">
                 <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.addressFull') }}</label>
            <el-input v-model="formData.address_full" type="textarea" :rows="2" placeholder="Start typing address..." />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.latitude') }}</label>
              <el-input v-model="formData.latitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.longitude') }}</label>
              <el-input v-model="formData.longitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.passwords') }}</label>
              <el-input v-model="formData.passwords" placeholder="Password" />
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
             <el-checkbox v-model="formData.dti_done" :label="t('pages.accountProgress.dti')" />
             <el-checkbox v-model="formData.selfie_done" :label="t('pages.accountProgress.selfie')" />
             <el-checkbox v-model="formData.store_photo_done" :label="t('pages.accountProgress.storePhoto')" />
             <el-checkbox v-model="formData.is_on_system" :label="t('pages.accountProgress.onSystem')" />
             <el-checkbox v-model="formData.synced_to_gpo" :label="t('pages.accountProgress.syncedToGpo')" />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('common.remark') }}</label>
            <el-input v-model="formData.remark" type="textarea" :rows="3" />
          </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 px-8 py-6 bg-gray-50 border-t border-gray-100">
          <el-button @click="isAddModalOpen = false" class="!rounded-xl text-xs font-bold">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" class="!bg-indigo-600 !rounded-xl text-xs font-bold shadow-lg shadow-indigo-100" @click="handleSaveRecord">{{ t('common.save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="isEditModalOpen"
      :title="t('common.edit')"
      width="850px"
      class="custom-dialog"
      :before-close="handleCancelEdit"
    >
      <div v-if="editFormData" class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-x-8 gap-y-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.mobileNumber') }}</label>
              <el-input v-model="editFormData.mobile_number" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.firstName') }}</label>
              <el-input v-model="editFormData.first_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.lastName') }}</label>
              <el-input v-model="editFormData.last_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.middleName') }}</label>
              <el-input v-model="editFormData.middle_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.idType') }}</label>
              <el-select v-model="editFormData.id_type" class="w-full">
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.progressStatus') }}</label>
              <el-select v-model="editFormData.progress_status" class="w-full">
                 <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" :disabled="isStatusDisabled(opt, editFormData)" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.submittedAt') }}</label>
              <el-date-picker v-model="editFormData.submitted_at" type="date" value-format="YYYY-MM-DD" class="w-full" />
              <div v-if="getRemainingTime(editFormData.submitted_at)?.text" class="mt-1 p-2 rounded text-[10px] font-bold flex items-center gap-1" :class="getRemainingTime(editFormData.submitted_at)?.isExpired ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'">
                <Clock :size="12" /> {{ getRemainingTime(editFormData.submitted_at)?.text }}
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.dsp') }}</label>
              <el-select v-model="editFormData.dsp" class="w-full" placeholder="Select DSP">
                 <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.storeName') }}</label>
              <el-input v-model="editFormData.store_name" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.simStatus') }}</label>
              <el-select v-model="editFormData.sim_status" class="w-full">
                 <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.addressFull') }}</label>
            <el-input v-model="editFormData.address_full" type="textarea" :rows="2" />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.latitude') }}</label>
              <el-input v-model="editFormData.latitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.longitude') }}</label>
              <el-input v-model="editFormData.longitude" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.passwords') }}</label>
              <el-input v-model="editFormData.passwords" placeholder="Password" />
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
             <el-checkbox v-model="editFormData.dti_done" :label="t('pages.accountProgress.dti')" />
             <el-checkbox v-model="editFormData.selfie_done" :label="t('pages.accountProgress.selfie')" />
             <el-checkbox v-model="editFormData.store_photo_done" :label="t('pages.accountProgress.storePhoto')" />
             <el-checkbox v-model="editFormData.is_on_system" :label="t('pages.accountProgress.onSystem')" />
             <el-checkbox v-model="editFormData.synced_to_gpo" :label="t('pages.accountProgress.syncedToGpo')" />
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('common.remark') }}</label>
            <el-input v-model="editFormData.remark" type="textarea" :rows="3" />
          </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 px-8 py-6 bg-gray-50 border-t border-gray-100">
          <el-button @click="handleCancelEdit" class="!rounded-xl text-xs font-bold">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" class="!bg-indigo-600 !rounded-xl text-xs font-bold shadow-lg shadow-indigo-100" @click="handleSaveRow">{{ t('common.save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Bulk Edit Modal -->
    <el-dialog
      v-model="isBulkModalOpen"
      :title="t('pages.accountProgress.bulkUpdate')"
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
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.idType') }}</label>
            <el-select v-model="bulkFormData.id_type" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.progressStatus') }}</label>
            <el-select v-model="bulkFormData.progress_status" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in progressStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.dsp') }}</label>
            <el-select v-model="bulkFormData.dsp" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in dspOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('pages.accountProgress.simStatus') }}</label>
            <el-select v-model="bulkFormData.sim_status" class="w-full" clearable placeholder="No change">
              <el-option v-for="opt in simStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">DTI</span>
             <el-radio-group v-model="bulkFormData.dti_done" size="small">
               <el-radio-button :value="1">Yes</el-radio-button>
               <el-radio-button :value="0">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Selfie</span>
             <el-radio-group v-model="bulkFormData.selfie_done" size="small">
               <el-radio-button :value="1">Yes</el-radio-button>
               <el-radio-button :value="0">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Store</span>
             <el-radio-group v-model="bulkFormData.store_photo_done" size="small">
               <el-radio-button :value="1">Yes</el-radio-button>
               <el-radio-button :value="0">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">SYS</span>
             <el-radio-group v-model="bulkFormData.is_on_system" size="small">
               <el-radio-button :value="1">Yes</el-radio-button>
               <el-radio-button :value="0">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
           <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl col-span-2">
             <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Synced GPO</span>
             <el-radio-group v-model="bulkFormData.synced_to_gpo" size="small">
               <el-radio-button :value="1">Yes</el-radio-button>
               <el-radio-button :value="0">No</el-radio-button>
               <el-radio-button :value="null">None</el-radio-button>
             </el-radio-group>
           </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 px-8 py-6 bg-gray-50 border-t border-gray-100">
          <el-button @click="isBulkModalOpen = false" class="!rounded-xl text-xs font-bold">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" class="!bg-indigo-600 !rounded-xl text-xs font-bold shadow-lg shadow-indigo-100" @click="handleBulkUpdate">{{ t('common.update') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

:root {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.duplicate-input .el-input__wrapper {
  box-shadow: 0 0 0 1px #f43f5e inset !important;
  background-color: #fff1f2 !important;
}

.custom-table-header {
  background-color: #f5f7fa !important;
  color: #606266 !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.el-table {
  --el-table-header-bg-color: #f5f7fa;
  --el-table-border-color: #ebeef5;
}

.el-table .el-table__cell {
  padding: 12px 0 !important;
}

.el-button--primary {
  background-color: #409eff !important;
  border-color: #409eff !important;
}

.el-input__wrapper, .el-select__wrapper {
  box-shadow: 0 0 0 1px #dcdfe6 inset !important;
  border-radius: 4px !important;
}

.el-input__wrapper:hover, .el-select__wrapper:hover {
  box-shadow: 0 0 0 1px #c0c4cc inset !important;
}

.el-input__inner {
  font-size: 13px !important;
}
</style>
