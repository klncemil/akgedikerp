import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Trees, CalendarCheck, Scale, ShoppingBag,
  Wallet, Truck, Boxes, Building2, TrendingUp, Receipt, CircleDollarSign,
  FileSpreadsheet, Settings, Grape, LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ITEMS = [
  { to: "/dashboard", label: "Gösterge Paneli", icon: LayoutDashboard },
  { to: "/cari", label: "Cari Kayıtları", icon: Users },
  { to: "/bahceler", label: "Bahçeler & Bağlar", icon: Trees },
  { to: "/gunluk-takip", label: "Günlük Hasat Takibi", icon: CalendarCheck },
  { to: "/kantar", label: "Kantar İşlemleri", icon: Scale },
  { to: "/alislar", label: "Üzüm Alışları", icon: ShoppingBag },
  { to: "/odemeler", label: "Müstahsil Ödemeleri", icon: Wallet },
  { to: "/nakliye", label: "Nakliye & Lojistik", icon: Truck },
  { to: "/stok", label: "Depo & Stok", icon: Boxes },
  { to: "/musteriler", label: "Müşteriler", icon: Building2 },
  { to: "/satislar", label: "Toptan Satışlar", icon: TrendingUp },
  { to: "/tahsilatlar", label: "Tahsilatlar", icon: Receipt },
  { to: "/giderler", label: "İşletme Giderleri", icon: CircleDollarSign },
  { to: "/raporlar", label: "Raporlar & Analiz", icon: FileSpreadsheet },
  { to: "/ayarlar", label: "Sistem Ayarları", icon: Settings },
];

export function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Grape className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <div className="font-heading text-sm font-bold tracking-tight text-foreground">AKGEDİK</div>
          <div className="text-[11px] font-medium text-muted-foreground">Üzüm Yönetim Sistemi</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              data-testid={`nav-${item.to.replace("/", "")}`}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-[18px] w-[18px] ${isActive ? "" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-2 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">{user?.name || "Yönetici"}</div>
          <div className="truncate">{user?.email}</div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
