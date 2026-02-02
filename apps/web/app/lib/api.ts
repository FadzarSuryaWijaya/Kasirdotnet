// API client helper with authentication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  role: string;
  name: string;
}

interface CategoryDto {
  id: string;
  name: string;
  iconPreset?: string;
  iconCustom?: string;
  isActive: boolean;
}

interface CreateCategoryDto {
  name: string;
  iconPreset?: string;
  iconCustom?: string;
}

interface ProductDto {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
}

interface CreateProductDto {
  name: string;
  categoryId: string;
  price: number;
  imageUrl?: string;
  isActive?: boolean;
}

interface UpdateProductDto {
  name: string;
  categoryId: string;
  price: number;
  imageUrl?: string;
}

interface UpdateProductActiveDto {
  isActive: boolean;
}

interface TransactionItemRequest {
  productId: string;
  qty: number;
}

// Discount type: 0 = Nominal (fixed Rp), 1 = Percent (%)
// Must match backend enum: DiscountType { Nominal = 0, Percent = 1 }
type DiscountType = 'nominal' | 'percent';

// Numeric enum values for API requests
const DiscountTypeValue = {
  nominal: 0,
  percent: 1,
} as const;

interface CreateTransactionRequest {
  items: TransactionItemRequest[];
  discount: number;
  discountType: DiscountType;  // 'nominal' or 'percent' (converted to 0/1 for API)
  tax: number;
  paymentMethod: string;
  paidAmount: number;
  notes?: string;
}

interface TransactionItemResponse {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface TransactionResponse {
  id: string;
  cashierId: string;
  invoiceNo: string;
  cashierName: string;
  createdAt: string;
  businessDate: string; // YYYY-MM-DD format
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  notes?: string;
  status: string;
  voidedAt?: string;
  voidedByName?: string;
  voidReason?: string;
  items: TransactionItemResponse[];
}

interface TransactionListItemResponse {
  id: string;
  invoiceNo: string;
  cashierName: string;
  createdAt: string;
  businessDate: string; // YYYY-MM-DD format for filtering
  total: number;
  paymentMethod: string;
  itemCount: number;
  status: string;
}

interface TransactionListResponse {
  items: TransactionListItemResponse[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

interface VoidTransactionRequest {
  reason: string;
}

interface VoidedTransactionResponse {
  id: string;
  invoiceNo: string;
  cashierName: string;
  total: number;
  createdAt: string;
  voidedAt?: string;
  voidedByName?: string;
  voidReason?: string;
}

// Helper to get token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

// Helper to set token
function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
}

// Helper to clear token
function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
}

// Wrapper for API calls with auth header
async function apiCall<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle Unauthorized (401) globally
  if (response.status === 401) {
    clearAuthToken(); // Remove the invalid token
    if (typeof window !== 'undefined') {
      window.location.href = '/login'; // Force redirect to login
    }
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || error.details || error.title || errorMessage;
      } else {
        const text = await response.text();
        errorMessage = text || response.statusText || errorMessage;
      }
    } catch (parseError) {
      console.warn('Failed to parse error response:', parseError);
      errorMessage = response.statusText || errorMessage;
    }
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      message: errorMessage,
      endpoint,
      method,
    });
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Expected JSON response for ${endpoint}, but got ${contentType}`);
      return {} as T;
    }
    return response.json();
  } catch (parseError) {
    console.error('Failed to parse response JSON:', parseError);
    throw new Error(`Failed to parse response from ${endpoint}`);
  }
}

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiCall<LoginResponse>('/api/auth/login', 'POST', credentials);
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },

  logout: (): void => {
    clearAuthToken();
  },

  isAuthenticated: (): boolean => {
    return !!getAuthToken();
  },

  getToken: (): string | null => {
    return getAuthToken();
  },
};

// Categories API
export const categoriesApi = {
  getAll: async (): Promise<CategoryDto[]> => {
    return apiCall<CategoryDto[]>('/api/categories', 'GET');
  },

  create: async (data: CreateCategoryDto): Promise<CategoryDto> => {
    return apiCall<CategoryDto>('/api/categories', 'POST', data);
  },

  update: async (id: string, data: CreateCategoryDto): Promise<void> => {
    return apiCall<void>(`/api/categories/${id}`, 'PUT', data);
  },

  delete: async (id: string): Promise<void> => {
    return apiCall<void>(`/api/categories/${id}`, 'DELETE');
  },
};

// Products API
export const productsApi = {
  getAll: async (
    search?: string,
    categoryId?: string,
    active?: boolean
  ): Promise<ProductDto[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (active !== undefined) params.append('active', String(active));

    const queryString = params.toString();
    const endpoint = queryString ? `/api/products?${queryString}` : '/api/products';

    return apiCall<ProductDto[]>(endpoint, 'GET');
  },

  getById: async (id: string): Promise<ProductDto> => {
    return apiCall<ProductDto>(`/api/products/${id}`, 'GET');
  },

  create: async (data: CreateProductDto): Promise<ProductDto> => {
    return apiCall<ProductDto>('/api/products', 'POST', data);
  },

  update: async (id: string, data: UpdateProductDto): Promise<void> => {
    return apiCall<void>(`/api/products/${id}`, 'PUT', data);
  },

  updateActive: async (id: string, isActive: boolean): Promise<void> => {
    return apiCall<void>(`/api/products/${id}/active`, 'PATCH', { isActive });
  },

  delete: async (id: string): Promise<void> => {
    return apiCall<void>(`/api/products/${id}`, 'DELETE');
  },
};

// POS API
export const posApi = {
  getProducts: async (search?: string, categoryId?: string): Promise<ProductDto[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/pos/products?${queryString}` : '/api/pos/products';

    return apiCall<ProductDto[]>(endpoint, 'GET');
  },
};

// Transactions API
export const transactionsApi = {
  create: async (data: CreateTransactionRequest): Promise<TransactionResponse> => {
    // Convert discountType string to numeric enum value for backend
    const payload = {
      ...data,
      discountType: DiscountTypeValue[data.discountType],
    };
    return apiCall<TransactionResponse>('/api/transactions', 'POST', payload);
  },

  getById: async (id: string): Promise<TransactionResponse> => {
    return apiCall<TransactionResponse>(`/api/transactions/${id}`, 'GET');
  },

  list: async (
    page: number = 1,
    pageSize: number = 20,
    dateFrom?: string,
    dateTo?: string,
    mine: boolean = true
  ): Promise<TransactionListResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    params.append('mine', String(mine));
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const queryString = params.toString();
    return apiCall<TransactionListResponse>(`/api/transactions?${queryString}`, 'GET');
  },

  void: async (id: string, reason: string): Promise<{ message: string; transactionId: string; invoiceNo: string; status: string }> => {
    return apiCall<{ message: string; transactionId: string; invoiceNo: string; status: string }>(`/api/transactions/${id}/void`, 'POST', { reason });
  },

  getVoided: async (
    page: number = 1,
    pageSize: number = 20,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ items: VoidedTransactionResponse[]; total: number; page: number; pageSize: number; pages: number }> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return apiCall<{ items: VoidedTransactionResponse[]; total: number; page: number; pageSize: number; pages: number }>(`/api/transactions/voided?${params}`, 'GET');
  },
};

interface PaymentMethodSummary {
  method: string;
  amount: number;
  count: number;
}

interface ProductSoldSummary {
  productId: string;
  productName: string;
  qtySold: number;
  totalSales: number;
}

interface HourlySalesSummary {
  hour: number;
  amount: number;
  count: number;
}

interface TransactionSummary {
  id: string;
  invoiceNo: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  cashierName: string;
  itemCount: number;
}

interface DailyReportResponse {
  date: string;
  totalSales: number;
  totalTransactions: number;
  totalItemsSold: number;
  totalQty: number;
  totalDiscount: number;
  totalTax: number;
  byPaymentMethod: PaymentMethodSummary[];
  topProducts: ProductSoldSummary[];
  hourlySales: HourlySalesSummary[];
  transactions: TransactionSummary[];
  isClosed: boolean;
  closure?: DailyClosureInfo;
  previousDaySales?: number;
  salesChange?: number;
}

interface DailyClosureInfo {
  closedByName: string;
  closedAt: string;
  physicalCashCount: number;
  cashDifference: number;
  notes?: string;
}

interface ClosureStatusResponse {
  isClosed: boolean;
  closure?: DailyClosureResponse;
  systemCashTotal: number;
  systemQrisTotal: number;
  systemTotalSales: number;
  totalTransactions: number;
  firstTransactionAt?: string;
  lastTransactionAt?: string;
  openSessions: OpenSessionInfo[];
}

interface OpenSessionInfo {
  sessionId: string;
  cashierName: string;
  startTime: string;
}

interface DailyClosureResponse {
  id: string;
  date: string;
  closedByName: string;
  closedAt: string;
  systemCashTotal: number;
  systemQrisTotal: number;
  systemTotalSales: number;
  totalTransactions: number;
  physicalCashCount: number;
  cashDifference: number;
  openedAt?: string;
  lastTransactionAt?: string;
  notes?: string;
}

interface CloseDayRequest {
  date: string;
  physicalCashCount: number;
  notes?: string;
}

export const reportsApi = {
  getSummary: async (): Promise<any> => {
    return apiCall<any>('/api/reports/summary', 'GET');
  },

  getDailyReport: async (date?: string): Promise<DailyReportResponse> => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    const queryString = params.toString();
    return apiCall<DailyReportResponse>(`/api/reports/daily?${queryString}`, 'GET');
  },

  getClosureStatus: async (date?: string): Promise<ClosureStatusResponse> => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return apiCall<ClosureStatusResponse>(`/api/reports/closure-status?${params}`, 'GET');
  },

  closeDay: async (data: CloseDayRequest): Promise<DailyClosureResponse> => {
    return apiCall<DailyClosureResponse>('/api/reports/close-day', 'POST', data);
  },

  reopenDay: async (closureId: string): Promise<void> => {
    return apiCall<void>(`/api/reports/closure/${closureId}`, 'DELETE');
  },
};

// Held Orders types
interface HeldOrderCartItem {
  productId: string;
  productName: string;
  price: number;
  qty: number;
}

interface CreateHeldOrderRequest {
  customerName?: string;
  notes?: string;
  items: HeldOrderCartItem[];
  discount: number;
  discountType: string;
}

interface HeldOrderResponse {
  id: string;
  cashierId: string;
  cashierName: string;
  customerName?: string;
  notes?: string;
  items: HeldOrderCartItem[];
  discount: number;
  discountType: string;
  subtotal: number;
  createdAt: string;
}

// Held Orders API
export const heldOrdersApi = {
  list: async (): Promise<HeldOrderResponse[]> => {
    return apiCall<HeldOrderResponse[]>('/api/held-orders', 'GET');
  },

  create: async (data: CreateHeldOrderRequest): Promise<HeldOrderResponse> => {
    return apiCall<HeldOrderResponse>('/api/held-orders', 'POST', data);
  },

  getById: async (id: string): Promise<HeldOrderResponse> => {
    return apiCall<HeldOrderResponse>(`/api/held-orders/${id}`, 'GET');
  },

  delete: async (id: string): Promise<void> => {
    return apiCall<void>(`/api/held-orders/${id}`, 'DELETE');
  },
};

// Cashier Session types
interface CashierSessionResponse {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash: number;
  expectedCash: number;
  difference: number;
  totalSales: number;
  totalCash: number;
  totalNonCash: number;
  totalTransactions: number;
  status: string;
  notes?: string;
}

interface ActiveSessionResponse {
  hasActiveSession: boolean;
  session?: CashierSessionResponse;
}

interface StartSessionRequest {
  openingCash: number;
}

interface EndSessionRequest {
  closingCash: number;
  notes?: string;
}

// Sessions API
export const sessionsApi = {
  getActive: async (): Promise<ActiveSessionResponse> => {
    return apiCall<ActiveSessionResponse>('/api/sessions/active', 'GET');
  },

  start: async (data: StartSessionRequest): Promise<CashierSessionResponse> => {
    return apiCall<CashierSessionResponse>('/api/sessions/start', 'POST', data);
  },

  end: async (data: EndSessionRequest): Promise<CashierSessionResponse> => {
    return apiCall<CashierSessionResponse>('/api/sessions/end', 'POST', data);
  },

  list: async (dateFrom?: string, dateTo?: string, cashierId?: string): Promise<CashierSessionResponse[]> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (cashierId) params.append('cashierId', cashierId);
    return apiCall<CashierSessionResponse[]>(`/api/sessions?${params}`, 'GET');
  },

  getById: async (id: string): Promise<CashierSessionResponse> => {
    return apiCall<CashierSessionResponse>(`/api/sessions/${id}`, 'GET');
  },
};

// User Management types
interface UserResponse {
  id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  role: string;
}

interface UpdateUserRequest {
  name: string;
  role: string;
  isActive: boolean;
}

// Users API
export const usersApi = {
  getAll: async (role?: string): Promise<UserResponse[]> => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    return apiCall<UserResponse[]>(`/api/users?${params}`, 'GET');
  },

  getById: async (id: string): Promise<UserResponse> => {
    return apiCall<UserResponse>(`/api/users/${id}`, 'GET');
  },

  create: async (data: CreateUserRequest): Promise<UserResponse> => {
    return apiCall<UserResponse>('/api/users', 'POST', data);
  },

  update: async (id: string, data: UpdateUserRequest): Promise<UserResponse> => {
    return apiCall<UserResponse>(`/api/users/${id}`, 'PUT', data);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    return apiCall<void>(`/api/users/${id}/reset-password`, 'POST', { newPassword });
  },

  toggleActive: async (id: string): Promise<{ isActive: boolean }> => {
    return apiCall<{ isActive: boolean }>(`/api/users/${id}/toggle-active`, 'PATCH');
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/api/users/${id}`, 'DELETE');
  },
};

// Stock Management types
interface ProductStockResponse {
  id: string;
  name: string;
  categoryName: string;
  stock: number;
  trackStock: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

interface StockSummaryResponse {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  products: ProductStockResponse[];
}

interface StockHistoryResponse {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference?: string;
  notes?: string;
  userName?: string;
  createdAt: string;
}

// Stock API
export const stockApi = {
  getSummary: async (lowStockOnly?: boolean): Promise<StockSummaryResponse> => {
    const params = new URLSearchParams();
    if (lowStockOnly) params.append('lowStockOnly', 'true');
    return apiCall<StockSummaryResponse>(`/api/stock?${params}`, 'GET');
  },

  restock: async (productId: string, quantity: number, notes?: string): Promise<{ stock: number }> => {
    return apiCall<{ stock: number }>(`/api/stock/${productId}/restock`, 'POST', { quantity, notes });
  },

  adjust: async (productId: string, quantity: number, notes?: string): Promise<{ stock: number }> => {
    return apiCall<{ stock: number }>(`/api/stock/${productId}/adjust`, 'POST', { quantity, notes });
  },

  setStock: async (productId: string, newStock: number, notes?: string): Promise<{ stock: number }> => {
    return apiCall<{ stock: number }>(`/api/stock/${productId}/set`, 'POST', { newStock, notes });
  },

  getProductHistory: async (productId: string, limit?: number): Promise<StockHistoryResponse[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return apiCall<StockHistoryResponse[]>(`/api/stock/${productId}/history?${params}`, 'GET');
  },

  getAllHistory: async (limit?: number, type?: string): Promise<StockHistoryResponse[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (type) params.append('type', type);
    return apiCall<StockHistoryResponse[]>(`/api/stock/history?${params}`, 'GET');
  },
};

// Cash Drawer types
interface CashDrawerSummaryResponse {
  currentBalance: number;
  todayCashIn: number;
  todayCashOut: number;
  todayAdjustments: number;
  activeSessions: number;
  lastUpdated: string;
}

interface CashDrawerHistoryResponse {
  id: string;
  movementType: string;
  movementLabel: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  userName?: string;
  createdAt: string;
}

// Cash Drawer API
export const cashDrawerApi = {
  getSummary: async (): Promise<CashDrawerSummaryResponse> => {
    return apiCall<CashDrawerSummaryResponse>('/api/cash-drawer', 'GET');
  },

  getHistory: async (dateFrom?: string, dateTo?: string, limit?: number): Promise<CashDrawerHistoryResponse[]> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (limit) params.append('limit', limit.toString());
    return apiCall<CashDrawerHistoryResponse[]>(`/api/cash-drawer/history?${params}`, 'GET');
  },

  adjust: async (amount: number, notes: string): Promise<{ message: string; balance: number }> => {
    return apiCall<{ message: string; balance: number }>('/api/cash-drawer/adjust', 'POST', { amount, notes });
  },

  withdraw: async (amount: number, notes: string): Promise<{ message: string; balance: number }> => {
    return apiCall<{ message: string; balance: number }>('/api/cash-drawer/withdraw', 'POST', { amount, notes });
  },

  deposit: async (amount: number, notes: string): Promise<{ message: string; balance: number }> => {
    return apiCall<{ message: string; balance: number }>('/api/cash-drawer/deposit', 'POST', { amount, notes });
  },

  setBalance: async (amount: number, notes?: string): Promise<{ message: string; balance: number }> => {
    return apiCall<{ message: string; balance: number }>('/api/cash-drawer/set-balance', 'POST', { amount, notes });
  },
};

// Upload types
interface UploadStatsResponse {
  totalFiles: number;
  maxLimit: number;
  usage: string;
  totalSizeBytes: number;
  totalSizeMB: number;
  files: Array<{
    name: string;
    sizeBytes: number;
    sizeMB: number;
    createdAt: string;
    url: string;
  }>;
}

// Upload API
export const uploadApi = {
  uploadImage: async (file: File): Promise<{ imageUrl: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  deleteImage: async (imageUrl: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/api/upload/image?imageUrl=${encodeURIComponent(imageUrl)}`, 'DELETE');
  },

  getStats: async (): Promise<UploadStatsResponse> => {
    return apiCall<UploadStatsResponse>('/api/upload/stats', 'GET');
  },
};

export type {
  LoginRequest,
  LoginResponse,
  CategoryDto,
  CreateCategoryDto,
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductActiveDto,
  TransactionItemRequest,
  CreateTransactionRequest,
  DiscountType,
  TransactionItemResponse,
  TransactionResponse,
  TransactionListItemResponse,
  TransactionListResponse,
  VoidTransactionRequest,
  VoidedTransactionResponse,
  DailyReportResponse,
  PaymentMethodSummary,
  ProductSoldSummary,
  HourlySalesSummary,
  TransactionSummary,
  DailyClosureInfo,
  ClosureStatusResponse,
  DailyClosureResponse,
  CloseDayRequest,
  HeldOrderCartItem,
  CreateHeldOrderRequest,
  HeldOrderResponse,
  CashierSessionResponse,
  ActiveSessionResponse,
  StartSessionRequest,
  EndSessionRequest,
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ProductStockResponse,
  StockSummaryResponse,
  StockHistoryResponse,
  CashDrawerSummaryResponse,
  CashDrawerHistoryResponse,
  UploadStatsResponse,
};
