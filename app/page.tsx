"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answers } from "@/lib/worth";

const empty: Answers = { name: "", age: 18, profession: "", income: "", location: "", goal: "" };

function Mark() { return <span className="mark" aria-hidden="true"><i /><i /><i /></span>; }

export default function Home() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(empty);
  const [stage, setStage] = useState<"form" | "reveal">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((items) => items.forEach((item) => item.isIntersecting && item.target.classList.add("shown")), { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((previous) => ({ ...previous, [key]: value }));
  function continueToReveal(event: FormEvent) {
    event.preventDefault();
    if (answers.name.trim().length < 2 || answers.age < 18 || !answers.profession.trim() || !answers.income || !answers.location.trim() || answers.goal.trim().length < 3) { setError("Complete every field. WorthMe is for adults 18+."); return; }
    setError(""); setStage("reveal");
  }
  async function generate() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const packed = btoa(unescape(encodeURIComponent(JSON.stringify(body.result)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      router.push(`/r/${body.result.slug}?d=${packed}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went sideways. Try again."); setLoading(false); }
  }
  return <main>
    <nav><a className="brand" href="#top"><Mark />WorthMe<span>™</span></a><a className="nav-link" href="#how">How it works</a></nav>
    <section id="top" className="hero"><div className="orb orb-one" /><div className="orb orb-two" /><p className="eyebrow hero-in">THE UNNECESSARILY SERIOUS VALUATION</p><h1 className="hero-in delay-1">How much are<br /><em>you</em> worth?</h1><p className="intro hero-in delay-2">Give us 45 seconds. We’ll turn your ambition into a wildly flattering entertainment score.</p><a className="button hero-in delay-3" href="#quiz">Find my worth <span aria-hidden="true">→</span></a><p className="micro hero-in delay-3">Free for launch · No account · 18+ only</p><div className="score-orbit" aria-hidden="true"><span>WORTH<br />SCORE</span><strong>87</strong><small>/100</small></div></section>
    <section id="how" className="how section"><p className="eyebrow reveal">A VERY SERIOUS PROCESS</p><h2 className="reveal">Three tiny steps.<br />One big flex.</h2><div className="steps"><article className="reveal"><b>01</b><h3>Tell us your story</h3><p>Six quick questions. No accounts, no life essay.</p></article><article className="reveal"><b>02</b><h3>We run the numbers</h3><p>Our entertainment-only score engine finds your standout energy.</p></article><article className="reveal"><b>03</b><h3>Share the verdict</h3><p>Download your card or challenge a friend—only if you choose.</p></article></div></section>
    <section id="quiz" className="quiz section"><div className="quiz-head reveal"><p className="eyebrow">YOUR TURN</p><h2>Let’s meet the asset.</h2><p>We only use these details to create this result. They are not saved with your public card.</p></div>{stage === "form" ? <form className="quiz-card reveal" onSubmit={continueToReveal} noValidate><div className="fields"><label>Your display name<input autoComplete="name" maxLength={28} value={answers.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Hari" required /></label><label>Age<input type="number" min="18" max="120" value={answers.age || ""} onChange={(e) => update("age", Number(e.target.value))} required /></label><label>What do you do?<input maxLength={60} value={answers.profession} onChange={(e) => update("profession", e.target.value)} placeholder="e.g. Product designer" required /></label><label>Income range<select value={answers.income} onChange={(e) => update("income", e.target.value)} required><option value="">Choose a range</option><option>Building momentum</option><option>Growing steadily</option><option>Doing quite well</option><option>Prefer not to say</option></select></label><label>City or country<input maxLength={60} value={answers.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Chennai, India" required /></label><label>What are you chasing?<input maxLength={120} value={answers.goal} onChange={(e) => update("goal", e.target.value)} placeholder="e.g. Launching my first company" required /></label></div>{error && <p className="error" role="alert">{error}</p>}<button className="button" type="submit">Find my worth <span aria-hidden="true">→</span></button><p className="form-note">For entertainment only. Not a financial, professional, or psychological assessment.</p></form> : <section className="reveal pass" aria-live="polite"><p className="eyebrow">LAUNCH PASS ACTIVATED</p><h3>Payment is on us for now.</h3><p>Our ₹29 payment step is paused during this launch preview. Your result is ready to reveal.</p>{error && <p className="error" role="alert">{error}</p>}<button className="button" onClick={generate} disabled={loading}>{loading ? "Calculating your score…" : "Reveal my worth"} <span aria-hidden="true">→</span></button><button className="back" type="button" onClick={() => setStage("form")}>Edit my answers</button></section>}</section>
    <footer><a className="brand" href="#top"><Mark />WorthMe<span>™</span></a><p>Entertainment only. Your actual worth is not a score.</p></footer>
  </main>;
}
