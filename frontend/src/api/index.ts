const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

export function getAssetUrl(pathStr?: string | null): string {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr;
  }
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${base}${cleanPath}`;
}

export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${hoursStr}:${minutes}:${seconds} ${period}`;
}

export function formatDateOnly(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTimeOnly(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes}:${seconds} ${period}`;
}

export async function fetchJson(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok && !data.duplicate) {
    throw new Error(data.error || 'حدث خطأ في الاتصال بالخادم');
  }
  return data;
}

export const api = {
  // System Health & Readiness
  getHealth: () => fetchJson('/health'),
  getReadiness: () => fetchJson('/ready'),
  resetDemoData: () => fetchJson('/demo/reset', { method: 'POST' }),

  // Dashboard
  getDashboardStats: () => fetchJson('/dashboard/stats'),

  // Transactions
  getTransactions: (params?: { direction?: string; search?: string; status?: string; batchId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson(`/transactions${query ? `?${query}` : ''}`);
  },
  getTransactionDetails: (id: string) => fetchJson(`/transactions/${id}`),
  createTransaction: (data: any) => fetchJson('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: any) => fetchJson(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Batches
  getBatches: (direction?: string) => fetchJson(`/batches${direction ? `?direction=${direction}` : ''}`),
  getBatchDetails: (id: string) => fetchJson(`/batches/${id}`),
  createBatch: (data: { name: string; direction: string; notes?: string }) => fetchJson('/batches', { method: 'POST', body: JSON.stringify(data) }),
  addTransactionsToBatch: (batchId: string, transactionIds: string[]) =>
    fetchJson(`/batches/${batchId}/transactions`, { method: 'POST', body: JSON.stringify({ transactionIds }) }),
  removeTransactionFromBatch: (batchId: string, txId: string) =>
    fetchJson(`/batches/${batchId}/transactions/${txId}`, { method: 'DELETE' }),
  mergeBatches: (data: { sourceBatchIds: string[]; newBatchName: string }) =>
    fetchJson('/batches/merge', { method: 'POST', body: JSON.stringify(data) }),
  splitBatch: (data: { sourceBatchId: string; transactionIdsToMove: string[]; newBatchName: string }) =>
    fetchJson('/batches/split', { method: 'POST', body: JSON.stringify(data) }),
  setBatchStatus: (batchId: string, status: 'OPEN' | 'CLOSED') =>
    fetchJson(`/batches/${batchId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Duplicates
  getDuplicates: () => fetchJson('/duplicates'),

  // OCR Uploads
  uploadOcrReceipt: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/ocr/upload`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },
  batchUploadOcr: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/ocr/batch-upload`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },

  // Reports
  getReportsSummary: (params?: { direction?: string; startDate?: string; endDate?: string; batchId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson(`/reports/summary${query ? `?${query}` : ''}`);
  },
  getExcelDownloadUrl: (params?: { direction?: string; startDate?: string; endDate?: string; batchId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return `${API_BASE}/reports/excel${query ? `?${query}` : ''}`;
  },

  // WhatsApp Simulator
  getWhatsAppConversations: () => fetchJson('/whatsapp/conversations'),
  getWhatsAppMessages: (convId: string) => fetchJson(`/whatsapp/conversations/${convId}/messages`),
  sendWhatsAppMessage: async (convId: string, text: string, imageFile?: File, batchId?: string) => {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (imageFile) formData.append('image', imageFile);
    if (batchId) formData.append('batchId', batchId);

    const res = await fetch(`${API_BASE}/whatsapp/conversations/${convId}/messages`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },
  sendWhatsAppBatchMessages: async (convId: string, imageFiles: File[]) => {
    const formData = new FormData();
    imageFiles.forEach(file => {
      formData.append('images', file);
    });

    const res = await fetch(`${API_BASE}/whatsapp/conversations/${convId}/batch-messages`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },
  getWhatsAppBatchStatus: (batchId: string) => fetchJson(`/whatsapp/batches/${batchId}/status`),
  retryWhatsAppJob: (jobId: string) => fetchJson(`/whatsapp/jobs/${jobId}/retry`, { method: 'POST' }),

  // Samples
  getSamples: () => fetchJson('/samples'),
};
