"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ══════════════════════════════════════════════════════════
   Reusable scroll-driven frame animation component
══════════════════════════════════════════════════════════ */
interface Overlay {
  /** 0–1 scroll progress at which this overlay is fully visible */
  peak: number;
  /** fade width on each side (default 0.12) */
  spread?: number;
  content: React.ReactNode;
}

interface ScrollAnimationProps {
  frames: string[];
  /** px of scroll height per frame (controls animation speed) */
  pxPerFrame?: number;
  overlays?: Overlay[];
}

function ScrollAnimation({ frames, pxPerFrame = 130, overlays = [] }: ScrollAnimationProps) {
  const TOTAL = frames.length;
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgs      = useRef<(HTMLImageElement | null)[]>(Array(TOTAL).fill(null));
  const curFrame  = useRef(0);
  const rafId     = useRef<number | null>(null);

  const [loaded,   setLoaded]   = useState(false);
  const [loadPct,  setLoadPct]  = useState(0);
  const [prog,     setProg]     = useState(0);

  /* draw */
  const draw = useCallback((idx: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const img = imgs.current[idx];
    if (!img?.complete) return;
    ctx.drawImage(img, 0, 0, c.width, c.height);
  }, []);

  /* preload */
  useEffect(() => {
    let done = 0;
    frames.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imgs.current[i] = img;
        done++;
        setLoadPct(Math.round((done / TOTAL) * 100));
        if (done === TOTAL) setLoaded(true);
        if (i === 0) {
          const c = canvasRef.current;
          if (c) { c.width = img.naturalWidth; c.height = img.naturalHeight; }
          draw(0);
        }
      };
    });
  }, [frames, TOTAL, draw]);

  /* first-frame after fully loaded */
  useEffect(() => {
    if (!loaded) return;
    const img = imgs.current[0];
    const c   = canvasRef.current;
    if (img && c) { c.width = img.naturalWidth; c.height = img.naturalHeight; draw(0); }
  }, [loaded, draw]);

  /* scroll → frame */
  useEffect(() => {
    if (!loaded) return;
    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const wrapTop     = wrap.getBoundingClientRect().top + window.scrollY;
        const scrollIn    = window.scrollY - wrapTop;
        const maxScroll   = wrap.scrollHeight - window.innerHeight;
        const p = maxScroll > 0 ? Math.min(Math.max(scrollIn / maxScroll, 0), 1) : 0;
        setProg(p);
        const idx = Math.min(Math.floor(p * TOTAL), TOTAL - 1);
        if (idx !== curFrame.current) { curFrame.current = idx; draw(idx); }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [loaded, TOTAL, draw]);

  const displayFrame = Math.min(Math.floor(prog * TOTAL), TOTAL - 1) + 1;

  return (
    <div
      ref={wrapRef}
      className="relative bg-black"
      style={{ height: `${TOTAL * pxPerFrame}px` }}
    >
      {/* loading */}
      {!loaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
             style={{ position: "sticky", top: 0, height: "100vh" }}>
          <p className="text-white/70 text-[10px] tracking-[0.6em] uppercase mb-10">Loading</p>
          <div className="relative w-56 h-px bg-white/15">
            <div className="absolute inset-y-0 left-0 bg-white"
                 style={{ width: `${loadPct}%`, transition: "width 0.25s ease-out" }} />
          </div>
          <p className="text-white/30 text-[10px] tracking-widest mt-5">{loadPct}%</p>
        </div>
      )}

      {/* sticky viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.8s ease" }}
        />
        {/* vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/25" />

        {/* dynamic overlays */}
        {overlays.map((ov, i) => {
          const s = ov.spread ?? 0.12;
          const o = Math.max(0, Math.min((prog - (ov.peak - s)) / s, 1) *
                                Math.min(((ov.peak + s) - prog) / s, 1));
          return (
            <div key={i} className="pointer-events-none absolute inset-0"
                 style={{ opacity: o, transition: "opacity 0.05s" }}>
              {ov.content}
            </div>
          );
        })}

        {/* frame counter */}
        <div className="pointer-events-none absolute bottom-6 right-8 text-white/20 text-[10px] tracking-widest tabular-nums">
          {String(displayFrame).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Frame lists
══════════════════════════════════════════════════════════ */

// Animation 1 — Orange Juice (frames 0-19, 22-29)
const JUICE_FRAMES = [
  ...Array.from({ length: 20 }, (_, i) =>
    `/3d-images/Make_3d_video_4be094ddec_${String(i).padStart(3, "0")}.jpg`),
  ...Array.from({ length: 8 }, (_, i) =>
    `/3d-images/Make_3d_video_4be094ddec_${String(i + 22).padStart(3, "0")}.jpg`),
];

// Animation 2 — Barebells Milkshake (frames 0-79)
const SHAKE_FRAMES = Array.from({ length: 80 }, (_, i) =>
  `/2nd-3d-images/Make_animated_video_cd3dc909d5_${String(i).padStart(3, "0")}.jpg`
);

/* ══════════════════════════════════════════════════════════
   Page
══════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      {/* ── ANIMATION 1 — Orange Juice ────────────────────────── */}
      <ScrollAnimation
        frames={JUICE_FRAMES}
        pxPerFrame={130}
        overlays={[
          {
            peak: 0.08,
            spread: 0.08,
            content: (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-white/40 text-[9px] tracking-[0.7em] uppercase mb-6">Experience</p>
                <h1 className="text-white text-5xl sm:text-7xl font-thin tracking-[0.15em] leading-tight">
                  3D DESIGN
                </h1>
                <p className="text-white/30 text-[9px] tracking-[0.5em] uppercase mt-12">
                  Scroll to explore
                </p>
                <div className="mt-6 w-px h-10 bg-gradient-to-b from-white/50 to-transparent animate-pulse" />
              </div>
            ),
          },
          {
            peak: 0.45,
            spread: 0.15,
            content: (
              <div className="flex items-center justify-end h-full pr-10 sm:pr-20">
                <div className="text-right space-y-3">
                  <p className="text-white/35 text-[9px] tracking-[0.5em] uppercase">Crafted in 3D</p>
                  <h2 className="text-white text-3xl sm:text-4xl font-light tracking-wide leading-snug">
                    Every Detail<br />Perfected
                  </h2>
                  <div className="ml-auto w-10 h-px bg-white/30" />
                </div>
              </div>
            ),
          },
          {
            peak: 0.88,
            spread: 0.12,
            content: (
              <div className="flex items-center justify-start h-full pl-10 sm:pl-20">
                <div className="space-y-3">
                  <p className="text-white/35 text-[9px] tracking-[0.5em] uppercase">Discover More</p>
                  <h2 className="text-white text-3xl sm:text-4xl font-light tracking-wide leading-snug">
                    The Future<br />of Design
                  </h2>
                  <div className="w-10 h-px bg-white/30" />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* ── ORANGE JUICE SECTIONS ─────────────────────────────── */}

      {/* Product Title */}
      <section className="bg-black py-32 px-6 flex flex-col items-center text-center">
        <p className="text-orange-400/60 text-[9px] tracking-[0.7em] uppercase mb-6">100% Natural</p>
        <h2 className="text-white text-6xl sm:text-8xl font-thin tracking-tight leading-none mb-6">
          Natural<br /><span className="text-orange-400">Juice</span>
        </h2>
        <p className="text-white/40 text-sm tracking-widest uppercase">Orange Edition</p>
        <div className="mt-12 w-16 h-px bg-orange-400/30" />
      </section>

      {/* Features */}
      <section className="bg-[#080808] py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5">
          {[
            { num: "01", title: "100% Natural", desc: "No added sugar, no preservatives. Pure orange goodness straight from the orchard." },
            { num: "02", title: "Cold Pressed",  desc: "Extracted at low temperature to preserve every vitamin, mineral, and enzyme." },
            { num: "03", title: "Fresh Daily",   desc: "Bottled within hours of pressing to lock in the freshest flavour possible." },
          ].map(({ num, title, desc }) => (
            <div key={num} className="bg-[#080808] p-10 flex flex-col gap-6">
              <span className="text-orange-400/40 text-[10px] tracking-[0.5em]">{num}</span>
              <h3 className="text-white text-xl font-light tracking-wide">{title}</h3>
              <p className="text-white/35 text-sm leading-7">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nutrition */}
      <section className="bg-black py-32 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-20">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-orange-400/50 text-[9px] tracking-[0.6em] uppercase mb-4">Vitamin C</p>
            <p className="text-white text-[120px] sm:text-[160px] font-thin leading-none tracking-tighter">
              120<span className="text-orange-400 text-5xl align-top mt-8 inline-block">mg</span>
            </p>
            <p className="text-white/30 text-xs tracking-widest mt-2">per 250 ml serving</p>
          </div>
          <div className="flex-1 space-y-6">
            {[
              { label: "Calories",      value: "110 kcal" },
              { label: "Carbs",         value: "26 g" },
              { label: "Natural Sugar", value: "21 g" },
              { label: "Protein",       value: "1.7 g" },
              { label: "Potassium",     value: "496 mg" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-white/40 text-xs tracking-widest uppercase">{label}</span>
                <span className="text-white text-sm font-light tracking-wider">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flavour */}
      <section className="bg-[#080808] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-orange-400/50 text-[9px] tracking-[0.6em] uppercase mb-16 text-center">Flavour Profile</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { emoji: "🍊", label: "Sweet Orange",  pct: 85 },
              { emoji: "🍋", label: "Citrus Zest",   pct: 60 },
              { emoji: "🌿", label: "Fresh & Light", pct: 70 },
              { emoji: "✨", label: "Smooth Finish", pct: 90 },
            ].map(({ emoji, label, pct }) => (
              <div key={label} className="flex flex-col items-center gap-4">
                <span className="text-4xl">{emoji}</span>
                <p className="text-white/50 text-[10px] tracking-widest uppercase">{label}</p>
                <div className="w-full h-px bg-white/10 relative">
                  <div className="absolute inset-y-0 left-0 bg-orange-400/60" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-orange-400/50 text-[10px]">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-40 px-6 flex flex-col items-center text-center">
        <p className="text-white/25 text-[9px] tracking-[0.6em] uppercase mb-8">Ready to taste?</p>
        <h2 className="text-white text-4xl sm:text-6xl font-thin tracking-wide leading-tight mb-12">
          Pure Orange.<br /><span className="text-orange-400">Pure Nature.</span>
        </h2>
        <button className="group relative overflow-hidden border border-orange-400/40 text-orange-400 text-xs tracking-[0.4em] uppercase px-12 py-4 transition-all duration-500 hover:border-orange-400">
          <span className="relative z-10 group-hover:text-black transition-colors duration-500">Order Now</span>
          <span className="absolute inset-0 bg-orange-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>
      </section>

      {/* ── ANIMATION 2 — Barebells Milkshake ─────────────────── */}
      <ScrollAnimation
        frames={SHAKE_FRAMES}
        pxPerFrame={90}
        overlays={[
          {
            peak: 0.08,
            spread: 0.08,
            content: (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-pink-300/50 text-[9px] tracking-[0.7em] uppercase mb-6">Functional Foods</p>
                <h1 className="text-white text-5xl sm:text-7xl font-thin tracking-[0.15em] leading-tight">
                  BAREBELLS
                </h1>
                <p className="text-pink-300/40 text-[9px] tracking-[0.5em] uppercase mt-10">
                  Scroll to explore
                </p>
                <div className="mt-6 w-px h-10 bg-gradient-to-b from-pink-300/50 to-transparent animate-pulse" />
              </div>
            ),
          },
          {
            peak: 0.4,
            spread: 0.15,
            content: (
              <div className="flex items-center justify-start h-full pl-10 sm:pl-20">
                <div className="space-y-3">
                  <p className="text-pink-300/40 text-[9px] tracking-[0.5em] uppercase">High Protein</p>
                  <h2 className="text-white text-3xl sm:text-4xl font-light tracking-wide leading-snug">
                    24g Protein<br />Per Serving
                  </h2>
                  <div className="w-10 h-px bg-pink-300/30" />
                </div>
              </div>
            ),
          },
          {
            peak: 0.75,
            spread: 0.15,
            content: (
              <div className="flex items-center justify-end h-full pr-10 sm:pr-20">
                <div className="text-right space-y-3">
                  <p className="text-pink-300/40 text-[9px] tracking-[0.5em] uppercase">Strawberry</p>
                  <h2 className="text-white text-3xl sm:text-4xl font-light tracking-wide leading-snug">
                    Milkshake<br />Perfected
                  </h2>
                  <div className="ml-auto w-10 h-px bg-pink-300/30" />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* ── BAREBELLS SECTIONS ────────────────────────────────── */}

      {/* Product Title */}
      <section className="bg-black py-32 px-6 flex flex-col items-center text-center">
        <p className="text-pink-400/60 text-[9px] tracking-[0.7em] uppercase mb-6">Functional Foods</p>
        <h2 className="text-white text-6xl sm:text-8xl font-thin tracking-tight leading-none mb-6">
          Barebells<br /><span className="text-pink-400">Milkshake</span>
        </h2>
        <p className="text-white/40 text-sm tracking-widest uppercase">Strawberry Edition</p>
        <div className="mt-12 w-16 h-px bg-pink-400/30" />
      </section>

      {/* Features */}
      <section className="bg-[#0a0808] py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5">
          {[
            { num: "01", title: "24g Protein",    desc: "Packed with high-quality whey protein to fuel your muscles and keep you satisfied." },
            { num: "02", title: "Low Sugar",       desc: "Only 2g of sugar per bottle — indulgent taste without the sugar crash." },
            { num: "03", title: "Gluten Free",     desc: "Crafted for everyone — no gluten, no compromise on flavour or nutrition." },
          ].map(({ num, title, desc }) => (
            <div key={num} className="bg-[#0a0808] p-10 flex flex-col gap-6">
              <span className="text-pink-400/40 text-[10px] tracking-[0.5em]">{num}</span>
              <h3 className="text-white text-xl font-light tracking-wide">{title}</h3>
              <p className="text-white/35 text-sm leading-7">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nutrition */}
      <section className="bg-black py-32 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-20">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-pink-400/50 text-[9px] tracking-[0.6em] uppercase mb-4">Protein</p>
            <p className="text-white text-[120px] sm:text-[160px] font-thin leading-none tracking-tighter">
              24<span className="text-pink-400 text-5xl align-top mt-8 inline-block">g</span>
            </p>
            <p className="text-white/30 text-xs tracking-widest mt-2">per 330 ml bottle</p>
          </div>
          <div className="flex-1 space-y-6">
            {[
              { label: "Calories",  value: "197 kcal" },
              { label: "Protein",   value: "24 g" },
              { label: "Carbs",     value: "15 g" },
              { label: "Sugar",     value: "2 g" },
              { label: "Fat",       value: "4.4 g" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-white/40 text-xs tracking-widest uppercase">{label}</span>
                <span className="text-white text-sm font-light tracking-wider">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-40 px-6 flex flex-col items-center text-center">
        <p className="text-white/25 text-[9px] tracking-[0.6em] uppercase mb-8">Fuel your day</p>
        <h2 className="text-white text-4xl sm:text-6xl font-thin tracking-wide leading-tight mb-12">
          Taste the Power.<br /><span className="text-pink-400">Feel the Difference.</span>
        </h2>
        <button className="group relative overflow-hidden border border-pink-400/40 text-pink-400 text-xs tracking-[0.4em] uppercase px-12 py-4 transition-all duration-500 hover:border-pink-400">
          <span className="relative z-10 group-hover:text-black transition-colors duration-500">Shop Now</span>
          <span className="absolute inset-0 bg-pink-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>
        <p className="text-white/15 text-[9px] tracking-widest mt-16 uppercase">© 2025 Barebells · Functional Foods</p>
      </section>
    </>
  );
}
