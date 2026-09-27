import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import CrudModule from "@/components/CrudModule";
import { ENTITIES } from "@/config/entities";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import GunlukTakip from "@/pages/GunlukTakip";
import Cari from "@/pages/Cari";
import Stok from "@/pages/Stok";
import Raporlar from "@/pages/Raporlar";
import Ayarlar from "@/pages/Ayarlar";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Yükleniyor...
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}

const E = (key) => <CrudModule config={ENTITIES[key]} />;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cari" element={<Cari />} />
            <Route path="/bahceler" element={E("bahceler")} />
            <Route path="/gunluk-takip" element={<GunlukTakip />} />
            <Route path="/kantar" element={E("kantar")} />
            <Route path="/alislar" element={E("alislar")} />
            <Route path="/odemeler" element={E("odemeler")} />
            <Route path="/nakliye" element={E("nakliyeler")} />
            <Route path="/stok" element={<Stok />} />
            <Route path="/musteriler" element={E("musteriler")} />
            <Route path="/satislar" element={E("satislar")} />
            <Route path="/tahsilatlar" element={E("tahsilatlar")} />
            <Route path="/giderler" element={E("giderler")} />
            <Route path="/raporlar" element={<Raporlar />} />
            <Route path="/ayarlar" element={<Ayarlar />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
