export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
}

export interface Company {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  taxId: string;
  logo?: string; // data URL
}

export interface Customer {
  name: string;
  company?: string;
  address: string;
  email: string;
  phone: string;
}

export type Template = "modern" | "corporate" | "minimal";
export type DiscountType = "percent" | "fixed";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  paymentTerms: string;
  notes?: string;
  company: Company;
  customer: Customer;
  items: LineItem[];
  discountType: DiscountType;
  discountValue: number;
  shipping: number;
  template: Template;
  createdAt: string;
  status?: "draft" | "sent" | "paid";
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}