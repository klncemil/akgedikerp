import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Trees, Wheat, Scale, ShoppingCart, TrendingUp, Receipt,
  AlertTriangle, Coins, HandCoins, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area, BarChart,
} from "recharts";
import { api, fmtTL, fmtKg, fmtNum, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

const COLORS = ["#10B981", "#8B1E3F", "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

const tooltipStyle = {
  contentStyle: { background: "#111827", border: "1px solid #374151", borderRadius: 12, color: "#F3F4F6" },
  labelStyle: { color: "#9CA3AF" },
  itemStyle: { color: "#F3F4F6" },
};

function KpiCard({ icon: Icon, label, value, tone, i }) {
  const tones = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    indigo: "text-indigo-400 bg-indigo-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    sky: "text-sky-400 bg-sky-500/10",
    violet: "text-violet-400 bg-violet-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border/80"
    >
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl font-bold font-mono-nums text-foreground">{value}</div>
    </motion.div>
  );
}

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <h3 className="mb-4 font-heading text-base font-semibold text-foreground">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Panel yükleniyor...</div>;
  }

  const k = data.kpis;
  const kpis = [
    { icon: Users, label: "Toplam Cari", value: fmtNum(k.toplam_cari), tone: "indigo" },
    { icon: Trees, label: "Toplam Bahçe", value: fmtNum(k.toplam_bahce), tone: "emerald" },
    { icon: Scale, label: "Toplam Hasat Fişi", value: fmtNum(k.toplam_hasat), tone: "amber" },
    { icon: Wheat, label: "Toplam Hasat", value: fmtKg(k.toplam_kg), tone: "emerald" },
    { icon: ShoppingCart, label: "Toplam Alış", value: fmtTL(k.toplam_alis), tone: "rose" },
    { icon: TrendingUp, label: "Toplam Satış", value: fmtTL(k.toplam_satis), tone: "cyan" },
    { icon: Receipt, label: "Toplam Tahsilat", value: fmtTL(k.toplam_tahsilat), tone: "sky" },
    { icon: HandCoins, label: "Müstahsil Borcu", value: fmtTL(k.toplam_borc), tone: "red" },
    { icon: Coins, label: "Müşteri Alacağı", value: fmtTL(k.toplam_alacak), tone: "violet" },
    { icon: TrendingUp, label: "Gerçek Kâr", value: fmtTL(k.gercek_kar), tone: "emerald" },
  ];

  return (
    <div>
      <PageHeader title="Gösterge Paneli" subtitle="Akgedik Gıda A.Ş. — Güncel işletme özeti" />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kp, i) => <KpiCard key={kp.label} {...kp} i={i} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Günlük Hasat Miktarı ve Sefer Sayısı">
          <ComposedChart data={data.gunluk_hasat}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="tarih" tickFormatter={fmtDate} stroke="#9CA3AF" fontSize={11} />
            <YAxis yAxisId="l" stroke="#9CA3AF" fontSize={11} />
            <YAxis yAxisId="r" orientation="right" stroke="#9CA3AF" fontSize={11} />
            <Tooltip {...tooltipStyle} labelFormatter={fmtDate} />
            <Legend />
            <Bar yAxisId="l" dataKey="miktar_kg" name="Hasat (kg)" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Line yAxisId="r" type="monotone" dataKey="sefer_sayisi" name="Sefer" stroke="#F59E0B" strokeWidth={2} />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Aylık Ciro & Net Kâr Gelişimi">
          <AreaChart data={data.aylik}>
            <defs>
              <linearGradient id="gCiro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gKar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="ay" stroke="#9CA3AF" fontSize={11} />
            <YAxis stroke="#9CA3AF" fontSize={11} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtTL(v)} />
            <Legend />
            <Area type="monotone" dataKey="satis_tutari" name="Ciro" stroke="#10B981" fill="url(#gCiro)" strokeWidth={2} />
            <Area type="monotone" dataKey="kar" name="Kâr" stroke="#F59E0B" fill="url(#gKar)" strokeWidth={2} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Bahçe Bazlı Rekolte Dağılımı">
          <PieChart>
            <Pie data={data.bahce_kg} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {data.bahce_kg.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v) => fmtKg(v)} />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Üzüm Çeşidi Dağılımı">
          <PieChart>
            <Pie data={data.cesit_kg} dataKey="value" nameKey="name" outerRadius={95} label>
              {data.cesit_kg.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v) => fmtKg(v)} />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Aylık Alış vs Satış Karşılaştırması">
          <BarChart data={data.buy_sell}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="ay" stroke="#9CA3AF" fontSize={11} />
            <YAxis stroke="#9CA3AF" fontSize={11} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtTL(v)} />
            <Legend />
            <Bar dataKey="alis_tutari" name="Alış" fill="#9D174D" radius={[4, 4, 0, 0]} />
            <Bar dataKey="satis_tutari" name="Satış" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Cari Borç Dağılımı (En Yüksek)">
          <BarChart data={data.borc_dagilim} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
            <YAxis type="category" dataKey="name" width={110} stroke="#9CA3AF" fontSize={11} />
            <Tooltip {...tooltipStyle} formatter={(v) => fmtTL(v)} />
            <Bar dataKey="value" name="Kalan Borç" fill="#EF4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Vadesi Yaklaşan / Geçen Ödemeler
        </h3>
        {data.vadeler.length === 0 ? (
          <p className="text-sm text-muted-foreground">Yaklaşan ödeme kaydı yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.vadeler.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{v.bag_sahibi}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{v.kod}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={v.gecti ? "text-destructive" : "text-muted-foreground"}>{fmtDate(v.vade_tarihi)}</span>
                  <span className="font-mono-nums font-semibold">{fmtTL(v.tutar)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
