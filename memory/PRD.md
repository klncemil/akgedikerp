# AKGEDİK ÜZÜM YÖNETİM SİSTEMİ — PRD

## Problem Statement
Türkçe, modern, kurumsal bir web tabanlı tarım & üzüm ticareti ERP sistemi. Akgedik Gıda'nın cari, bahçe, hasat, kantar, alış, nakliye, stok, satış, cari hesap, tahsilat ve kâr süreçlerini ilişkisel veritabanı ile tek panelde yönetir. Ana akış: Cari → Bahçe → Hasat → Kantar → Alış → Ödeme.

## Architecture
- **Backend**: FastAPI (server.py, auth.py, routes.py, database.py). MongoDB (motor). JWT httpOnly cookie auth. CORS allow_origin_regex.
- **Frontend**: React 19 + React Router + Tailwind (dark corporate theme, Outfit/Inter fonts) + Recharts + framer-motion + shadcn/ui + sonner.
- **IDs**: Human-readable sequential codes (C001, B001, H001, O001, S001...) via `counters` collection; relations by Mongo ObjectId string in `*_id` fields; data denormalized on save (bag_sahibi, uzum_cesidi vb.) to avoid re-entry.

## User Personas
- Akgedik Gıda yöneticisi/operatörü (admin: cemil63@gmail.com).

## Core Requirements (static)
- Relational, no double data entry. Cascading dropdowns. Auto calculations (net kg, alış tutarı, toplam maliyet, cari bakiye, stok, kâr). Excel & PDF export. Rich dashboard. Full Turkish UI, responsive.

## Implemented (2026-06)
- JWT login (admin seed), protected routes, 15-item sidebar.
- Cariler CRUD + otomatik cari hesap (bahçe sayısı, toplam kg, toplam alış, ödenen, kalan borç, vadesi gelen/geçen) + detay dialog.
- Bahçeler CRUD (cari relation, denormalized bağ sahibi).
- Günlük Hasat Takibi: cari→bahçe cascading, auto-fill, canlı net kg + toplam maliyet hesabı, stoğa otomatik giriş.
- Kantar & Alışlar: hasat kayıtları üzerinden read-only görünümler.
- Müstahsil Ödemeleri (cari borcu otomatik azaltır).
- Müşteriler, Toptan Satışlar (auto toplam & kalan alacak), Tahsilatlar (alacak azaltır).
- Nakliye, Giderler CRUD.
- Stok: hasat giriş / satış çıkış otomatik, kalan kg.
- Dashboard: 10 KPI + 6 grafik (günlük hasat, aylık ciro/kâr, bahçe/çeşit dağılımı, alış vs satış, cari borç) + vadesi yaklaşan ödemeler.
- Raporlar: Gerçek Kâr analizi + Excel/PDF export (11 rapor türü).
- Ayarlar.

## Backlog / Remaining
- P1: shadcn tarih seçici (native date input yerine), ödeme planı (%40 peşin/%60 vadeli) detaylı takvim.
- P2: Dialog a11y açıklamaları; kullanıcı yönetimi (çoklu kullanıcı/rol); gelişmiş rapor filtreleri (tarih aralığı).

## Bug Fixes
- 2026-06: Dashboard `removeChild`/`NotFoundError` crash — root cause was browser auto-translation of the Turkish UI moving text nodes out from under React. Fixed by setting `lang="tr" translate="no" class="notranslate"` on `<html>` and `#root`, plus `<meta name="google" content="notranslate">`. Verified crash-free.

## Test Credentials
- cemil63@gmail.com / akgedik2026 (admin)
