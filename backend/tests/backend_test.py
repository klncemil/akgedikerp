"""End-to-end backend tests for Akgedik Üzüm Yönetim Sistemi.

Covers: auth, cariler/bahceler/hasatlar (relational flow), musteri/satis/tahsilat,
stok computation, cari-hesap aggregation, dashboard, kar, exports.
"""
import os
import io
import pytest
import requests

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    fe = "/app/frontend/.env"
    if os.path.exists(fe):
        for line in open(fe):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")


BASE = _load_backend_url()
API = f"{BASE}/api"
ADMIN_EMAIL = "cemil63@gmail.com"
ADMIN_PASSWORD = "akgedik2026"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    return s


@pytest.fixture(scope="session")
def ctx():
    return {}


class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401
        assert "hatalı" in r.text.lower() or "hatal" in r.text.lower()

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_ok(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


class TestRelationalFlow:
    def test_1_create_cari(self, session, ctx):
        payload = {"bag_sahibi": "TEST_Ahmet Demir", "telefon": "5551234567",
                   "tc_vergi_no": "12345678901", "koy_mahalle": "TEST Köy",
                   "iban": "TR00", "banka": "Ziraat"}
        r = session.post(f"{API}/cariler", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kod"].startswith("C")
        assert d["bag_sahibi"] == "TEST_Ahmet Demir"
        assert "id" in d
        ctx["cari_id"] = d["id"]
        ctx["cari_kod"] = d["kod"]

        # Verify persistence
        rl = session.get(f"{API}/cariler", timeout=15).json()
        assert any(x["id"] == d["id"] for x in rl)

    def test_2_create_bahce(self, session, ctx):
        payload = {"cari_id": ctx["cari_id"], "koy_mevki": "TEST Mevki",
                   "ada": "1", "parsel": "2", "alan_dekar": 10,
                   "uzum_cesidi": "Sultaniye", "urun": "Üzüm"}
        r = session.post(f"{API}/bahceler", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kod"].startswith("B")
        # Auto denormalized bag_sahibi
        assert d["bag_sahibi"] == "TEST_Ahmet Demir"
        assert d["cari_kod"] == ctx["cari_kod"]
        ctx["bahce_id"] = d["id"]
        ctx["bahce_kod"] = d["kod"]

    def test_3_create_hasat_computed(self, session, ctx):
        payload = {"bahce_id": ctx["bahce_id"], "tarih": "2026-01-15",
                   "kantar_kg": 1000, "kasa_tara": 50,
                   "alis_fiyati": 20, "iscilik": 100, "nakliye": 200,
                   "diger_gider": 50}
        r = session.post(f"{API}/hasatlar", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["net_kg"] == 950  # 1000-50
        assert d["toplam_alis_tutari"] == 19000.0  # 950*20
        assert d["toplam_maliyet"] == 19350.0  # 19000+100+200+50
        assert d["bag_sahibi"] == "TEST_Ahmet Demir"
        assert d["uzum_cesidi"] == "Sultaniye"
        ctx["hasat_id"] = d["id"]

    def test_4_cari_hesap_aggregation(self, session, ctx):
        r = session.get(f"{API}/cari-hesap", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        row = next(x for x in rows if x["id"] == ctx["cari_id"])
        assert row["bahce_sayisi"] == 1
        assert row["toplam_hasat_kg"] == 950
        assert row["toplam_alis_tutari"] == 19000.0
        assert row["kalan_borc"] == 19000.0

    def test_5_cari_hesap_detail(self, session, ctx):
        r = session.get(f"{API}/cari-hesap/{ctx['cari_id']}", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["bahceler"]) == 1
        assert len(d["hasatlar"]) == 1
        assert d["odemeler"] == []

    def test_6_odeme_reduces_borc(self, session, ctx):
        r = session.post(f"{API}/odemeler",
                         json={"cari_id": ctx["cari_id"], "tarih": "2026-01-16",
                               "tutar": 5000, "odeme_yontemi": "havale",
                               "aciklama": "TEST_odeme"}, timeout=15)
        assert r.status_code == 200, r.text
        rows = session.get(f"{API}/cari-hesap", timeout=15).json()
        row = next(x for x in rows if x["id"] == ctx["cari_id"])
        assert row["odenen_tutar"] == 5000
        assert row["kalan_borc"] == 14000.0

    def test_7_musteri_satis_tahsilat(self, session, ctx):
        r = session.post(f"{API}/musteriler",
                         json={"ad": "TEST_Alıcı", "telefon": "555", "adres": "x"},
                         timeout=15)
        assert r.status_code == 200
        mid = r.json()["id"]
        ctx["musteri_id"] = mid

        r = session.post(f"{API}/satislar",
                         json={"musteri_id": mid, "tarih": "2026-01-17",
                               "cesit": "Sultaniye", "kg": 500,
                               "birim_satis_fiyati": 30, "tahsilat": 0,
                               "nakliye": 100, "diger_gider": 0}, timeout=15)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["toplam_satis"] == 15000.0
        assert s["kalan_alacak"] == 15000.0
        ctx["satis_id"] = s["id"]

        r = session.post(f"{API}/tahsilatlar",
                         json={"musteri_id": mid, "tarih": "2026-01-18",
                               "tutar": 3000, "odeme_yontemi": "nakit"}, timeout=15)
        assert r.status_code == 200

        rows = session.get(f"{API}/musteri-hesap", timeout=15).json()
        row = next(x for x in rows if x["id"] == mid)
        assert row["toplam_satis"] == 15000.0
        assert row["toplam_tahsilat"] == 3000.0
        assert row["kalan_alacak"] == 12000.0

    def test_8_stok_movements(self, session, ctx):
        r = session.get(f"{API}/stok", timeout=15)
        assert r.status_code == 200
        rows = r.json()
        # Should have Sultaniye with giris=950, cikis=500
        sult = next((x for x in rows if x["cesit"] == "Sultaniye"), None)
        assert sult is not None, f"Sultaniye not in stok: {rows}"
        assert sult["giris_kg"] >= 950
        assert sult["cikis_kg"] >= 500
        assert sult["kalan_kg"] == round(sult["giris_kg"] - sult["cikis_kg"], 2)

    def test_9_gider_nakliye(self, session):
        r = session.post(f"{API}/giderler",
                         json={"tarih": "2026-01-19", "kategori": "yakit",
                               "aciklama": "TEST", "tutar": 500}, timeout=15)
        assert r.status_code == 200
        r = session.post(f"{API}/nakliyeler",
                         json={"tarih": "2026-01-19", "plaka": "34ABC",
                               "sofor": "Ali", "nereden": "A", "nereye": "B",
                               "kg": 500, "nakliye_bedeli": 800}, timeout=15)
        assert r.status_code == 200

    def test_a_dashboard(self, session):
        r = session.get(f"{API}/dashboard", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["kpis"]["toplam_hasat"] >= 1
        assert d["kpis"]["toplam_kg"] >= 950
        assert d["kpis"]["toplam_satis"] >= 15000
        assert isinstance(d["gunluk_hasat"], list)
        assert isinstance(d["bahce_kg"], list)
        assert isinstance(d["cesit_kg"], list)

    def test_b_kar(self, session):
        r = session.get(f"{API}/kar", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Gercek kar = satis - alis maliyet - satis giderleri - isletme giderleri
        expected = round(d["toplam_satis"] - d["toplam_alis_maliyet"]
                         - d["satis_giderleri"] - d["isletme_giderleri"], 2)
        assert d["gercek_kar"] == expected


class TestExports:
    @pytest.mark.parametrize("report", ["cariler", "hasatlar", "satislar", "stok", "cari-borc"])
    def test_excel(self, session, report):
        r = session.get(f"{API}/export/{report}/excel", timeout=30)
        assert r.status_code == 200, f"{report}: {r.text[:200]}"
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert r.content[:2] == b"PK"  # xlsx = zip
        assert len(r.content) > 200

    @pytest.mark.parametrize("report", ["cariler", "hasatlar", "satislar", "stok", "cari-borc"])
    def test_pdf(self, session, report):
        r = session.get(f"{API}/export/{report}/pdf", timeout=30)
        assert r.status_code == 200, f"{report}: {r.text[:200]}"
        assert "pdf" in r.headers.get("content-type", "")
        assert r.content[:4] == b"%PDF"


class TestCleanup:
    def test_delete_all(self, session, ctx):
        # Delete created records to keep db clean
        for path, key in [("satislar", "satis_id"), ("hasatlar", "hasat_id"),
                          ("bahceler", "bahce_id"), ("cariler", "cari_id"),
                          ("musteriler", "musteri_id")]:
            if key in ctx:
                r = session.delete(f"{API}/{path}/{ctx[key]}", timeout=15)
                assert r.status_code == 200, f"{path} delete failed: {r.text}"
