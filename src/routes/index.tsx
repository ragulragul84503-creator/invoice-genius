import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Download,
  Printer,
  Save,
  Upload,
  FileText,
  Moon,
  Sun,
  Search,
  Sparkles,
  Copy,
  History,
  X,
  FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Invoice, LineItem, Template } from "@/types/invoice";
import {
  CURRENCIES,
  calcTotals,
  deleteInvoice,
  emptyInvoice,
  formatCurrency,
  generateInvoiceNumber,
  loadInvoices,
  newLineItem,
  sampleInvoice,
  upsertInvoice,
} from "@/lib/invoice-utils";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invoice Generator — Create & Export Professional Invoices" },
      {
        name: "description",
        content:
          "Create, preview, and export professional invoices as PDF. Save history locally with multiple templates, currencies, and dark mode.",
      },
      { property: "og:title", content: "Invoice Generator" },
      {
        property: "og:description",
        content: "Create and export professional invoices with live preview and PDF download.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [invoice, setInvoice] = useState<Invoice>(() => emptyInvoice());
  const [dark, setDark] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<Invoice[]>([]);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Init theme + history
  useEffect(() => {
    const t = localStorage.getItem("theme") === "dark";
    setDark(t);
    setHistory(loadInvoices());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const totals = useMemo(() => calcTotals(invoice), [invoice]);

  function update<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setInvoice((p) => ({ ...p, [key]: value }));
  }
  function updateCompany<K extends keyof Invoice["company"]>(k: K, v: Invoice["company"][K]) {
    setInvoice((p) => ({ ...p, company: { ...p.company, [k]: v } }));
  }
  function updateCustomer<K extends keyof Invoice["customer"]>(k: K, v: Invoice["customer"][K]) {
    setInvoice((p) => ({ ...p, customer: { ...p.customer, [k]: v } }));
  }
  function updateItem(id: string, patch: Partial<LineItem>) {
    setInvoice((p) => ({
      ...p,
      items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }
  function addItem() {
    setInvoice((p) => ({ ...p, items: [...p.items, newLineItem()] }));
  }
  function removeItem(id: string) {
    setInvoice((p) => ({
      ...p,
      items: p.items.length > 1 ? p.items.filter((i) => i.id !== id) : p.items,
    }));
  }
  function duplicateItem(id: string) {
    setInvoice((p) => {
      const idx = p.items.findIndex((i) => i.id === id);
      if (idx < 0) return p;
      const copy = { ...p.items[idx], id: crypto.randomUUID() };
      const items = [...p.items];
      items.splice(idx + 1, 0, copy);
      return { ...p, items };
    });
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateCompany("logo", reader.result as string);
    reader.readAsDataURL(file);
  }

  function validate(): string | null {
    if (!invoice.company.name.trim()) return "Company name is required";
    if (!invoice.customer.name.trim()) return "Customer name is required";
    if (!invoice.invoiceNumber.trim()) return "Invoice number is required";
    if (!invoice.items.length) return "Add at least one line item";
    if (invoice.items.some((i) => !i.description.trim())) return "All items need a description";
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) return toast.error(err);
    const list = upsertInvoice({ ...invoice, createdAt: new Date().toISOString() });
    setHistory(list);
    toast.success("Invoice saved");
  }

  function handleNew() {
    setInvoice(emptyInvoice());
    toast.success("New invoice ready");
  }

  function handleSample() {
    setInvoice(sampleInvoice());
    toast.success("Sample loaded");
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded");
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Invoice;
        if (!data.invoiceNumber || !data.items) throw new Error("Invalid file");
        setInvoice(data);
        toast.success("Invoice loaded");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handlePdf() {
    const err = validate();
    if (err) return toast.error(err);
    const node = previewRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, jsPdfMod] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const jsPDF = jsPdfMod.jsPDF;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${invoice.invoiceNumber}.pdf`);
      toast.success("PDF exported");
    } catch (e) {
      console.error(e);
      toast.error("PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function loadFromHistory(inv: Invoice) {
    setInvoice(inv);
    setHistoryOpen(false);
    toast.success(`Loaded ${inv.invoiceNumber}`);
  }

  function removeFromHistory(id: string) {
    setHistory(deleteInvoice(id));
    toast.success("Invoice deleted");
  }

  const filteredHistory = history.filter((i) => {
    const q = search.toLowerCase();
    return (
      !q ||
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.customer.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`@media print {
        body * { visibility: hidden; }
        #invoice-preview, #invoice-preview * { visibility: visible; }
        #invoice-preview { position: absolute; left: 0; top: 0; box-shadow: none !important; }
      }`}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">Invoice Generator</h1>
              <p className="text-xs text-muted-foreground">Create, preview, export</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSample}>
              <Sparkles className="mr-1 h-4 w-4" /> Sample
            </Button>
            <Button variant="outline" size="sm" onClick={handleNew}>
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="mr-1 h-4 w-4" /> History
              {history.length > 0 && (
                <span className="ml-1 rounded bg-muted px-1.5 text-xs">{history.length}</span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        {/* Form */}
        <section className="space-y-4 print:hidden">
          <Tabs defaultValue="company">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-3">
              <Card className="p-4 space-y-3">
                <Field label="Company Name *">
                  <Input
                    value={invoice.company.name}
                    onChange={(e) => updateCompany("name", e.target.value)}
                    placeholder="Acme Inc."
                  />
                </Field>
                <Field label="Logo">
                  <div className="flex items-center gap-3">
                    {invoice.company.logo && (
                      <img
                        src={invoice.company.logo}
                        alt="logo"
                        className="h-12 w-12 rounded border bg-white object-contain"
                      />
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Upload
                    </Button>
                    {invoice.company.logo && (
                      <Button variant="ghost" size="sm" onClick={() => updateCompany("logo", "")}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label="Address">
                  <Textarea
                    rows={2}
                    value={invoice.company.address}
                    onChange={(e) => updateCompany("address", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <Input
                      type="email"
                      value={invoice.company.email}
                      onChange={(e) => updateCompany("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={invoice.company.phone}
                      onChange={(e) => updateCompany("phone", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Website">
                    <Input
                      value={invoice.company.website ?? ""}
                      onChange={(e) => updateCompany("website", e.target.value)}
                    />
                  </Field>
                  <Field label="GST / Tax ID">
                    <Input
                      value={invoice.company.taxId}
                      onChange={(e) => updateCompany("taxId", e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="customer" className="space-y-3">
              <Card className="p-4 space-y-3">
                <Field label="Customer Name *">
                  <Input
                    value={invoice.customer.name}
                    onChange={(e) => updateCustomer("name", e.target.value)}
                  />
                </Field>
                <Field label="Company">
                  <Input
                    value={invoice.customer.company ?? ""}
                    onChange={(e) => updateCustomer("company", e.target.value)}
                  />
                </Field>
                <Field label="Billing Address">
                  <Textarea
                    rows={2}
                    value={invoice.customer.address}
                    onChange={(e) => updateCustomer("address", e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email">
                    <Input
                      type="email"
                      value={invoice.customer.email}
                      onChange={(e) => updateCustomer("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={invoice.customer.phone}
                      onChange={(e) => updateCustomer("phone", e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-3">
              <Card className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice Number *">
                    <div className="flex gap-2">
                      <Input
                        value={invoice.invoiceNumber}
                        onChange={(e) => update("invoiceNumber", e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => update("invoiceNumber", generateInvoiceNumber())}
                        title="Regenerate"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field label="Currency">
                    <Select value={invoice.currency} onValueChange={(v) => update("currency", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} ({c.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice Date">
                    <Input
                      type="date"
                      value={invoice.invoiceDate}
                      onChange={(e) => update("invoiceDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Due Date">
                    <Input
                      type="date"
                      value={invoice.dueDate}
                      onChange={(e) => update("dueDate", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Payment Terms">
                  <Input
                    value={invoice.paymentTerms}
                    onChange={(e) => update("paymentTerms", e.target.value)}
                  />
                </Field>
                <Field label="Template">
                  <Select
                    value={invoice.template}
                    onValueChange={(v) => update("template", v as Template)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notes">
                  <Textarea
                    rows={2}
                    value={invoice.notes ?? ""}
                    onChange={(e) => update("notes", e.target.value)}
                  />
                </Field>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="space-y-3">
              <Card className="p-4 space-y-3">
                <div className="space-y-2">
                  {invoice.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Item {idx + 1}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => duplicateItem(item.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            disabled={invoice.items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Qty">
                          <Input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: +e.target.value })}
                          />
                        </Field>
                        <Field label="Unit Price">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, { unitPrice: +e.target.value })}
                          />
                        </Field>
                        <Field label="Tax %">
                          <Input
                            type="number"
                            min={0}
                            value={item.taxPercent}
                            onChange={(e) => updateItem(item.id, { taxPercent: +e.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={addItem}>
                  <Plus className="mr-1 h-4 w-4" /> Add Item
                </Button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Field label="Discount Type">
                    <Select
                      value={invoice.discountType}
                      onValueChange={(v) => update("discountType", v as "percent" | "fixed")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Discount Value">
                    <Input
                      type="number"
                      min={0}
                      value={invoice.discountValue}
                      onChange={(e) => update("discountValue", +e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Shipping">
                  <Input
                    type="number"
                    min={0}
                    value={invoice.shipping}
                    onChange={(e) => update("shipping", +e.target.value)}
                  />
                </Field>

                <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                  <Row k="Subtotal" v={formatCurrency(totals.subtotal, invoice.currency)} />
                  <Row k="Tax" v={formatCurrency(totals.tax, invoice.currency)} />
                  {totals.discount > 0 && (
                    <Row k="Discount" v={`- ${formatCurrency(totals.discount, invoice.currency)}`} />
                  )}
                  {totals.shipping > 0 && (
                    <Row k="Shipping" v={formatCurrency(totals.shipping, invoice.currency)} />
                  )}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Grand Total</span>
                    <span>{formatCurrency(totals.grandTotal, invoice.currency)}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action bar */}
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={handlePdf} disabled={exporting}>
                <Download className="mr-1 h-4 w-4" />
                {exporting ? "Exporting…" : "PDF"}
              </Button>
              <Button variant="secondary" onClick={handlePrint}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
              <Button variant="outline" onClick={handleSave}>
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
              <Button variant="outline" onClick={handleExportJson}>
                <FileJson className="mr-1 h-4 w-4" /> JSON
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportJson}
            />
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" /> Load from JSON
            </Button>
          </Card>
        </section>

        {/* Preview */}
        <section className="overflow-auto">
          <div className="origin-top-left scale-[0.7] sm:scale-[0.8] lg:scale-100 lg:transform-none">
            <InvoicePreview ref={previewRef} invoice={invoice} />
          </div>
        </section>
      </main>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice History</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by number or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[60vh] space-y-2 overflow-auto">
            {filteredHistory.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No saved invoices yet.
              </div>
            )}
            {filteredHistory.map((inv) => {
              const t = calcTotals(inv);
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{inv.invoiceNumber}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {inv.customer.name || "—"} • {inv.invoiceDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatCurrency(t.grandTotal, inv.currency)}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => loadFromHistory(inv)}>
                      Load
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFromHistory(inv.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}
