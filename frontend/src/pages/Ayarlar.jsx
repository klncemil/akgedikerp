import { Grape, User, Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";

export default function Ayarlar() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Sistem Ayarları" subtitle="İşletme ve hesap bilgileri" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div>
            <h3 className="font-heading text-lg font-semibold">İşletme Bilgileri</h3>
          </div>
          <Info label="Firma" value="Akgedik Gıda A.Ş." />
          <Info label="Sistem" value="Akgedik Üzüm Yönetim Sistemi" />
          <Info label="Bölge" value="Alaşehir & Manisa" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400"><User className="h-5 w-5" /></div>
            <h3 className="font-heading text-lg font-semibold">Hesap Bilgileri</h3>
          </div>
          <Info label="Ad" value={user?.name} />
          <Info label="E-posta" value={user?.email} />
          <Info label="Rol" value={user?.role === "admin" ? "Yönetici" : user?.role} icon={ShieldCheck} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Grape className="h-5 w-5 text-primary-foreground" />
        Sistem tamamen Türkçe olarak, ilişkisel veritabanı mimarisiyle çalışmaktadır. Cari → Bahçe → Hasat → Kantar → Alış → Ödeme akışı otomatik ilişkilendirilir.
      </div>
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium">{Icon && <Icon className="h-4 w-4 text-emerald-400" />}{value || "-"}</span>
    </div>
  );
}
