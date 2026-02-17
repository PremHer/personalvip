// ===== Enums =====
export enum UserRole {
    ADMIN = 'ADMIN',
    OWNER = 'OWNER',
    TRAINER = 'TRAINER',
    RECEPTIONIST = 'RECEPTIONIST',
    CLIENT = 'CLIENT',
}

export enum MembershipStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    FROZEN = 'FROZEN',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    TRANSFER = 'TRANSFER',
}

export enum AttendanceMethod {
    QR = 'QR',
    MANUAL = 'MANUAL',
}

export enum AssetStatus {
    ACTIVE = 'ACTIVE',
    MAINTENANCE = 'MAINTENANCE',
    RETIRED = 'RETIRED',
}

// ===== DTOs =====
export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    user: UserProfile;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phone?: string;
}

export interface ClientDto {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    birthDate?: string;
    medicalNotes?: string;
    qrCode: string;
    photoUrl?: string;
    activeMembership?: MembershipDto | null;
    createdAt: string;
}

export interface CreateClientDto {
    name: string;
    email?: string;
    phone?: string;
    emergencyContact?: string;
    birthDate?: string;
    medicalNotes?: string;
}

export interface MembershipPlanDto {
    id: string;
    name: string;
    price: number;
    durationDays: number;
    description?: string;
    isActive: boolean;
}

export interface MembershipDto {
    id: string;
    clientId: string;
    planId: string;
    plan?: MembershipPlanDto;
    startDate: string;
    endDate: string;
    status: MembershipStatus;
    amountPaid: number;
}

export interface AttendanceDto {
    id: string;
    clientId: string;
    client?: ClientDto;
    checkIn: string;
    checkOut?: string;
    method: AttendanceMethod;
}

export interface CheckInDto {
    qrCode: string;
}

export interface CheckInResponse {
    success: boolean;
    message: string;
    client?: ClientDto;
    membership?: MembershipDto;
}

export interface ProductDto {
    id: string;
    name: string;
    barcode?: string;
    price: number;
    stock: number;
    category?: string;
    imageUrl?: string;
}

export interface SaleItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface CreateSaleDto {
    clientId?: string;
    items: SaleItemDto[];
    paymentMethod: PaymentMethod;
    discount?: number;
}

export interface SaleDto {
    id: string;
    clientId?: string;
    cashierId: string;
    total: number;
    paymentMethod: PaymentMethod;
    discount: number;
    items: SaleItemDto[];
    createdAt: string;
}

export interface DashboardDto {
    todayIncome: number;
    weekIncome: number;
    monthIncome: number;
    todayAttendance: number;
    activeMembers: number;
    expiringMemberships: number;
    lowStockProducts: number;
    recentSales: SaleDto[];
}

export interface DailyReportDto {
    date: string;
    totalIncome: number;
    totalSales: number;
    totalAttendance: number;
    cashAmount: number;
    cardAmount: number;
    transferAmount: number;
}

export interface AuditLogDto {
    id: string;
    userId: string;
    userName?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    createdAt: string;
}

export interface PhysicalProgressDto {
    id: string;
    clientId: string;
    recordDate: string;
    weightKg?: number;
    bodyFatPct?: number;
    muscleMassKg?: number;
    measurements?: Record<string, number>;
    notes?: string;
}

// ===== Pagination =====
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ===== API Response =====
export interface ApiResponse<T = void> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[];
}
