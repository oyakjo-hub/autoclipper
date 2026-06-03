"use client";

import { useState } from "react";
import { signUp, signIn } from "../../lib/auth-client";
import { track } from "@/lib/datafast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Step 1: Daftar akun baru
    const signUpResponse = await signUp.email({
      email,
      password,
      name,
    });

    if (signUpResponse?.error) {
      const rawMsg = signUpResponse.error.message || "";
      if (rawMsg.toLowerCase().includes("already exists") || rawMsg.toLowerCase().includes("email")) {
        setMessage("Email sudah terdaftar. Silakan gunakan email lain atau masuk.");
      } else if (rawMsg.toLowerCase().includes("password") && rawMsg.toLowerCase().includes("short")) {
        setMessage("Password terlalu pendek. Gunakan minimal 8 karakter.");
      } else if (rawMsg.toLowerCase().includes("sign up is disabled")) {
        setMessage("Pendaftaran akun baru sedang ditutup sementara.");
      } else {
        setMessage(rawMsg || "Gagal membuat akun. Silakan coba lagi.");
      }
      setLoading(false);
      return;
    }

    track("signup_completed", {
      auth_method: "email",
    });

    setMessage("Akun berhasil dibuat! Sedang masuk...");

    // Step 2: Langsung sign-in setelah register berhasil (Better Auth tidak otomatis login)
    const signInResponse = await signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (signInResponse?.error) {
      // Registrasi berhasil tapi login gagal - minta user login manual
      setMessage("Akun berhasil dibuat! Silakan masuk dengan email dan password Anda.");
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 2000);
      return;
    }

    // Login berhasil - redirect ke halaman utama
    setTimeout(() => {
      window.location.href = "/";
    }, 500);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Daftar Akun</CardTitle>
        <CardDescription>Buat akun baru untuk memulai</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            autoComplete="name"
          />
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
            placeholder="Password (min. 8 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memproses..." : "Daftar"}
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
