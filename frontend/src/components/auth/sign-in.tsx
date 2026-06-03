"use client";

import { useState } from "react";
import { signIn } from "../../lib/auth-client";
import { track } from "@/lib/datafast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useRouter } from "next/navigation";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await signIn.email({
      email,
      password,
      fetchOptions: {
        onError(ctx) {
          setMessage(ctx.error.message || "Login gagal. Periksa email dan password Anda.");
        },
      },
    });

    if (response?.error) {
      const rawMsg = response.error.message || "";
      // Terjemahkan pesan error umum ke Bahasa Indonesia
      if (rawMsg.toLowerCase().includes("invalid") || rawMsg.toLowerCase().includes("credentials")) {
        setMessage("Email atau password tidak valid. Silakan coba lagi.");
      } else if (rawMsg.toLowerCase().includes("not found") || rawMsg.toLowerCase().includes("no user")) {
        setMessage("Akun dengan email ini tidak ditemukan.");
      } else if (rawMsg.toLowerCase().includes("disabled") || rawMsg.toLowerCase().includes("banned")) {
        setMessage("Akun ini dinonaktifkan. Hubungi administrator.");
      } else {
        setMessage(rawMsg || "Login gagal. Periksa email dan password Anda.");
      }
      setLoading(false);
      return;
    }

    track("signin_completed", {
      auth_method: "email",
    });

    setMessage("Login berhasil! Mengalihkan...");
    setLoading(false);

    // Setelah login berhasil, gunakan router.refresh() agar session diperbarui,
    // lalu redirect ke home (halaman utama mendeteksi is_admin sendiri).
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 300);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>Masuk ke akun Anda untuk melanjutkan</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sedang masuk..." : "Masuk"}
          </Button>
        </form>
        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes("berhasil") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
