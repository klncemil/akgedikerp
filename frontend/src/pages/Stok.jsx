import { useEffect, useState } from "react";
import { Boxes, Download, FileText, Loader2 } from "lucide-react";
import { api, fmtKg, downloadFile } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/CrudModule";
import { Button } from "@/components/ui/button";

export default function Stok() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get("/stok").then((r) => setRows(r.data));
  }, []);

  const toplamKalan = rows ? rows.reduce((a, b) => a + (b.kalan_kg || 0), 0) : 0;

  return (
    <div>
      <PageHeader title="Depo & Soğuk Hava Stok" subtitle="Hasat girişleri ve satış çıkışlarından otomatik hesaplanan stok durumu">
        <Button variant="outline" size="sm" data-testid="export-excel-button" onClick={() => downloadFile("/export/stok/excel", "stok.xlsx")}>
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
        <Button variant="outline" size="sm" data-testid="export-pdf-button" onClick={() => downloadFile("/export/stok/pdf", "stok.pdf")}>
          <FileText className="mr-1.5 h-4 w-4" /> PDF
        </Button>
      </PageHeader>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <Boxes className="h-6 w-6" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Toplam Kalan Stok</div>
          <div className="font-heading text-2xl font-bold font-mono-nums">{fmtKg(toplamKalan)}</div>
        </div>
      </div>

      {!rows ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...</div>
      ) : (
        <DataTable
          testid="stok-table"
          columns={[
            { key: "urun", label: "Ürün" },
            { key: "cesit", label: "Üzüm Çeşidi" },
            { key: "giris_kg", label: "Giriş Kg", fmt: "kg" },
            { key: "cikis_kg", label: "Çıkış Kg", fmt: "kg" },
            { key: "kalan_kg", label: "Kalan Kg", fmt: "kg" },
          ]}
          rows={rows}
        />
      )}
    </div>
  );
}
