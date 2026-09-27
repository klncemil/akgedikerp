import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Grape, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="https://images.unsplash.com/photo-1537640538966-79f369143f8f?crop=entropy&cs=srgb&fm=jpg&q=85"
          alt="Bağ"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute bottom-12 left-12 right-12">
          <h2 className="font-heading text-4xl font-bold text-white">Alaşehir & Manisa Bölgesi</h2>
          <p className="mt-3 max-w-md text-lg text-white/80">
            Dijital üzüm ticareti yönetimi — bağdan sofraya tüm süreçleriniz tek panelde.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2 grape-gradient">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Grape className="h-7 w-7" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold tracking-tight">AKGEDİK</div>
              <div className="text-xs text-muted-foreground">Üzüm Yönetim Sistemi</div>
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold">Sisteme Giriş</h1>
          <p className="mt-1 text-sm text-muted-foreground">Devam etmek için giriş yapın.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="login-form">
            <div>
              <Label className="mb-1.5 block">E-posta</Label>
              <Input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@akgedik.com"
                required
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Şifre</Label>
              <Input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p data-testid="login-error" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Giriş Yap
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
