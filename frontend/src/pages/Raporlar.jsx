import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download, FileText, Users, Trees, CalendarCheck, TrendingUp,
  Receipt, Wallet, Truck, CircleDollarSign, Boxes, Scale, Coins, Loader2,
} from "lucide-react";
import { api, fmtTL, fmtKg, downloadFile } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const REPORTS = [
  { key: "cariler", title: "Cari Listesi Raporu", icon: Users },
  { key: "cari-borc", title: "Cari Borç Raporu", icon: Coins },
  { key: "bahceler", title: "Bahçe Bazlı Rapor", icon: Trees },
  { key: "hasatlar", title: "Günlük Hasat Raporu", icon: CalendarCheck },
  { key: "hasatlar", title: "Alış Raporu", icon: Scale, alias: "alis" },
  { key: "satislar", title: "Satış Raporu", icon: TrendingUp },
  { key: "tahsilatlar", title: "Tahsilat Raporu", icon: Receipt },
  { key: "odemeler", title: "Ödeme Raporu", icon: Wallet },
  { key: "nakliyeler", title: "Nakliye Raporu", icon: Truck },
  { key: "giderler", title: "Gider Raporu", icon: CircleDollarSign },
  { key: "stok", title: "Stok Raporu", icon: Boxes },
];

export default function Raporlar() {
  const [kar, setKar] = useState(null);

  useEffect(() => {
    api.get("/kar").then((r) => setKar(r.data));
  }, []);

  return (
    <div>
      <PageHeader title="Raporlar & Analizler" subtitle="Tüm modüller için Excel ve PDF dışa aktarma" />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-heading text-lg font-semibold">Gerçek Kâr Analizi</h3>
        {!kar ? (
          <div className="flex items-center py-6 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Hesaplanıyor...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
            <KpiMini label="Toplam Satış" value={fmtTL(kar.toplam_satis)} />
            <KpiMini label="Alış Maliyeti" value={fmtTL(kar.toplam_alis_maliyet)} />
            <KpiMini label="Satış Giderleri" value={fmtTL(kar.satis_giderleri)} />
            <KpiMini label="İşletme Gideri" value={fmtTL(kar.isletme_giderleri)} />
            <KpiMini label="Gerçek Kâr" value={fmtTL(kar.gercek_kar)} tone="emerald" />
            <KpiMini label="Kâr Oranı" value={`%${kar.kar_orani}`} tone="emerald" />
            <KpiMini label="Kg Başına Kâr" value={fmtTL(kar.kg_basina_kar)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r, i) => {
          const Icon = r.icon;
          return (
            <motion.div
              key={r.alias || r.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{r.title}</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" data-testid={`report-excel-${r.alias || r.key}`}
                  onClick={() => downloadFile(`/export/${r.key}/excel`, `${r.alias || r.key}.xlsx`)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" data-testid={`report-pdf-${r.alias || r.key}`}
                  onClick={() => downloadFile(`/export/${r.key}/pdf`, `${r.alias || r.key}.pdf`)}>
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function KpiMini({ label, value, tone }) {
  const c = tone === "emerald" ? "text-emerald-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono-nums text-sm font-bold ${c}`}>{value}</div>
    </div>
  );
}
