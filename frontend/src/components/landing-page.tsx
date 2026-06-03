"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Youtube,
  ArrowRight,
  Target,
  ScanFace,
  Type,
  Film,
  MonitorPlay,
  Share2,
  Wand2,
  ChevronDown,
  Check,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { isLandingOnlyModeEnabled } from "@/lib/app-flags";
import { getPublicBillingPlans } from "@/lib/billing-plans";

function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

const FEATURES = [
  {
    icon: ScanFace,
    title: "Deteksi Wajah Pintar (9:16)",
    description:
      "Teknologi MediaPipe + OpenCV otomatis mendeteksi & mengikuti wajah agar subjek selalu berada di tengah frame vertikal.",
  },
  {
    icon: Type,
    title: "Subtitle Otomatis Sinkron Kata",
    description:
      "Transkripsi audio instan menghasilkan subtitle dinamis yang sinkron per kata dengan animasi trendi ala konten kreator populer.",
  },
  {
    icon: Target,
    title: "Prediksi Skor Viralitas AI",
    description:
      "Kecerdasan buatan menganalisis hook, isi konten, dan emosi untuk memberikan skor potensi viral (0 - 100) sebelum Anda unggah.",
  },
  {
    icon: Film,
    title: "Overlay B-Roll Otomatis",
    description:
      "Secara otomatis mendeteksi konteks pembicaraan dan menyisipkan footage video B-Roll relevan dari Pexels untuk menjaga retensi penonton.",
  },
  {
    icon: Sparkles,
    title: "Template Subtitle Variatif",
    description:
      "Berbagai gaya animasi teks, preset font modern, dan skema warna menarik untuk disesuaikan dengan identitas brand Anda.",
  },
  {
    icon: MonitorPlay,
    title: "Preset Ekspor Sekali Klik",
    description:
      "Optimasi otomatis dan sekali klik untuk langsung mempublikasikan video ke TikTok, Instagram Reels, dan YouTube Shorts.",
  },
];

function getPlans() {
  const publicPlans = getPublicBillingPlans();
  return [
    {
      name: "Gratis / Trial",
      price: "$0",
      period: "selamanya",
      description: "Untuk mencoba fitur dan mulai membuat klip pendek.",
      features: [
        "5 video klip per bulan",
        "Deteksi wajah otomatis (9:16)",
        "Subtitle sinkron kata",
        "Semua preset ekspor standar",
        "Tanpa kartu kredit",
      ],
      cta: "Mulai Gratis",
      ctaHref: "/sign-up",
      highlighted: false,
    },
    ...publicPlans.map((plan) => {
      const isPro = plan.id === "pro";
      return {
        name: isPro ? "Pro" : "Scale",
        price: `$${plan.priceMonthly}`,
        period: "/bulan",
        description: isPro 
          ? "Untuk pembuat konten aktif yang ingin hasil maksimal." 
          : "Untuk tim media, agensi, dan produksi skala besar.",
        features: isPro ? [
          `${plan.generationLimit} video klip per bulan`,
          "Deteksi wajah presisi tinggi",
          "Semua template subtitle premium",
          "Overlay B-Roll otomatis",
          "Ekspor cepat prioritas",
        ] : [
          `${plan.generationLimit} video klip per bulan`,
          "Pemrosesan antrean prioritas ultra cepat",
          "Semua fitur Pro tanpa batasan",
          "Akses awal ke fitur baru",
          "Dukungan prioritas 24/7",
        ],
        cta: isPro ? "Pilih Paket Pro" : "Pilih Paket Scale",
        ctaHref: "/sign-up",
        highlighted: plan.highlighted,
      };
    })
  ];
}

const STEPS = [
  {
    num: "01",
    title: "Unggah Video / Tempel Link",
    description:
      "Tempel tautan video YouTube atau seret file video panjang Anda ke dalam dashboard pendaftaran.",
    icon: Youtube,
  },
  {
    num: "02",
    title: "AI Memproses & Memotong",
    description:
      "Kecerdasan buatan menyalin audio, menilai viralitas, mendeteksi wajah, dan membuat klip-klip terbaik secara otomatis.",
    icon: Wand2,
  },
  {
    num: "03",
    title: "Unduh Klip Viral Anda",
    description:
      "Dapatkan klip video vertikal ber-subtitle menarik yang sudah dipotong rapi dan siap meledak di media sosial.",
    icon: Share2,
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const authEnabled = !isLandingOnlyModeEnabled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-violet-600 selection:text-white overflow-x-hidden">
      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#030712]/80 backdrop-blur-xl border-b border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Image
                src="/logo.png"
                alt="AutoClipper AI"
                width={20}
                height={20}
                className="rounded-md transition-transform group-hover:scale-105"
              />
            </div>
            <span
              className="text-lg font-bold tracking-tight text-white"
              style={{
                fontFamily:
                  "var(--font-syne), var(--font-geist-sans), system-ui",
              }}
            >
              AutoClipper AI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cara Kerja
            </a>
            <a
              href="#features"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Fitur
            </a>
            <a
              href="#pricing"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Harga
            </a>
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {authEnabled ? (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
                    Masuk
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    Mulai Sekarang
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/sign-up">
                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0">
                  Mulai Sekarang
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#030712]/95 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-6 py-4 space-y-1">
              <a
                href="#how-it-works"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/30 transition-colors"
              >
                Cara Kerja
              </a>
              <a
                href="#features"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/30 transition-colors"
              >
                Fitur
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800/30 transition-colors"
              >
                Harga
              </a>
              <Separator className="my-2 border-slate-800" />
              <div className="flex flex-col gap-2 px-3 pt-1">
                {authEnabled ? (
                  <>
                    <Link href="/sign-in" onClick={() => setMobileNavOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                        Masuk
                      </Button>
                    </Link>
                    <Link href="/sign-up" onClick={() => setMobileNavOpen(false)}>
                      <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                        Mulai Sekarang
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/sign-up" onClick={() => setMobileNavOpen(false)}>
                    <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                      Mulai Sekarang
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        {/* Glow gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left: Text */}
            <div>
              <Badge
                variant="secondary"
                className="mb-6 gap-2 bg-slate-900 border border-slate-800 text-violet-400 py-1.5 px-3"
                style={{ animation: "landing-fade-in-up 0.6s ease-out both" }}
              >
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                ✨ AI Video Clipper & Editor Otomatis
              </Badge>

              <h1
                className="text-4xl sm:text-5xl lg:text-[3.8rem] font-extrabold leading-[1.08] tracking-tight text-white mb-6"
                style={{
                  fontFamily:
                    "var(--font-syne), var(--font-geist-sans), system-ui",
                  animation: "landing-fade-in-up 0.6s ease-out 0.1s both",
                }}
              >
                Ubah Video Panjang
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
                  Menjadi Klip Viral
                </span>
              </h1>

              <p
                className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg mb-10"
                style={{
                  animation: "landing-fade-in-up 0.6s ease-out 0.2s both",
                }}
              >
                AutoClipper AI memotong podcast, talkshow, dan video panjang Anda secara otomatis menggunakan kecerdasan buatan untuk menghasilkan klip Shorts, Reels, dan TikTok dengan engagement tinggi.
              </p>

              <div
                className="flex flex-wrap gap-4 mb-10"
                style={{
                  animation: "landing-fade-in-up 0.6s ease-out 0.3s both",
                }}
              >
                <Link href="/sign-up">
                  <Button size="lg" className="px-8 h-12 text-sm bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 border-0 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300">
                    Mulai Potong Gratis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="ghost" size="lg" className="px-8 h-12 text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-300">
                    Pelajari Cara Kerja
                  </Button>
                </a>
              </div>

              <div
                className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500"
                style={{
                  animation: "landing-fade-in-up 0.6s ease-out 0.4s both",
                }}
              >
                {[
                  { icon: ScanFace, label: "9:16 Auto-Crop Wajah" },
                  { icon: Type, label: "Subtitle Sinkron Kata" },
                  { icon: Target, label: "Penilaian Viralitas AI" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual */}
            <div
              className="relative flex justify-center lg:justify-end"
              style={{ animation: "landing-fade-in-up 0.8s ease-out 0.3s both" }}
            >
              <HeroVisual />
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
          <ChevronDown className="w-5 h-5 text-slate-600 animate-bounce" />
        </div>
      </section>

      <Separator className="bg-slate-850" />

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-slate-950/40 relative">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-violet-400 mb-3">
              Cara Kerja
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white"
              style={{
                fontFamily:
                  "var(--font-syne), var(--font-geist-sans), system-ui",
              }}
            >
              Tiga Langkah Mudah. Tanpa Ribet.
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.1}>
                <Card className="h-full py-0 gap-0 bg-slate-900/30 backdrop-blur-md border border-slate-800/60 hover:border-cyan-500/30 transition-all duration-500 group">
                  <CardContent className="p-8">
                    <span
                      className="text-6xl font-black leading-none block mb-6 bg-clip-text text-transparent bg-gradient-to-b from-slate-700/40 to-transparent select-none group-hover:from-violet-500/20"
                      style={{ fontFamily: "var(--font-syne), system-ui" }}
                    >
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-5">
                      <step.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3
                      className="text-lg font-semibold mb-2 text-white"
                      style={{ fontFamily: "var(--font-syne), system-ui" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-slate-850" />

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 md:py-28 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan-400 mb-3">
              Fitur Utama
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white"
              style={{
                fontFamily:
                  "var(--font-syne), var(--font-geist-sans), system-ui",
              }}
            >
              Semua Fitur untuk Meledakkan Konten Anda
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Pemrosesan video tingkat profesional dengan kecerdasan buatan di setiap alurnya.
            </p>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 0.07}>
                <Card className="h-full py-0 gap-0 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 hover:border-violet-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                      <feature.icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <h3 className="font-semibold mb-2 text-white text-lg">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-slate-850" />

      {/* ─── PRICING ─── */}
      <section id="pricing" className="relative py-20 md:py-28 bg-slate-950/40 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, currentColor 0.5px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6">
          <ScrollReveal className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-violet-400 mb-3">
              Paket Layanan
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white"
              style={{
                fontFamily:
                  "var(--font-syne), var(--font-geist-sans), system-ui",
              }}
            >
              Harga Sederhana. Tanpa Kejutan.
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Mulai gratis hari ini. Upgrade kapan saja untuk mendapatkan kuota proses klip yang lebih banyak.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-stretch">
            {getPlans().map((plan, i) => (
              <ScrollReveal key={plan.name} delay={i * 0.12} className="flex">
                <Card
                  className={`relative py-0 gap-0 w-full transition-all duration-300 backdrop-blur-xl border flex flex-col justify-between ${
                    plan.highlighted
                      ? "bg-slate-900/80 border-violet-500 shadow-[0_0_40px_rgba(124,58,237,0.25)] md:-mt-4 md:mb-4 text-slate-100"
                      : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 text-slate-200 hover:-translate-y-1"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 shadow-lg gap-1.5 px-3 py-1">
                        <Zap className="w-3 h-3 text-yellow-300" />
                        Paling Populer
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-8 flex-1 flex flex-col justify-between h-full">
                    <div>
                      <div className="mb-6">
                        <h3
                          className="text-lg font-semibold mb-1 text-white"
                          style={{ fontFamily: "var(--font-syne), system-ui" }}
                        >
                          {plan.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {plan.description}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1 mb-8">
                        <span
                          className="text-5xl font-extrabold tracking-tight text-white"
                          style={{ fontFamily: "var(--font-syne), system-ui" }}
                        >
                          {plan.price}
                        </span>
                        <span className="text-sm text-slate-500">
                          {plan.period}
                        </span>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm">
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
                            <span className="text-slate-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link href={plan.ctaHref}>
                      <Button
                        className={`w-full h-11 text-sm ${
                          plan.highlighted
                            ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 hover:from-violet-500 hover:to-cyan-500 shadow-[0_0_20px_rgba(124,58,237,0.2)]"
                            : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white"
                        }`}
                        variant="default"
                        size="lg"
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-slate-850" />

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
        
        <ScrollReveal className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-white"
            style={{ fontFamily: "var(--font-syne), system-ui" }}
          >
            Siap Membuat Video Viral?
          </h2>
          <p className="text-base text-slate-400 mb-8 max-w-md mx-auto">
            Ubah video panjang Anda menjadi klip pendek yang memikat perhatian penonton dalam hitungan detik. Cepat, otomatis, dan tanpa memerlukan kartu kredit untuk memulai.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="px-10 h-12 text-sm bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0 shadow-[0_0_25px_rgba(124,58,237,0.3)]">
              Mulai Sekarang Gratis
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </ScrollReveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-800/80 py-8 px-6 bg-[#02050e]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-slate-900 border border-slate-850">
              <Image
                src="/logo.png"
                alt="AutoClipper AI"
                width={18}
                height={18}
                className="rounded"
              />
            </div>
            <span
              className="text-sm font-semibold text-white"
              style={{ fontFamily: "var(--font-syne), system-ui" }}
            >
              AutoClipper AI
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} AutoClipper AI. Hak Cipta Dilindungi. Hubungi kami untuk bantuan.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Hero Visual ─── */
function HeroVisual() {
  return (
    <div className="relative w-full max-w-md">
      <Card className="py-0 gap-0 overflow-hidden shadow-2xl bg-slate-950/80 backdrop-blur-xl border border-slate-800/80">
        <CardContent className="p-0">
          <div className="relative w-full overflow-hidden bg-slate-900 border border-slate-800 rounded-lg">
            <Image
              src="/ai_video_simulation.png"
              alt="AutoClipper AI Video Simulation"
              width={512}
              height={512}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Decorative blur spots */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl -z-10 animate-pulse" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-cyan-500/10 blur-2xl -z-10 animate-pulse" />
    </div>
  );
}
