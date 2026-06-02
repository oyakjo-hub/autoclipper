"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, KeyRound } from "lucide-react";

export function AdminUnlockForm() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Password tidak valid");
      }

      // Reload page to enter dashboard
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-[#030712] flex items-center justify-center px-6">
      <Card className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-violet-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Area Terbatas
          </CardTitle>
          <CardDescription className="text-slate-400 mt-1.5 text-sm">
            Masukkan password admin untuk membuka kunci dashboard AutoClipper AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="password"
                placeholder="Masukkan Password Admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white focus-visible:ring-violet-500/50"
                required
              />
            </div>
            
            {error && (
              <p className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/50 p-2.5 rounded-lg text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
            >
              {isLoading ? "Memverifikasi..." : "Masuk Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
