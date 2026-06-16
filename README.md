# Invoice Generator

Modern, production-ready invoice generator built with React + TypeScript + Tailwind CSS on TanStack Start.

## Features

- Company & customer details with logo upload
- Dynamic line items (add / remove / duplicate) with per-line tax
- Discount (% or fixed) and shipping
- Real-time totals: subtotal, tax, discount, shipping, grand total
- Multi-currency formatting (USD, EUR, GBP, INR, AUD, CAD, JPY)
- Live A4 invoice preview with three templates (Modern / Corporate / Minimal)
- Export to PDF (jsPDF + html2canvas), Print, Save/Load JSON
- Invoice history with search (saved in browser localStorage)
- Dark / light mode
- Toast notifications, validation, loading state for PDF export

## Stack

React 19, TypeScript, Tailwind CSS v4, TanStack Start, shadcn/ui, lucide-react, jsPDF, html2canvas, sonner.

## Folder Structure

```
src/
├── components/
│   ├── invoice/InvoicePreview.tsx
│   └── ui/                # shadcn primitives
├── lib/
│   └── invoice-utils.ts   # totals, storage, currency, sample data
├── routes/
│   ├── __root.tsx
│   └── index.tsx          # main page (form + preview)
├── types/
│   └── invoice.ts
└── styles.css
```

## Run locally

```bash
bun install
bun dev
```

Open the preview URL printed in the terminal.

## Notes

- Invoices persist in `localStorage` under `invoices.v1`.
- Click **Sample** in the header to load demo data.
- Click **PDF** to download an A4-formatted PDF of the current preview.