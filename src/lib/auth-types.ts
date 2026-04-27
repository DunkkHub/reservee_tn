import type { BusinessStatus, CategorySlug } from "@/lib/types";

export type UserRole = "customer" | "shop" | "admin";
export type AuthDeliveryChannel = "email" | "sms";

export interface AuthSessionUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  businessProfileId?: string | null;
  businessName?: string | null;
  businessStatus?: BusinessStatus | null;
  categorySlug?: CategorySlug | null;
  citySlug?: string | null;
  area?: string | null;
  createdAt?: string;
}

export interface AuthSession {
  user: AuthSessionUser;
  expiresAt: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface CustomerRegistrationInput {
  role: "customer";
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ShopRegistrationInput {
  role: "shop";
  name: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  categorySlug: CategorySlug;
  citySlug: string;
  area: string;
}

export type RegistrationInput = CustomerRegistrationInput | ShopRegistrationInput;
