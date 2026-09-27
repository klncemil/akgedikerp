from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from collections import defaultdict
from datetime import datetime, timezone
import io

from database import db, serialize, serialize_list, oid, next_kod, now_iso
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["erp"])


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


# ----------------------------- Computation hooks -----------------------------

async def prep_hasat(doc):
    bahce = await db.bahceler.find_one({"_id": oid(doc.get("bahce_id"))})
    if not bahce:
        raise HTTPException(status_code=400, detail="Geçerli bir bahçe seçiniz")
    cari = await db.cariler.find_one({"_id": oid(bahce.get("cari_id"))})
    doc["bahce_kod"] = bahce.get("kod")
    doc["cari_id"] = str(bahce.get("cari_id"))
    doc["cari_kod"] = cari.get("kod") if cari else ""
    doc["bag_sahibi"] = cari.get("bag_sahibi") if cari else ""
    doc["koy_mevki"] = bahce.get("koy_mevki", "")
    doc["uzum_cesidi"] = bahce.get("uzum_cesidi", "")
    doc["urun"] = bahce.get("urun", "") or "Üzüm"

    kantar = num(doc.get("kantar_kg"))
    tara = num(doc.get("kasa_tara"))
    net = num(doc.get("net_kg"))
    if net == 0 and kantar > 0:
        net = kantar - tara
    doc["net_kg"] = net
    doc["toplam_alis_tutari"] = round(net * num(doc.get("alis_fiyati")), 2)
    doc["toplam_maliyet"] = round(
        doc["toplam_alis_tutari"] + num(doc.get("iscilik"))
        + num(doc.get("nakliye")) + num(doc.get("diger_gider")), 2
    )
    return doc


async def prep_satis(doc):
    musteri = await db.musteriler.find_one({"_id": oid(doc.get("musteri_id"))})
    doc["musteri_kod"] = musteri.get("kod") if musteri else ""
    doc["musteri_ad"] = musteri.get("ad") if musteri else ""
    kg = num(doc.get("kg"))
    doc["toplam_satis"] = round(kg * num(doc.get("birim_satis_fiyati")), 2)
    doc["kalan_alacak"] = round(doc["toplam_satis"] - num(doc.get("tahsilat")), 2)
    return doc


async def prep_bahce(doc):
    cari = await db.cariler.find_one({"_id": oid(doc.get("cari_id"))})
    doc["cari_kod"] = cari.get("kod") if cari else ""
    doc["bag_sahibi"] = cari.get("bag_sahibi") if cari else ""
    return doc


async def prep_odeme(doc):
    cari = await db.cariler.find_one({"_id": oid(doc.get("cari_id"))})
    doc["cari_kod"] = cari.get("kod") if cari else ""
    doc["bag_sahibi"] = cari.get("bag_sahibi") if cari else ""
    return doc


async def prep_tahsilat(doc):
    musteri = await db.musteriler.find_one({"_id": oid(doc.get("musteri_id"))})
    doc["musteri_kod"] = musteri.get("kod") if musteri else ""
    doc["musteri_ad"] = musteri.get("ad") if musteri else ""
    return doc


async def prep_nakliye(doc):
    if doc.get("hasat_id"):
        hasat = await db.hasatlar.find_one({"_id": oid(doc.get("hasat_id"))})
        if hasat:
            doc["hasat_kod"] = hasat.get("kod")
            doc["bahce_kod"] = hasat.get("bahce_kod")
    return doc


async def after_create_hasat(out):
    await db.stok_hareketleri.insert_one({
        "tip": "giris", "urun": out.get("urun", "Üzüm"),
        "cesit": out.get("uzum_cesidi", ""), "kg": num(out.get("net_kg")),
        "kaynak": "hasat", "kaynak_id": out["id"], "kaynak_kod": out.get("kod"),
        "tarih": out.get("tarih", now_iso()), "created_at": now_iso(),
    })


async def after_create_satis(out):
    await db.stok_hareketleri.insert_one({
        "tip": "cikis", "urun": out.get("urun", "Üzüm"),
        "cesit": out.get("cesit", ""), "kg": num(out.get("kg")),
        "kaynak": "satis", "kaynak_id": out["id"], "kaynak_kod": out.get("kod"),
        "tarih": out.get("tarih", now_iso()), "created_at": now_iso(),
    })


async def sync_stok(kaynak, kaynak_id, out):
    await db.stok_hareketleri.delete_many({"kaynak": kaynak, "kaynak_id": kaynak_id})
    if kaynak == "hasat":
        await after_create_hasat(out)
    else:
        await after_create_satis(out)


# ----------------------------- Generic CRUD factory -----------------------------

def register_crud(path, collection, prefix, prep=None, after_create=None,
                  after_update=None, after_delete=None):

    @router.get(f"/{path}")
    async def list_items(user: dict = Depends(get_current_user)):
        docs = await db[collection].find().sort("created_at", -1).to_list(5000)
        return serialize_list(docs)

    @router.get(f"/{path}/{{item_id}}")
    async def get_item(item_id: str, user: dict = Depends(get_current_user)):
        doc = await db[collection].find_one({"_id": oid(item_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        return serialize(doc)

    @router.post(f"/{path}")
    async def create_item(payload: dict, user: dict = Depends(get_current_user)):
        doc = {k: v for k, v in payload.items() if k != "id"}
        doc["kod"] = await next_kod(prefix)
        if prep:
            doc = await prep(doc)
        doc["created_at"] = now_iso()
        res = await db[collection].insert_one(doc)
        doc["_id"] = res.inserted_id
        out = serialize(doc)
        if after_create:
            await after_create(out)
        return out

    @router.put(f"/{path}/{{item_id}}")
    async def update_item(item_id: str, payload: dict, user: dict = Depends(get_current_user)):
        existing = await db[collection].find_one({"_id": oid(item_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        doc = {k: v for k, v in payload.items() if k not in ("id", "_id", "kod", "created_at")}
        merged = {**existing, **doc}
        merged.pop("_id", None)
        if prep:
            merged = await prep(merged)
        await db[collection].update_one({"_id": oid(item_id)}, {"$set": merged})
        out = serialize({**merged, "_id": oid(item_id)})
        if after_update:
            await after_update(out)
        return out

    @router.delete(f"/{path}/{{item_id}}")
    async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
        res = await db[collection].delete_one({"_id": oid(item_id)})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
        if after_delete:
            await after_delete(item_id)
        return {"message": "Silindi"}


register_crud("cariler", "cariler", "C")
register_crud("bahceler", "bahceler", "B", prep=prep_bahce)
register_crud("hasatlar", "hasatlar", "H", prep=prep_hasat,
              after_create=after_create_hasat,
              after_update=lambda out: sync_stok("hasat", out["id"], out),
              after_delete=lambda iid: db.stok_hareketleri.delete_many({"kaynak": "hasat", "kaynak_id": iid}))
register_crud("odemeler", "odemeler", "O", prep=prep_odeme)
register_crud("nakliyeler", "nakliyeler", "N", prep=prep_nakliye)
register_crud("musteriler", "musteriler", "M")
register_crud("satislar", "satislar", "S", prep=prep_satis,
              after_create=after_create_satis,
              after_update=lambda out: sync_stok("satis", out["id"], out),
              after_delete=lambda iid: db.stok_hareketleri.delete_many({"kaynak": "satis", "kaynak_id": iid}))
register_crud("tahsilatlar", "tahsilatlar", "T", prep=prep_tahsilat)
register_crud("giderler", "giderler", "G")


# ----------------------------- Cari hesap (computed) -----------------------------

async def build_cari_hesap(cari):
    cid = str(cari["_id"])
    bahce_sayisi = await db.bahceler.count_documents({"cari_id": cid})
    hasatlar = await db.hasatlar.find({"cari_id": cid}).to_list(5000)
    odemeler = await db.odemeler.find({"cari_id": cid}).to_list(5000)
    toplam_kg = sum(num(h.get("net_kg")) for h in hasatlar)
    toplam_alis = sum(num(h.get("toplam_alis_tutari")) for h in hasatlar)
    odenen = sum(num(o.get("tutar")) for o in odemeler)
    kalan = round(toplam_alis - odenen, 2)

    today = datetime.now(timezone.utc).date().isoformat()
    vadesi_gelen = 0.0
    vadesi_gecen = 0.0
    for h in hasatlar:
        vt = h.get("vade_tarihi")
        if vt and num(h.get("toplam_alis_tutari")) > 0:
            if str(vt) < today:
                vadesi_gecen += num(h.get("toplam_alis_tutari"))
            else:
                vadesi_gelen += num(h.get("toplam_alis_tutari"))
    return {
        **serialize(cari),
        "bahce_sayisi": bahce_sayisi,
        "toplam_hasat_kg": round(toplam_kg, 2),
        "toplam_alis_tutari": round(toplam_alis, 2),
        "odenen_tutar": round(odenen, 2),
        "kalan_borc": kalan,
        "vadesi_gelen_borc": round(min(vadesi_gelen, max(kalan, 0)), 2),
        "vadesi_gecen_borc": round(vadesi_gecen, 2),
    }


@router.get("/cari-hesap")
async def cari_hesap_all(user: dict = Depends(get_current_user)):
    cariler = await db.cariler.find().sort("created_at", -1).to_list(5000)
    return [await build_cari_hesap(c) for c in cariler]


@router.get("/cari-hesap/{cari_id}")
async def cari_hesap_one(cari_id: str, user: dict = Depends(get_current_user)):
    cari = await db.cariler.find_one({"_id": oid(cari_id)})
    if not cari:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    hesap = await build_cari_hesap(cari)
    hesap["bahceler"] = serialize_list(await db.bahceler.find({"cari_id": cari_id}).to_list(5000))
    hesap["hasatlar"] = serialize_list(
        await db.hasatlar.find({"cari_id": cari_id}).sort("tarih", -1).to_list(5000))
    hesap["odemeler"] = serialize_list(
        await db.odemeler.find({"cari_id": cari_id}).sort("tarih", -1).to_list(5000))
    return hesap


# ----------------------------- Müşteri hesap (alacak) -----------------------------

@router.get("/musteri-hesap")
async def musteri_hesap_all(user: dict = Depends(get_current_user)):
    musteriler = await db.musteriler.find().sort("created_at", -1).to_list(5000)
    out = []
    for m in musteriler:
        mid = str(m["_id"])
        satislar = await db.satislar.find({"musteri_id": mid}).to_list(5000)
        tahsilatlar = await db.tahsilatlar.find({"musteri_id": mid}).to_list(5000)
        toplam_satis = sum(num(s.get("toplam_satis")) for s in satislar)
        toplam_tahsilat = sum(num(t.get("tutar")) for t in tahsilatlar)
        out.append({
            **serialize(m),
            "toplam_satis": round(toplam_satis, 2),
            "toplam_tahsilat": round(toplam_tahsilat, 2),
            "kalan_alacak": round(toplam_satis - toplam_tahsilat, 2),
        })
    return out


# ----------------------------- Stok (computed) -----------------------------

@router.get("/stok")
async def stok_durumu(user: dict = Depends(get_current_user)):
    hareketler = await db.stok_hareketleri.find().to_list(20000)
    grp = defaultdict(lambda: {"giris_kg": 0.0, "cikis_kg": 0.0})
    for h in hareketler:
        key = (h.get("urun", "Üzüm"), h.get("cesit", "") or "Belirtilmemiş")
        if h.get("tip") == "giris":
            grp[key]["giris_kg"] += num(h.get("kg"))
        else:
            grp[key]["cikis_kg"] += num(h.get("kg"))
    result = []
    for (urun, cesit), v in grp.items():
        result.append({
            "urun": urun, "cesit": cesit,
            "giris_kg": round(v["giris_kg"], 2),
            "cikis_kg": round(v["cikis_kg"], 2),
            "kalan_kg": round(v["giris_kg"] - v["cikis_kg"], 2),
        })
    result.sort(key=lambda x: x["cesit"])
    return result


@router.get("/stok-hareketleri")
async def stok_hareketleri(user: dict = Depends(get_current_user)):
    docs = await db.stok_hareketleri.find().sort("created_at", -1).to_list(20000)
    return serialize_list(docs)


# ----------------------------- Kâr hesabı -----------------------------

@router.get("/kar")
async def kar_hesabi(user: dict = Depends(get_current_user)):
    satislar = await db.satislar.find().to_list(20000)
    hasatlar = await db.hasatlar.find().to_list(20000)
    giderler = await db.giderler.find().to_list(20000)

    toplam_satis = sum(num(s.get("toplam_satis")) for s in satislar)
    satis_nakliye = sum(num(s.get("nakliye")) + num(s.get("diger_gider")) for s in satislar)
    toplam_alis_maliyet = sum(num(h.get("toplam_maliyet")) for h in hasatlar)
    toplam_gider = sum(num(g.get("tutar")) for g in giderler)
    toplam_kg = sum(num(h.get("net_kg")) for h in hasatlar)

    gercek_kar = round(toplam_satis - toplam_alis_maliyet - satis_nakliye - toplam_gider, 2)
    kar_orani = round((gercek_kar / toplam_satis * 100), 2) if toplam_satis else 0.0
    kg_basina = round(gercek_kar / toplam_kg, 2) if toplam_kg else 0.0

    detay = []
    for s in satislar:
        detay.append({
            **serialize(s),
        })
    return {
        "toplam_satis": round(toplam_satis, 2),
        "toplam_alis_maliyet": round(toplam_alis_maliyet, 2),
        "satis_giderleri": round(satis_nakliye, 2),
        "isletme_giderleri": round(toplam_gider, 2),
        "gercek_kar": gercek_kar,
        "kar_orani": kar_orani,
        "kg_basina_kar": kg_basina,
        "ton_basina_kar": round(kg_basina * 1000, 2),
        "toplam_kg": round(toplam_kg, 2),
        "detay": detay,
    }


# ----------------------------- Dashboard -----------------------------

@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    cariler = await db.cariler.find().to_list(20000)
    bahceler = await db.bahceler.find().to_list(20000)
    hasatlar = await db.hasatlar.find().to_list(20000)
    satislar = await db.satislar.find().to_list(20000)
    tahsilatlar = await db.tahsilatlar.find().to_list(20000)
    odemeler = await db.odemeler.find().to_list(20000)
    giderler = await db.giderler.find().to_list(20000)

    toplam_kg = sum(num(h.get("net_kg")) for h in hasatlar)
    toplam_alis = sum(num(h.get("toplam_alis_tutari")) for h in hasatlar)
    toplam_maliyet = sum(num(h.get("toplam_maliyet")) for h in hasatlar)
    toplam_satis = sum(num(s.get("toplam_satis")) for s in satislar)
    toplam_tahsilat = sum(num(t.get("tutar")) for t in tahsilatlar)
    toplam_odenen = sum(num(o.get("tutar")) for o in odemeler)
    toplam_gider = sum(num(g.get("tutar")) for g in giderler)
    toplam_borc = round(toplam_alis - toplam_odenen, 2)
    toplam_alacak = round(toplam_satis - toplam_tahsilat, 2)
    gercek_kar = round(toplam_satis - toplam_maliyet - toplam_gider
                       - sum(num(s.get("nakliye")) + num(s.get("diger_gider")) for s in satislar), 2)

    kpis = {
        "toplam_cari": len(cariler),
        "toplam_bahce": len(bahceler),
        "toplam_hasat": len(hasatlar),
        "toplam_kg": round(toplam_kg, 2),
        "toplam_alis": round(toplam_alis, 2),
        "toplam_satis": round(toplam_satis, 2),
        "toplam_tahsilat": round(toplam_tahsilat, 2),
        "toplam_borc": toplam_borc,
        "toplam_alacak": toplam_alacak,
        "gercek_kar": gercek_kar,
    }

    # Günlük hasat
    gunluk = defaultdict(lambda: {"miktar_kg": 0.0, "sefer_sayisi": 0})
    for h in hasatlar:
        d = str(h.get("tarih", ""))[:10]
        if d:
            gunluk[d]["miktar_kg"] += num(h.get("net_kg"))
            gunluk[d]["sefer_sayisi"] += 1
    gunluk_hasat = [{"tarih": k, **v} for k, v in sorted(gunluk.items())][-14:]

    # Bahçe bazında
    bahce_grp = defaultdict(float)
    for h in hasatlar:
        bahce_grp[h.get("bahce_kod", "?")] += num(h.get("net_kg"))
    bahce_kg = [{"name": k, "value": round(v, 2)} for k, v in
                sorted(bahce_grp.items(), key=lambda x: -x[1])[:10]]

    # Üzüm çeşidi
    cesit_grp = defaultdict(float)
    for h in hasatlar:
        cesit_grp[h.get("uzum_cesidi", "") or "Belirtilmemiş"] += num(h.get("net_kg"))
    cesit_kg = [{"name": k, "value": round(v, 2)} for k, v in cesit_grp.items()]

    # Aylık ciro & kâr, alış vs satış
    aylik = defaultdict(lambda: {"alis": 0.0, "satis": 0.0, "maliyet": 0.0})
    for h in hasatlar:
        m = str(h.get("tarih", ""))[:7]
        if m:
            aylik[m]["alis"] += num(h.get("toplam_alis_tutari"))
            aylik[m]["maliyet"] += num(h.get("toplam_maliyet"))
    for s in satislar:
        m = str(s.get("tarih", ""))[:7]
        if m:
            aylik[m]["satis"] += num(s.get("toplam_satis"))
    aylik_data = []
    for k in sorted(aylik.keys()):
        v = aylik[k]
        aylik_data.append({
            "ay": k, "alis_tutari": round(v["alis"], 2),
            "satis_tutari": round(v["satis"], 2),
            "kar": round(v["satis"] - v["maliyet"], 2),
        })

    # Cari borç dağılımı
    borc_dagilim = []
    for c in cariler:
        h = await build_cari_hesap(c)
        if h["kalan_borc"] > 0:
            borc_dagilim.append({"name": h.get("bag_sahibi", ""), "value": h["kalan_borc"]})
    borc_dagilim.sort(key=lambda x: -x["value"])
    borc_dagilim = borc_dagilim[:8]

    # Vadesi yaklaşan ödemeler
    today = datetime.now(timezone.utc).date().isoformat()
    vadeler = []
    for h in hasatlar:
        vt = h.get("vade_tarihi")
        if vt and num(h.get("toplam_alis_tutari")) > 0:
            vadeler.append({
                "bag_sahibi": h.get("bag_sahibi", ""), "kod": h.get("kod"),
                "vade_tarihi": vt, "tutar": num(h.get("toplam_alis_tutari")),
                "gecti": str(vt) < today,
            })
    vadeler.sort(key=lambda x: str(x["vade_tarihi"]))

    return {
        "kpis": kpis,
        "gunluk_hasat": gunluk_hasat,
        "bahce_kg": bahce_kg,
        "cesit_kg": cesit_kg,
        "aylik": aylik_data,
        "buy_sell": aylik_data,
        "borc_dagilim": borc_dagilim,
        "vadeler": vadeler[:10],
    }


# ----------------------------- Exports (Excel & PDF) -----------------------------

REPORT_CONFIG = {
    "cariler": {"title": "Cari Listesi", "cols": [
        ("kod", "Cari ID"), ("bag_sahibi", "Bağ Sahibi"), ("telefon", "Telefon"),
        ("tc_vergi_no", "TC/Vergi No"), ("koy_mahalle", "Köy/Mahalle"),
        ("iban", "IBAN"), ("banka", "Banka")]},
    "bahceler": {"title": "Bahçe Listesi", "cols": [
        ("kod", "Bahçe ID"), ("bag_sahibi", "Bağ Sahibi"), ("koy_mevki", "Köy/Mevki"),
        ("ada", "Ada"), ("parsel", "Parsel"), ("alan_dekar", "Alan (dekar)"),
        ("uzum_cesidi", "Üzüm Çeşidi"), ("tahmini_verim", "Tahmini Verim")]},
    "hasatlar": {"title": "Günlük Hasat Raporu", "cols": [
        ("kod", "Hasat ID"), ("tarih", "Tarih"), ("bahce_kod", "Bahçe"),
        ("bag_sahibi", "Bağ Sahibi"), ("uzum_cesidi", "Çeşit"),
        ("net_kg", "Net Kg"), ("alis_fiyati", "Fiyat"),
        ("toplam_alis_tutari", "Alış Tutarı"), ("toplam_maliyet", "Toplam Maliyet")]},
    "odemeler": {"title": "Ödeme Raporu", "cols": [
        ("kod", "Ödeme ID"), ("tarih", "Tarih"), ("bag_sahibi", "Bağ Sahibi"),
        ("tutar", "Tutar"), ("odeme_yontemi", "Yöntem"), ("aciklama", "Açıklama")]},
    "nakliyeler": {"title": "Nakliye Raporu", "cols": [
        ("kod", "Nakliye ID"), ("tarih", "Tarih"), ("plaka", "Plaka"),
        ("sofor", "Şoför"), ("nereden", "Nereden"), ("nereye", "Nereye"),
        ("kg", "Kg"), ("nakliye_bedeli", "Bedel")]},
    "satislar": {"title": "Satış Raporu", "cols": [
        ("kod", "Satış ID"), ("tarih", "Tarih"), ("musteri_ad", "Müşteri"),
        ("cesit", "Çeşit"), ("kg", "Kg"), ("birim_satis_fiyati", "Birim Fiyat"),
        ("toplam_satis", "Toplam"), ("tahsilat", "Tahsilat"), ("kalan_alacak", "Kalan")]},
    "tahsilatlar": {"title": "Tahsilat Raporu", "cols": [
        ("kod", "Tahsilat ID"), ("tarih", "Tarih"), ("musteri_ad", "Müşteri"),
        ("tutar", "Tutar"), ("odeme_yontemi", "Yöntem")]},
    "giderler": {"title": "Gider Raporu", "cols": [
        ("kod", "Gider ID"), ("tarih", "Tarih"), ("kategori", "Kategori"),
        ("aciklama", "Açıklama"), ("tutar", "Tutar")]},
}


async def fetch_report_rows(report):
    if report == "stok":
        return await _stok_rows()
    if report == "cari-borc":
        return await _cari_borc_rows()
    docs = await db[report].find().sort("created_at", -1).to_list(20000)
    return serialize_list(docs)


async def _stok_rows():
    hareketler = await db.stok_hareketleri.find().to_list(20000)
    grp = defaultdict(lambda: {"giris_kg": 0.0, "cikis_kg": 0.0})
    for h in hareketler:
        key = (h.get("urun", "Üzüm"), h.get("cesit", "") or "Belirtilmemiş")
        if h.get("tip") == "giris":
            grp[key]["giris_kg"] += num(h.get("kg"))
        else:
            grp[key]["cikis_kg"] += num(h.get("kg"))
    return [{"urun": u, "cesit": c, "giris_kg": round(v["giris_kg"], 2),
             "cikis_kg": round(v["cikis_kg"], 2),
             "kalan_kg": round(v["giris_kg"] - v["cikis_kg"], 2)}
            for (u, c), v in grp.items()]


async def _cari_borc_rows():
    cariler = await db.cariler.find().to_list(20000)
    return [await build_cari_hesap(c) for c in cariler]


EXTRA_CONFIG = {
    "stok": {"title": "Stok Raporu", "cols": [
        ("urun", "Ürün"), ("cesit", "Çeşit"), ("giris_kg", "Giriş Kg"),
        ("cikis_kg", "Çıkış Kg"), ("kalan_kg", "Kalan Kg")]},
    "cari-borc": {"title": "Cari Borç Raporu", "cols": [
        ("kod", "Cari ID"), ("bag_sahibi", "Bağ Sahibi"),
        ("toplam_hasat_kg", "Toplam Kg"), ("toplam_alis_tutari", "Toplam Alış"),
        ("odenen_tutar", "Ödenen"), ("kalan_borc", "Kalan Borç"),
        ("vadesi_gecen_borc", "Vadesi Geçen")]},
}


def get_config(report):
    return REPORT_CONFIG.get(report) or EXTRA_CONFIG.get(report)


@router.get("/export/{report}/excel")
async def export_excel(report: str, user: dict = Depends(get_current_user)):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    cfg = get_config(report)
    if not cfg:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    rows = await fetch_report_rows(report)
    wb = Workbook()
    ws = wb.active
    ws.title = cfg["title"][:31]
    header_fill = PatternFill(start_color="8B1E3F", end_color="8B1E3F", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    for ci, (_, label) in enumerate(cfg["cols"], 1):
        cell = ws.cell(row=1, column=ci, value=label)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    for ri, row in enumerate(rows, 2):
        for ci, (key, _) in enumerate(cfg["cols"], 1):
            ws.cell(row=ri, column=ci, value=row.get(key, ""))
    for ci, (_, label) in enumerate(cfg["cols"], 1):
        ws.column_dimensions[ws.cell(row=1, column=ci).column_letter].width = max(14, len(label) + 4)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{report}.xlsx"'})


@router.get("/export/{report}/pdf")
async def export_pdf(report: str, user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    cfg = get_config(report)
    if not cfg:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    rows = await fetch_report_rows(report)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                            topMargin=1.2 * cm, bottomMargin=1 * cm,
                            leftMargin=1 * cm, rightMargin=1 * cm)
    styles = getSampleStyleSheet()
    elems = [Paragraph(f"AKGEDİK ÜZÜM YÖNETİM SİSTEMİ - {cfg['title']}", styles["Title"]),
             Spacer(1, 0.4 * cm)]
    headers = [label for _, label in cfg["cols"]]
    data = [headers]
    for r in rows:
        data.append([str(r.get(k, "")) for k, _ in cfg["cols"]])
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8B1E3F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#9CA3AF")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    elems.append(table)
    doc.build(elems)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{report}.pdf"'})
