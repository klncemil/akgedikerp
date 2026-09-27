import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Loader2, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, fmtTL, fmtKg, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/CrudModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ODEME_SEKILLERI } from "@/config/entities";

const num = (v) => parseFloat(v) || 0;
const today = new Date().toISOString().slice(0, 10);

const HASAT_COLS = [
  { key: "kod", label: "Hasat ID" },
  { key: "tarih", label: "Tarih", fmt: "date" },
  { key: "bahce_kod", label: "Bahçe" },
  { key: "bag_sahibi", label: "Bağ Sahibi" },
  { key: "uzum_cesidi", label: "Çeşit" },
  { key: "net_kg", label: "Net Kg", fmt: "kg" },
  { key: "alis_fiyati", label: "Fiyat", fmt: "tl" },
  { key: "toplam_alis_tutari", label: "Alış Tutarı", fmt: "tl" },
  { key: "toplam_maliyet", label: "Toplam Maliyet", fmt: "tl" },
];

export default function GunlukTakip() {
  const [cariler, setCariler] = useState([]);
  const [bahceler, setBahceler] = useState([]);
  const [hasatlar, setHasatlar] = useState([]);
  const [cariId, setCariId] = useState("");
  const [bahceId, setBahceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    tarih: today, kesim_ekibi: "", ekip_sorumlusu: "", arac_plaka: "",
    kasa_sayisi: "", kantar_kg: "", kasa_tara: "", alis_fiyati: "",
    iscilik: "", nakliye: "", diger_gider: "", odeme_sekli: "", vade_tarihi: "", aciklama: "",
  });

  const loadHasat = () => api.get("/hasatlar").then((r) => setHasatlar(r.data));

  useEffect(() => {
    api.get("/cariler").then((r) => setCariler(r.data));
    api.get("/bahceler").then((r) => setBahceler(r.data));
    loadHasat();
  }, []);

  const cariBahceler = useMemo(
    () => bahceler.filter((b) => b.cari_id === cariId),
    [bahceler, cariId]
  );
  const selectedBahce = bahceler.find((b) => b.id === bahceId);
  const selectedCari = cariler.find((c) => c.id === cariId);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const net = num(f.kantar_kg) - num(f.kasa_tara);
  const toplamAlis = net * num(f.alis_fiyati);
  const toplamMaliyet = toplamAlis + num(f.iscilik) + num(f.nakliye) + num(f.diger_gider);

  const resetForm = () => {
    setF({ tarih: today, kesim_ekibi: "", ekip_sorumlusu: "", arac_plaka: "", kasa_sayisi: "", kantar_kg: "", kasa_tara: "", alis_fiyati: "", iscilik: "", nakliye: "", diger_gider: "", odeme_sekli: "", vade_tarihi: "", aciklama: "" });
    setBahceId("");
  };

  const submit = async () => {
    if (!bahceId) return toast.error("Lütfen bahçe seçiniz");
    if (!f.kantar_kg) return toast.error("Kantar Kg giriniz");
    setSaving(true);
    try {
      await api.post("/hasatlar", { ...f, bahce_id: bahceId, net_kg: net });
      toast.success("Hasat kaydı oluşturuldu ve stoğa aktarıldı");
      resetForm();
      loadHasat();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const nInput = (k, label) => (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      <Input data-testid={`ht-${k}`} type="number" step="any" value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Günlük Hasat Takibi" subtitle="Cari → Bahçe seçin, bilgiler otomatik gelsin. Kantar ve maliyet anlık hesaplanır." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-heading font-semibold"><CalendarCheck className="h-4 w-4 text-primary-foreground" /> Yeni Hasat Kaydı</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">1. Bağ Sahibi (Cari) <span className="text-destructive">*</span></Label>
              <Select value={cariId} onValueChange={(v) => { setCariId(v); setBahceId(""); }}>
                <SelectTrigger data-testid="ht-cari"><SelectValue placeholder="Cari seçiniz" /></SelectTrigger>
                <SelectContent>
                  {cariler.map((c) => <SelectItem key={c.id} value={c.id}>{c.kod} - {c.bag_sahibi}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">2. Bahçe <span className="text-destructive">*</span></Label>
              <Select value={bahceId} onValueChange={setBahceId} disabled={!cariId}>
                <SelectTrigger data-testid="ht-bahce"><SelectValue placeholder={cariId ? "Bahçe seçiniz" : "Önce cari seçin"} /></SelectTrigger>
                <SelectContent>
                  {cariBahceler.map((b) => <SelectItem key={b.id} value={b.id}>{b.kod} - {b.koy_mevki} ({b.uzum_cesidi})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedBahce && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400"><Info className="h-4 w-4" /> Otomatik gelen bilgiler:</span>
              <span><span className="text-muted-foreground">Bağ Sahibi:</span> <b>{selectedCari?.bag_sahibi}</b></span>
              <span><span className="text-muted-foreground">Köy/Mevki:</span> <b>{selectedBahce.koy_mevki}</b></span>
              <span><span className="text-muted-foreground">Üzüm Çeşidi:</span> <b>{selectedBahce.uzum_cesidi}</b></span>
              <span><span className="text-muted-foreground">Ada/Parsel:</span> <b>{selectedBahce.ada || "-"}/{selectedBahce.parsel || "-"}</b></span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-sm">Tarih</Label>
              <Input data-testid="ht-tarih" type="date" value={f.tarih} onChange={(e) => set("tarih", e.target.value)} />
            </div>
            <div className="col-span-1"><Label className="mb-1.5 block text-sm">Kesim Ekibi</Label><Input data-testid="ht-kesim_ekibi" value={f.kesim_ekibi} onChange={(e) => set("kesim_ekibi", e.target.value)} /></div>
            <div className="col-span-1"><Label className="mb-1.5 block text-sm">Ekip Sorumlusu</Label><Input data-testid="ht-ekip_sorumlusu" value={f.ekip_sorumlusu} onChange={(e) => set("ekip_sorumlusu", e.target.value)} /></div>
            <div className="col-span-1"><Label className="mb-1.5 block text-sm">Araç / Plaka</Label><Input data-testid="ht-arac_plaka" value={f.arac_plaka} onChange={(e) => set("arac_plaka", e.target.value)} /></div>
            {nInput("kasa_sayisi", "Kasa Sayısı")}
            {nInput("kantar_kg", "Kantar Kg")}
            {nInput("kasa_tara", "Kasa Tara (kg)")}
            {nInput("alis_fiyati", "Alış Fiyatı (₺/kg)")}
            {nInput("iscilik", "İşçilik (₺)")}
            {nInput("nakliye", "Nakliye (₺)")}
            {nInput("diger_gider", "Diğer Gider (₺)")}
            <div>
              <Label className="mb-1.5 block text-sm">Ödeme Şekli</Label>
              <Select value={f.odeme_sekli} onValueChange={(v) => set("odeme_sekli", v)}>
                <SelectTrigger data-testid="ht-odeme_sekli"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>{ODEME_SEKILLERI.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Vade Tarihi</Label>
              <Input data-testid="ht-vade_tarihi" type="date" value={f.vade_tarihi} onChange={(e) => set("vade_tarihi", e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <Label className="mb-1.5 block text-sm">Açıklama</Label>
            <Textarea data-testid="ht-aciklama" value={f.aciklama} onChange={(e) => set("aciklama", e.target.value)} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-fit rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-heading font-semibold">Otomatik Hesaplama</h3>
          <div className="space-y-3 text-sm">
            <Row label="Net Kg" value={fmtKg(net)} />
            <Row label="Alış Fiyatı" value={fmtTL(f.alis_fiyati)} />
            <div className="border-t border-border pt-3">
              <Row label="Ürün Alış Tutarı" value={fmtTL(toplamAlis)} strong />
            </div>
            <Row label="+ İşçilik" value={fmtTL(f.iscilik)} muted />
            <Row label="+ Nakliye" value={fmtTL(f.nakliye)} muted />
            <Row label="+ Diğer Gider" value={fmtTL(f.diger_gider)} muted />
            <div className="border-t border-border pt-3">
              <Row label="Toplam Maliyet" value={fmtTL(toplamMaliyet)} big />
            </div>
          </div>
          <Button className="mt-6 w-full" onClick={submit} disabled={saving} data-testid="ht-submit">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Hasat Kaydını Oluştur
          </Button>
        </motion.div>
      </div>

      <h3 className="mb-3 mt-8 font-heading text-lg font-semibold">Son Hasat Kayıtları</h3>
      <DataTable testid="gunluk-hasat-table" columns={HASAT_COLS} rows={hasatlar} />
    </div>
  );
}

function Row({ label, value, strong, big, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={`font-mono-nums ${big ? "text-lg font-bold text-emerald-400" : strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
