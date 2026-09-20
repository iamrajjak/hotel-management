import { apiClient, ApiResponse } from './client';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  fullName: string;
  email: string;
  hotelId?: string;
  hotelName?: string;
  role: string;
  isSuperAdmin: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  timezone: string;
  gstNumber?: string;
  taxRate?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  upiId?: string;
  status: string;
  wifiName?: string;
  wifiPassword?: string;
  reviewUrl?: string;
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  maxAdults: number;
  maxChildren: number;
  bedType: string;
  roomSize?: string;
  amenitiesJson: string;
  status: string;
}

export interface Room {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  roomNumber: string;
  floor: string;
  price: number;
  status: 'Available' | 'Reserved' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'OutOfOrder';
  notes?: string;
}

export interface Reservation {
  id: string;
  hotelId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  bookingStatus: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow';
  bookingSource: string;
  specialRequest?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  hotelId: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  idType?: string;
  idNumber?: string;
  idDocumentUrl?: string;
  notes?: string;
  totalStays: number;
  totalSpent: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  hotelId: string;
  reservationId: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: 0 | 1 | 2 | 3 | 4 | 5;
  transactionId?: string;
  paymentStatus: string;
  paymentDate: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  hotelId: string;
  reservationId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  invoiceNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  status: string;
  issuedAt: string;
  payments: Payment[];
}

export interface PosMenuItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
}

export interface PosCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  menuItems: PosMenuItem[];
}

export interface PosOrderItem {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface PosOrder {
  id: string;
  orderNumber: string;
  reservationId?: string;
  roomNumber?: string;
  guestName?: string;
  tableNumber?: string;
  orderType: string;
  subtotal: number;
  tax: number;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  orderItems: PosOrderItem[];
}

export interface HousekeepingTask {
  id: string;
  hotelId: string;
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  assignedTo?: string;
  taskType: string;
  priority: string;
  status: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface InventoryItem {
  id: string;
  hotelId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  isLowStock: boolean;
  lastRestockedAt?: string;
  createdAt: string;
}

export interface CalendarBookingEvent {
  reservationId: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
}

export interface CalendarRoomRow {
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  floor: string;
  roomStatus: string;
  price: number;
  bookings: CalendarBookingEvent[];
}

export interface CalendarMatrixResponse {
  startDate: string;
  endDate: string;
  roomRows: CalendarRoomRow[];
}

// AUTH API SERVICES
export const authApi = {
  login: (data: any) => apiClient<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  registerHotel: (data: any) => apiClient<AuthResponse>('/auth/register-hotel', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data: { email: string; targetRole: string; newPassword: string }) => apiClient<boolean>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiClient<User>('/auth/me'),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    }
  }
};

// HOTEL API SERVICES
export const hotelApi = {
  getCurrentHotel: () => apiClient<Hotel>('/hotels/current'),
  updateHotel: (data: Partial<Hotel>) => apiClient<Hotel>('/hotels/current', { method: 'PUT', body: JSON.stringify(data) }),
  getHotelBySlug: (slug: string) => apiClient<Hotel>(`/hotels/public/${slug}`),
  getAllHotels: () => apiClient<Hotel[]>('/hotels/all'),
  getPendingHotels: () => apiClient<Hotel[]>('/hotels/pending-approvals'),
  approveHotel: (id: string) => apiClient<boolean>(`/hotels/${id}/approve`, { method: 'POST' }),
  rejectHotel: (id: string) => apiClient<boolean>(`/hotels/${id}/reject`, { method: 'POST' }),
  suspendHotel: (id: string) => apiClient<boolean>(`/hotels/${id}/suspend`, { method: 'POST' }),
  deleteHotel: (id: string) => apiClient<boolean>(`/hotels/${id}`, { method: 'DELETE' }),
};

// ROOM API SERVICES
export const roomApi = {
  getRooms: () => apiClient<Room[]>('/rooms'),
  createRoom: (data: any) => apiClient<Room>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  deleteRoom: (roomId: string) => apiClient<boolean>(`/rooms/${roomId}`, { method: 'DELETE' }),
  getRoomTypes: () => apiClient<RoomType[]>('/rooms/types'),
  createRoomType: (data: any) => apiClient<RoomType>('/rooms/types', { method: 'POST', body: JSON.stringify(data) }),
  updateRoomStatus: (roomId: string, status: string, notes?: string) =>
    apiClient<Room>(`/rooms/${roomId}/status`, { method: 'PUT', body: JSON.stringify({ status, notes }) }),
  getAvailability: (checkIn: string, checkOut: string, adults: number = 1, children: number = 0) =>
    apiClient<Room[]>(`/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`),
};

// RESERVATION API SERVICES
export const reservationApi = {
  getReservations: () => apiClient<Reservation[]>('/reservations'),
  getReservationById: (id: string) => apiClient<Reservation>(`/reservations/${id}`),
  createReservation: (data: any) => apiClient<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  createPublicReservation: (data: any) => apiClient<Reservation>('/reservations/public', { method: 'POST', body: JSON.stringify(data) }),
  checkIn: (id: string) => apiClient<Reservation>(`/reservations/${id}/check-in`, { method: 'POST' }),
  checkOut: (id: string) => apiClient<Reservation>(`/reservations/${id}/check-out`, { method: 'POST' }),
  cancel: (id: string) => apiClient<Reservation>(`/reservations/${id}/cancel`, { method: 'POST' }),
  deleteReservation: (id: string) => apiClient<boolean>(`/reservations/${id}`, { method: 'DELETE' }),
};

export const reservationsApi = reservationApi;

// CUSTOMER CRM API SERVICES
export const customerApi = {
  getCustomers: () => apiClient<Customer[]>('/customers'),
  getCustomerById: (id: string) => apiClient<Customer>(`/customers/${id}`),
  createCustomer: (data: any) => apiClient<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => apiClient<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => apiClient<boolean>(`/customers/${id}`, { method: 'DELETE' }),
};

// CALENDAR API SERVICES
export const calendarApi = {
  getCalendar: (startDate?: string, endDate?: string) =>
    apiClient<CalendarMatrixResponse>(`/calendar?startDate=${startDate || ''}&endDate=${endDate || ''}`),
};

// INVOICE API SERVICES
export const invoiceApi = {
  getInvoices: () => apiClient<Invoice[]>('/invoices'),
  getInvoiceById: (id: string) => apiClient<Invoice>(`/invoices/${id}`),
  getInvoiceByReservationId: (reservationId: string) => apiClient<any>(`/invoices/reservation/${reservationId}`),
  getPrintInvoiceUrl: (reservationId: string) => `http://localhost:5000/api/invoices/reservation/${reservationId}/print`,
};

// PAYMENT API SERVICES
export const paymentApi = {
  getPayments: () => apiClient<Payment[]>('/payments'),
  recordPayment: (data: any) => apiClient<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  createRazorpayOrder: (reservationId: string, amount: number) =>
    apiClient<any>('/payments/razorpay/create-order', { method: 'POST', body: JSON.stringify({ reservationId, amount }) }),
  verifyRazorpay: (data: any) => apiClient<Payment>('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(data) }),
};

// POS & KOT API SERVICES
export const posApi = {
  getMenu: () => apiClient<PosCategory[]>('/pos/menu'),
  getOrders: () => apiClient<PosOrder[]>('/pos/orders'),
  createOrder: (data: any) => apiClient<PosOrder>('/pos/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id: string, status: string) =>
    apiClient<PosOrder>(`/pos/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(status) }),
  createMenuItem: (data: any) => apiClient<PosMenuItem>('/pos/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: string, data: any) => apiClient<PosMenuItem>(`/pos/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuItem: (id: string) => apiClient<boolean>(`/pos/menu/items/${id}`, { method: 'DELETE' }),
};

// HOUSEKEEPING API SERVICES
export const housekeepingApi = {
  getTasks: () => apiClient<HousekeepingTask[]>('/housekeeping'),
  createTask: (data: any) => apiClient<HousekeepingTask>('/housekeeping', { method: 'POST', body: JSON.stringify(data) }),
  completeTask: (id: string) => apiClient<HousekeepingTask>(`/housekeeping/${id}/complete`, { method: 'POST' }),
};

// INVENTORY API SERVICES
export const inventoryApi = {
  getItems: () => apiClient<InventoryItem[]>('/inventory'),
  createItem: (data: any) => apiClient<InventoryItem>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  restockItem: (id: string, additionalQuantity: number) =>
    apiClient<InventoryItem>(`/inventory/${id}/restock`, { method: 'POST', body: JSON.stringify({ additionalQuantity }) }),
};

// EXPENSE API SERVICES
export const expenseApi = {
  getExpenses: (startDate?: string, endDate?: string) =>
    apiClient<any[]>(`/expenses?startDate=${startDate || ''}&endDate=${endDate || ''}`),
  createExpense: (data: any) => apiClient<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => apiClient<boolean>(`/expenses/${id}`, { method: 'DELETE' }),
};

// STAFF API SERVICES
export const staffApi = {
  getStaff: () => apiClient<any[]>('/staff'),
  createStaff: (data: any) => apiClient<any>('/staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => apiClient<boolean>(`/staff/${id}`, { method: 'DELETE' }),
  getAttendance: (date?: string, staffId?: string) => apiClient<any[]>(`/staff/attendance?date=${date || ''}&staffId=${staffId || ''}`),
  recordAttendance: (data: any) => apiClient<any>('/staff/attendance', { method: 'POST', body: JSON.stringify(data) }),
  getMonthlySummary: (month?: number, year?: number) => apiClient<any[]>(`/staff/attendance/monthly-summary?month=${month || ''}&year=${year || ''}`),
};

// REPORT API SERVICES
export const reportApi = {
  getPnlReport: (startDate?: string, endDate?: string) =>
    apiClient<any>(`/reports/pnl?startDate=${startDate || ''}&endDate=${endDate || ''}`),
  getStaffReport: (startDate?: string, endDate?: string) =>
    apiClient<any>(`/reports/staff?startDate=${startDate || ''}&endDate=${endDate || ''}`),
  getOccupancyReport: (startDate?: string, endDate?: string) =>
    apiClient<any>(`/reports/occupancy?startDate=${startDate || ''}&endDate=${endDate || ''}`),
  getRestaurantReport: (startDate?: string, endDate?: string) =>
    apiClient<any>(`/reports/restaurant?startDate=${startDate || ''}&endDate=${endDate || ''}`),
  getBookingReport: (startDate?: string, endDate?: string) =>
    apiClient<any>(`/reports/bookings?startDate=${startDate || ''}&endDate=${endDate || ''}`),
};

