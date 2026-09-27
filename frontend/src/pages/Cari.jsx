import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { api, fmtTL, fmtKg, fmtDate, fmtNum } from "@/lib/api";
import CrudModule, { DataTable } from "@/components/CrudModule";
import { ENTITIES } from "@/config/entities";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function CariDetayButton({ cariId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);

  const openDetail = async () => {
    setOpen(true);
    setData(null);
    const { data } = await api.get(`/cari-hesap/${cariId}`);
    setData(data);
  };

  return (
    <>
      <button data-testid={`detail-${cariId}`} onClick={openDetail} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
        <Eye className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{data ? `${data.kod} - ${data.bag_sahibi}` : "Cari Hesap Detayı"}</DialogTitle>
          </DialogHeader>
          {!data ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Bahçe Sayısı" value={fmtNum(data.bahce_sayisi)} />
                <Stat label="Toplam Hasat" value={fmtKg(data.toplam_hasat_kg)} />
                <Stat label="Toplam Alış" value={fmtTL(data.toplam_alis_tutari)} />
                <Stat label="Ödenen" value={fmtTL(data.odenen_tutar)} />
                <Stat label="Kalan Borç" value={fmtTL(data.kalan_borc)} tone="rose" />
                <Stat label="Vadesi Gelen" value={fmtTL(data.vadesi_gelen_borc)} tone="amber" />
                <Stat label="Vadesi Geçen" value={fmtTL(data.vadesi_gecen_borc)} tone="red" />
              </div>
              <Tabs defaultValue="bahceler" className="mt-4">
                <TabsList>
                  <TabsTrigger value="bahceler" data-testid="tab-bahceler">Bahçeler</TabsTrigger>
                  <TabsTrigger value="hasatlar" data-testid="tab-hasatlar">Hasatlar</TabsTrigger>
                  <TabsTrigger value="odemeler" data-testid="tab-odemeler">Ödemeler</TabsTrigger>
                </TabsList>
                <TabsContent value="bahceler">
                  <DataTable columns={[
                    { key: "kod", label: "Bahçe ID" }, { key: "koy_mevki", label: "Köy/Mevki" },
                    { key: "uzum_cesidi", label: "Çeşit" }, { key: "alan_dekar", label: "Alan", fmt: "num" },
                  ]} rows={data.bahceler} />
                </TabsContent>
                <TabsContent value="hasatlar">
                  <DataTable columns={[
                    { key: "kod", label: "Hasat ID" }, { key: "tarih", label: "Tarih", fmt: "date" },
                    { key: "net_kg", label: "Net Kg", fmt: "kg" }, { key: "toplam_alis_tutari", label: "Alış Tutarı", fmt: "tl" },
                  ]} rows={data.hasatlar} />
                </TabsContent>
                <TabsContent value="odemeler">
                  <DataTable columns={[
                    { key: "kod", label: "Ödeme ID" }, { key: "tarih", label: "Tarih", fmt: "date" },
                    { key: "tutar", label: "Tutar", fmt: "tl" }, { key: "odeme_yontemi", label: "Yöntem" },
                  ]} rows={data.odemeler} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value, tone }) {
  const c = { rose: "text-rose-400", amber: "text-amber-400", red: "text-red-400" }[tone] || "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono-nums text-sm font-bold ${c}`}>{value}</div>
    </div>
  );
}

const CARI_CONFIG = {
  ...ENTITIES.cariler,
  title: "Cari Kayıtları & Hesap",
  subtitle: "Bağ sahibi kayıtları ve otomatik cari hesap özeti",
  listEndpoint: "cari-hesap",
  exportKey: "cari-borc",
  columns: [
    { key: "kod", label: "Cari ID" },
    { key: "bag_sahibi", label: "Bağ Sahibi" },
    { key: "telefon", label: "Telefon" },
    { key: "bahce_sayisi", label: "Bahçe", fmt: "num" },
    { key: "toplam_hasat_kg", label: "Toplam Kg", fmt: "kg" },
    { key: "toplam_alis_tutari", label: "Toplam Alış", fmt: "tl" },
    { key: "odenen_tutar", label: "Ödenen", fmt: "tl" },
    { key: "kalan_borc", label: "Kalan Borç", fmt: "tl" },
    { key: "vadesi_gecen_borc", label: "Vadesi Geçen", fmt: "tl" },
  ],
  extraAction: (row) => <CariDetayButton cariId={row.id} />,
};

export default function Cari() {
  return <CrudModule config={CARI_CONFIG} />;
}
