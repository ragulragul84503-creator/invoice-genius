import type { Invoice, InvoiceTotals, LineItem } from "@/types/invoice";

export const CURRENCIES: { code: string; symbol: string; locale: string }[] = [
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "INR", symbol: "₹", locale: "en-IN" },
  { code: "AUD", symbol: "A$", locale: "en-AU" },
  { code: "CAD", symbol: "C$", locale: "en-CA" },
  { code: "JPY", symbol: "¥", locale: "ja-JP" },
];

export function formatCurrency(amount: number, currency = "USD") {
  const c = CURRENCIES.find((x) => x.code === currency) ?? CURRENCIES[0];
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code }).format(amount || 0);
  } catch {
    return `${c.symbol}${(amount || 0).toFixed(2)}`;
  }
}

export function lineTotal(item: LineItem) {
  const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  const tax = base * ((Number(item.taxPercent) || 0) / 100);
  return { base, tax, total: base + tax };
}

export function calcTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = invoice.items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0,
  );
  const tax = invoice.items.reduce((s, i) => {
    const base = (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0);
    return s + base * ((Number(i.taxPercent) || 0) / 100);
  }, 0);
  const discount =
    invoice.discountType === "percent"
      ? (subtotal * (Number(invoice.discountValue) || 0)) / 100
      : Number(invoice.discountValue) || 0;
  const shipping = Number(invoice.shipping) || 0;
  const grandTotal = Math.max(0, subtotal + tax - discount + shipping);
  return { subtotal, tax, discount, shipping, grandTotal };
}

export function generateInvoiceNumber() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}-${rand}`;
}

export function newLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxPercent: 0,
  };
}

const STORAGE_KEY = "invoices.v1";

export function loadInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Invoice[]) : [];
  } catch {
    return [];
  }
}

export function saveInvoices(list: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertInvoice(invoice: Invoice) {
  const list = loadInvoices();
  const idx = list.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) list[idx] = invoice;
  else list.unshift(invoice);
  saveInvoices(list);
  return list;
}

export function deleteInvoice(id: string) {
  const list = loadInvoices().filter((i) => i.id !== id);
  saveInvoices(list);
  return list;
}

export function emptyInvoice(): Invoice {
  const today = new Date();
  const due = new Date();
  due.setDate(today.getDate() + 14);
  return {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: today.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    currency: "USD",
    paymentTerms: "Net 14",
    notes: "Thank you for your business!",
    company: {
      name: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      taxId: "",
      logo: "",
    },
    customer: { name: "", company: "", address: "", email: "", phone: "" },
    items: [newLineItem()],
    discountType: "percent",
    discountValue: 0,
    shipping: 0,
    template: "modern",
    createdAt: new Date().toISOString(),
    status: "draft",
  };
}

export function sampleInvoice(): Invoice {
  return {
    ...emptyInvoice(),
    company: {
      name: "Acme Studios",
      address: "221B Baker Street\nLondon, UK",
      phone: "+44 20 7946 0958",
      email: "billing@acme.studio",
      website: "acme.studio",
      taxId: "GB123456789",
      logo: "",
    },
    customer: {
      name: "Jane Cooper",
      company: "Cooper Co.",
      address: "1500 Market St\nSan Francisco, CA 94103",
      email: "jane@cooper.co",
      phone: "+1 415 555 0123",
    },
    items: [
      { id: crypto.randomUUID(), description: "Website redesign", quantity: 1, unitPrice: 2400, taxPercent: 10 },
      { id: crypto.randomUUID(), description: "Logo & branding", quantity: 1, unitPrice: 800, taxPercent: 10 },
      { id: crypto.randomUUID(), description: "Hosting (12 months)", quantity: 12, unitPrice: 25, taxPercent: 0 },
    ],
    discountType: "percent",
    discountValue: 5,
    shipping: 0,
  };
}