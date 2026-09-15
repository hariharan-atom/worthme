"use client";

import NextImage from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answers } from "@/lib/worth";

const empty: Answers = { name: "", age: 18, profession: "", income: "", location: "", goal: "" };
const profileTargetBytes = 72 * 1024;

function Logo({ className = "" }: { className?: string }) {
  return <NextImage className={`logo ${className}`} src="/brand/worthme-logo.png" alt="WorthMe - Discover. Laugh. Improve." width={903} height={301} priority />;
}

async function compressProfile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("We could not read that image.")); image.src = source; });
    for (let edge = 640; edge >= 180; edge = Math.floor(edge * 0.82)) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d"); if (!context) throw new Error("Your browser cannot prepare this image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        let data = canvas.toDataURL("image/webp", quality);
        if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", quality);
        if (data.length <= profileTargetBytes) return data;
      }
    }
    throw new Error("Please choose a simpler image - we could not compress it below 100 KB.");
  } finally { URL.revokeObjectURL(source); }
}

export default function Home() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(empty);
  const [stage, setStage] = useState<"form" | "reveal">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((items) => items.forEach((item) => item.isIntersecting && item.target.classList.add("shown")), { threshold: 0.14 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((previous) => ({ ...previous, [key]: value }));
  async function selectProfile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setError(""); setCompressing(true);
    try { update("profileImage", await compressProfile(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not prepare that image."); event.currentTarget.value = ""; }
    finally { setCompressing(false); }
  }
  function continueToReveal(event: FormEvent) {
    event.preventDefault();
    if (compressing) { setError("Your profile photo is still compressing."); return; }
    if (answers.name.trim().length < 2 || answers.age < 18 || !answers.profession.trim() || !answers.income || !answers.location.trim() || answers.goal.trim().length < 3) { setError("Complete every field. WorthMe is for adults 18+."); return; }
    setError(""); setStage("reveal");
  }
  async function generate() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      sessionStorage.setItem(`worthme:${body.result.slug}`, JSON.stringify(body.result));
      if (body.stored) router.push(`/r/${body.result.slug}`);
      else {
        const fallback = { ...body.result, profileImage: undefined };
        const packed = btoa(unescape(encodeURIComponent(JSON.stringify(fallback)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
        router.push(`/r/${body.result.slug}?d=${packed}`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went sideways. Try again."); setLoading(false); }
  }
  return <main className="site-shell">
    <nav className="site-nav"><a href="#top" aria-label="WorthMe home"><Logo /></a><div className="nav-links"><a href="#how">How it works</a><a href="#quiz">Why WorthMe?</a><a href="#quiz">FAQs</a></div><a className="nav-cta" href="#quiz">Find My Worth <span>→</span></a></nav>
    <section id="top" className="brand-hero"><div className="hero-copy"><p className="eyebrow">DISCOVER. LAUGH. IMPROVE.</p><h1>How much<br />are <mark>you</mark> worth?</h1><p className="hero-lead">Give us 45 seconds. We&apos;ll make an unnecessarily serious valuation of you.</p><a className="primary-button" href="#quiz">Find My Worth <span aria-hidden="true">→</span></a><p className="hero-safe"><span className="lock" aria-hidden="true">⌁</span> Secure payment later · Just for fun · 18+ only</p></div><div className="hero-visual" aria-label="WorthMe score preview"><div className="scribble scribble-one">Just a quiz?</div><div className="scribble scribble-two">Or a reality<br />check?</div><NextImage className="hero-person" src="/brand/hero-thinker.png" alt="A thoughtful young professional" width={1024} height={1536} priority sizes="(max-width: 720px) 92vw, 48vw" /><div className="hero-score-card"><span className="mini-brand">Worth<span>Me</span></span><p>YOUR WORTH SCORE</p><strong>87<span>/100</span></strong><i>THE CHAOTIC BUILDER</i><div><b>Brain power</b><em style={{ width: "87%" }} /></div><div><b>Potential</b><em style={{ width: "94%" }} /></div></div></div></section>
    <section id="how" className="how-section reveal"><p className="eyebrow centered">HOW WORTHME WORKS</p><h2>From curious to &ldquo;wow, that&apos;s me!&rdquo;<br />in 3 simple steps.</h2><div className="steps-grid"><article><span>1</span><h3>Answer a few questions</h3><p>Tell us a little about yourself. It takes just 45 seconds.</p></article><article><span>2</span><h3>Get your result</h3><p>We create your playful score, verdict, and share card.</p></article><article><span>3</span><h3>Discover & challenge</h3><p>Keep it to yourself or challenge a friend to beat you.</p></article></div></section>
    <section className="challenge-band reveal"><div className="avatar-stack" aria-hidden="true"><i /><i /><i /></div><div><p className="eyebrow">THINK YOU&apos;RE WORTH MORE?</p><h2>&ldquo;I scored 87! Think you can beat me?&rdquo;</h2><p>Turn it into a friendly challenge. Compare scores with friends and see who&apos;s really worth more!</p></div><span className="challenge-note">Good conversations<br />start here!</span></section>
    <section id="quiz" className="quiz-section"><div className="quiz-intro reveal"><p className="eyebrow">YOUR TURN</p><h2>Let&apos;s find your WorthMe score.</h2><p>Personal, playful, and always for entertainment. No account required.</p><div className="privacy-points"><p><b>◌</b> Your privacy matters</p><p><b>◌</b> 100% entertainment</p><p><b>◌</b> Made for adults</p></div></div>{stage === "form" ? <form className="quiz-form reveal" onSubmit={continueToReveal} noValidate><div className="form-head"><span>01</span><div><strong>Tell us about you</strong><p>Six quick answers. Zero pressure.</p></div></div><div className="fields"><label>Your display name<input autoComplete="name" maxLength={28} value={answers.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Hari" required /></label><label>Age<input type="number" min="18" max="120" value={answers.age || ""} onChange={(e) => update("age", Number(e.target.value))} required /></label><label>What do you do?<input maxLength={60} value={answers.profession} onChange={(e) => update("profession", e.target.value)} placeholder="e.g. Product designer" required /></label><label>Income range<select value={answers.income} onChange={(e) => update("income", e.target.value)} required><option value="">Choose a range</option><option>Building momentum</option><option>Growing steadily</option><option>Doing quite well</option><option>Prefer not to say</option></select></label><label>City or country<input maxLength={60} value={answers.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Chennai, India" required /></label><label>What are you chasing?<input maxLength={120} value={answers.goal} onChange={(e) => update("goal", e.target.value)} placeholder="e.g. Launching my first company" required /></label></div><div className="profile-upload"><div className="profile-preview">{answers.profileImage ? <img src={answers.profileImage} alt="Selected profile preview" /> : <span aria-hidden="true">+</span>}</div><div><strong>Profile photo <small>optional</small></strong><p>Auto-compressed below 100 KB. It appears on your public result only when you share it.</p><label className="upload-button">{compressing ? "Compressing photo..." : "Choose photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectProfile} disabled={compressing} /></label>{answers.profileImage && <button className="remove-photo" type="button" onClick={() => update("profileImage", undefined)}>Remove</button>}</div></div>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button full-button" type="submit" disabled={compressing}>Find My Worth <span aria-hidden="true">→</span></button><p className="form-note">For entertainment only. Not a financial, professional, or psychological assessment.</p></form> : <section className="launch-pass reveal" aria-live="polite"><p className="eyebrow">LAUNCH PASS ACTIVATED</p><h3>Payment is on us for now.</h3><p>Our INR 29 payment step is paused during this launch preview. Your result is ready to reveal.</p>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button" onClick={generate} disabled={loading}>{loading ? "Calculating your score..." : "Reveal My Worth"} <span aria-hidden="true">→</span></button><button className="text-button" type="button" onClick={() => setStage("form")}>Edit my answers</button></section>}</section>
    <footer className="site-footer"><Logo /><div><a href="#top">About</a><a href="#quiz">Privacy</a><a href="#quiz">Terms</a><a href="#quiz">FAQs</a></div><p>Made with a little curiosity in India</p></footer>
  </main>;
}