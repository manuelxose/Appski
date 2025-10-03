/**
 * Admin Users Module - Type Definitions
 *
 * Interfaces y tipos para la gestión de usuarios
 */

/**
 * User base interface
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "user";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  avatar?: string;
  isVerified?: boolean;
}

/**
 * Form data para crear/editar usuarios
 */
export interface UserFormData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive" | "suspended";
}

/**
 * Estadísticas de usuarios
 */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  suspended?: number;
  verificationPending?: number;
}

/**
 * User creation request
 */
export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive" | "suspended";
}

/**
 * User update request
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: "active" | "inactive" | "suspended";
}
