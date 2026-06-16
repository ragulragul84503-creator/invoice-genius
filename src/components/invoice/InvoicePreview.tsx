import { forwardRef } from "react";
import type { Invoice } from "@/types/invoice";
import { calcTotals, formatCurrency, lineTotal } from "@/lib/invoice-utils";

interface Props {
  invoice: Invoice;
}

export const InvoicePreview = forwardRef<HTMLDivElement, Props>(function InvoicePreview(
  { invoice },
  ref,
) {
  const totals = calcTotals(invoice);
  const t = invoice.template;

  const accent =
    t === "modern" ? "#6366f1" : t === "corporate" ? "#0f172a" : "#111827";
  const headerBg =
    t === "modern"
      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
      : t === "corporate"
        ? "#0f172a"
        : "#ffffff";
  const headerColor = t === "minimal" ? "#111827" : "#ffffff";

  return (
    <div
      ref={ref}
      id="invoice-preview"
      className="bg-white text-slate-900 shadow-xl mx-auto"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "0",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        color: "#111827",
      }}
    >
      <div
        style={{
          background: headerBg,
          color: headerColor,
          padding: "32px 40px",
          borderBottom: t === "minimal" ? "2px solid #111827" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {invoice.company.logo ? (
            <img
              src={invoice.company.logo}
              alt="Logo"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                background: "#fff",
                borderRadius: 8,
                padding: 6,
              }}
            />
          ) : null}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {invoice.company.name || "Your Company"}
            </div>
            <div style={{ whiteSpace: "pre-line", opacity: 0.9, marginTop: 4 }}>
              {invoice.company.address}
            </div>
            <div style={{ opacity: 0.9, marginTop: 4 }}>
              {invoice.company.email} {invoice.company.phone && `• ${invoice.company.phone}`}
            </div>
            {invoice.company.taxId && (
              <div style={{ opacity: 0.9 }}>Tax ID: {invoice.company.taxId}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>INVOICE</div>
          <div style={{ marginTop: 8, opacity: 0.95 }}>#{invoice.invoiceNumber}</div>
        </div>
      </div>

      <div style={{ padding: "32px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6b7280", letterSpacing: 1 }}>
              Bill To
            </div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>{invoice.customer.name || "Customer"}</div>
            {invoice.customer.company && <div>{invoice.customer.company}</div>}
            <div style={{ whiteSpace: "pre-line", color: "#374151" }}>{invoice.customer.address}</div>
            <div style={{ color: "#374151" }}>{invoice.customer.email}</div>
            <div style={{ color: "#374151" }}>{invoice.customer.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6b7280", letterSpacing: 1 }}>
              Invoice Date
            </div>
            <div style={{ marginTop: 6 }}>{invoice.invoiceDate}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6b7280", letterSpacing: 1, marginTop: 12 }}>
              Due Date
            </div>
            <div style={{ marginTop: 6 }}>{invoice.dueDate}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6b7280", letterSpacing: 1 }}>
              Payment Terms
            </div>
            <div style={{ marginTop: 6 }}>{invoice.paymentTerms}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6b7280", letterSpacing: 1, marginTop: 12 }}>
              Currency
            </div>
            <div style={{ marginTop: 6 }}>{invoice.currency}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ background: t === "minimal" ? "#f3f4f6" : accent, color: t === "minimal" ? "#111827" : "#fff" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11 }}>Description</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, width: 60 }}>Qty</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, width: 100 }}>Unit</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, width: 70 }}>Tax %</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, width: 110 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const { total } = lineTotal(item);
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 12px" }}>{item.description || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.taxPercent}%</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                    {formatCurrency(total, invoice.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: 280 }}>
            <Row label="Subtotal" value={formatCurrency(totals.subtotal, invoice.currency)} />
            <Row label={`Tax`} value={formatCurrency(totals.tax, invoice.currency)} />
            {totals.discount > 0 && (
              <Row
                label={`Discount${invoice.discountType === "percent" ? ` (${invoice.discountValue}%)` : ""}`}
                value={`- ${formatCurrency(totals.discount, invoice.currency)}`}
              />
            )}
            {totals.shipping > 0 && (
              <Row label="Shipping" value={formatCurrency(totals.shipping, invoice.currency)} />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                padding: "12px 0",
                borderTop: `2px solid ${accent}`,
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              <span>Grand Total</span>
              <span style={{ color: accent }}>{formatCurrency(totals.grandTotal, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ marginTop: 32, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6b7280", letterSpacing: 1 }}>
              Notes
            </div>
            <div style={{ marginTop: 6, whiteSpace: "pre-line" }}>{invoice.notes}</div>
          </div>
        )}

        <div
          style={{
            marginTop: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          <div>Thank you for your business.</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 4, width: 180 }}>Authorized Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#374151" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}