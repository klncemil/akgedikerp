import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, fmtTL, fmtKg, fmtNum, fmtDate, downloadFile } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const relLabelFns = {
  cari: (c) => `${c.kod} - ${c.bag_sahibi || ""}`,
  musteri: (m) => `${m.kod} - ${m.ad || ""}`,
  hasat: (h) => `${h.kod} - ${h.bag_sahibi || ""} (${h.bahce_kod || ""})`,
};

export function fmtCell(value, fmt) {
  if (fmt === "tl") return fmtTL(value);
  if (fmt === "kg") return fmtKg(value);
  if (fmt === "num") return fmtNum(value);
  if (fmt === "date") return fmtDate(value);
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

export function DataTable({ columns, rows, actions, testid }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm" data-testid={testid}>
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">İşlem</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-10 text-center text-muted-foreground">
                Kayıt bulunamadı.
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <motion.tr
              key={row.id || i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.015 }}
              className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.fmt && c.fmt !== "date" ? "font-mono-nums" : ""} ${c.key === "kod" ? "font-semibold text-primary-foreground/90" : "text-foreground"}`}>
                  {c.render ? c.render(row) : fmtCell(row[c.key], c.fmt)}
                </td>
              ))}
              {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ field, value, onChange, relOptions }) {
  const common = "w-full";
  if (field.type === "textarea") {
    return <Textarea data-testid={`field-${field.name}`} className={common} value={value || ""} onChange={(e) => onChange(field.name, e.target.value)} />;
  }
  if (field.type === "select") {
    return (
      <Select value={value || ""} onValueChange={(v) => onChange(field.name, v)}>
        <SelectTrigger data-testid={`field-${field.name}`} className={common}><SelectValue placeholder="Seçiniz" /></SelectTrigger>
        <SelectContent>
          {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "relation") {
    const opts = relOptions[field.name] || [];
    const labelFn = relLabelFns[field.relation.label];
    return (
      <Select value={value || ""} onValueChange={(v) => onChange(field.name, v)}>
        <SelectTrigger data-testid={`field-${field.name}`} className={common}><SelectValue placeholder="Seçiniz" /></SelectTrigger>
        <SelectContent>
          {opts.map((o) => <SelectItem key={o.id} value={o.id}>{labelFn(o)}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      data-testid={`field-${field.name}`}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      step="any"
      className={common}
      value={value ?? ""}
      onChange={(e) => onChange(field.name, e.target.value)}
    />
  );
}

export default function CrudModule({ config }) {
  const { title, subtitle, endpoint, exportKey, columns, fields } = config;
  const listEndpoint = config.listEndpoint || endpoint;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [relOptions, setRelOptions] = useState({});
  const [delRow, setDelRow] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/${listEndpoint}`);
      setRows(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const rels = fields.filter((f) => f.type === "relation");
    rels.forEach((f) => {
      api.get(`/${f.relation.endpoint}`).then(({ data }) =>
        setRelOptions((p) => ({ ...p, [f.name]: data }))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, listEndpoint]);

  const openNew = () => {
    const init = {};
    fields.forEach((f) => { if (f.default !== undefined) init[f.name] = f.default; });
    setForm(init);
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row) => {
    setForm({ ...row });
    setEditing(row);
    setOpen(true);
  };

  const onChange = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const save = async () => {
    for (const f of fields) {
      if (f.required && !form[f.name]) {
        toast.error(`${f.label} zorunludur`);
        return;
      }
    }
    setSaving(true);
    try {
      if (editing) await api.put(`/${endpoint}/${editing.id}`, form);
      else await api.post(`/${endpoint}`, form);
      toast.success(editing ? "Kayıt güncellendi" : "Kayıt eklendi");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/${endpoint}/${delRow.id}`);
      toast.success("Kayıt silindi");
      setDelRow(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s))
    );
  }, [rows, q, columns]);

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        {exportKey && (
          <>
            <Button variant="outline" size="sm" data-testid="export-excel-button"
              onClick={() => downloadFile(`/export/${exportKey}/excel`, `${exportKey}.xlsx`)}>
              <Download className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" data-testid="export-pdf-button"
              onClick={() => downloadFile(`/export/${exportKey}/pdf`, `${exportKey}.pdf`)}>
              <FileText className="mr-1.5 h-4 w-4" /> PDF
            </Button>
          </>
        )}
        {!config.readOnly && (
          <Button size="sm" data-testid="add-new-button" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Yeni Kayıt
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="search-input" placeholder="Ara..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...
        </div>
      ) : (
        <DataTable
          testid={`${endpoint}-table`}
          columns={columns}
          rows={filtered}
          actions={(config.readOnly && !config.extraAction) ? undefined : (row) => (
            <div className="flex justify-end gap-1">
              {config.extraAction && config.extraAction(row)}
              {!config.readOnly && (
                <>
                  <button data-testid={`edit-${row.id}`} onClick={() => openEdit(row)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button data-testid={`delete-${row.id}`} onClick={() => setDelRow(row)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Düzenle - ${editing.kod || ""}` : `Yeni ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <Label className="mb-1.5 block text-sm">
                  {f.label}{f.required && <span className="text-destructive"> *</span>}
                </Label>
                <Field field={f} value={form[f.name]} onChange={onChange} relOptions={relOptions} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={save} disabled={saving} data-testid="save-button">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delRow} onOpenChange={(o) => !o && setDelRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{delRow?.kod}</b> kodlu kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} data-testid="confirm-delete-button" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
