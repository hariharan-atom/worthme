"use client";

import NextImage from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answers } from "@/lib/worth";

const empty: Answers = { name: "", age: 18, profession: "", income: "", location: "", goal: "" };
const profileTargetBytes = 72 * 1024;
type FormStep = "profile" | "details";

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
  const modalTitleRef = useRef<HTMLHeadingElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<Answers>(empty);
  const [stage, setStage] = useState<"form" | "reveal">("form");
  const [formStep, setFormStep] = useState<FormStep>("profile");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((items) => items.forEach((item) => item.isIntersecting && item.target.classList.add("shown")), { threshold: 0.14 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setModalOpen(false); return; }
      if (event.key !== "Tab") return;
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])");
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => modalTitleRef.current?.focus());
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [modalOpen]);

  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((previous) => ({ ...previous, [key]: value }));
  const openQuiz = () => { setError(""); setStage("form"); setFormStep("profile"); setModalOpen(true); };
  const closeQuiz = () => { if (!loading && !compressing) setModalOpen(false); };

  async function selectProfile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setError(""); setCompressing(true);
    try { update("profileImage", await compressProfile(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not prepare that image."); event.currentTarget.value = ""; }
    finally { setCompressing(false); }
  }

  function continueToDetails(event: FormEvent) {
    event.preventDefault();
    if (compressing) { setError("Your profile photo is still compressing."); return; }
    if (answers.name.trim().length < 2 || answers.age < 18) { setError("Add your name and an age of 18 or above."); return; }
    setError(""); setFormStep("details");
  }

  function continueToReveal(event: FormEvent) {
    event.preventDefault();
    if (!answers.profession.trim() || !answers.income || !answers.location.trim() || answers.goal.trim().length < 3) { setError("Complete the four details so we can make your score."); return; }
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
    <nav className="site-nav"><a href="#top" aria-label="WorthMe home"><Logo /></a><div className="nav-links"><a href="#how">How it works</a><a href="#why">Why WorthMe?</a><a href="#why">FAQs</a></div><button className="nav-cta" type="button" onClick={openQuiz}>Find My Worth <span aria-hidden="true">→</span></button></nav>
    <section id="top" className="brand-hero"><div className="hero-copy"><p className="eyebrow">DISCOVER. LAUGH. IMPROVE.</p><h1>How much<br />are <mark>you</mark> worth?</h1><p className="hero-lead">Give us 45 seconds. We&apos;ll make an unnecessarily serious valuation of you.</p><a className="primary-button" href="#how">See how it works <span aria-hidden="true">↓</span></a><p className="hero-safe"><span className="lock" aria-hidden="true">⌁</span> No sign-up · Just for fun · 18+ only</p></div><div className="hero-visual" aria-label="WorthMe score preview"><div className="scribble scribble-one">Just a quiz?</div><div className="scribble scribble-two">Or a reality<br />check?</div><NextImage className="hero-person" src="/brand/hero-thinker.png" alt="A thoughtful young professional" width={1024} height={1536} priority sizes="(max-width: 720px) 92vw, 48vw" /><div className="hero-score-card"><span className="mini-brand">Worth<span>Me</span></span><p>YOUR WORTH SCORE</p><strong>87<span>/100</span></strong><i>THE CHAOTIC BUILDER</i><div><b>Brain power</b><em style={{ width: "87%" }} /></div><div><b>Potential</b><em style={{ width: "94%" }} /></div></div></div></section>
    <section id="how" className="how-section reveal"><p className="eyebrow centered">HOW WORTHME WORKS</p><h2>From curious to &ldquo;wow, that&apos;s me!&rdquo;<br />in 3 simple steps.</h2><div className="steps-grid"><article><span>1</span><h3>Answer a few questions</h3><p>Tell us a little about yourself. It takes just 45 seconds.</p></article><article><span>2</span><h3>Get your result</h3><p>We create your playful score, verdict, and share card.</p></article><article><span>3</span><h3>Discover & challenge</h3><p>Keep it to yourself or challenge a friend to beat you.</p></article></div></section>
    <section id="why" className="worth-experience reveal"><div className="experience-orbit" aria-hidden="true"><i /><i /><i /></div><div className="experience-intro"><p className="eyebrow">THE WORTHME DIFFERENCE</p><h2>More perspective.<br /><mark>Less pressure.</mark></h2><p>It&apos;s a bright little snapshot of your ambition, energy, and personality—made to make you smile, not define you.</p></div><div className="experience-track"><article className="experience-card private-card"><span className="experience-number">01</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><h3>Private by default</h3><p>Your answers are never part of the public card. Share only when it feels right.</p></article><article className="experience-card playful-card"><span className="experience-number">02</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M8.5 14.5c1.8 1.7 5.2 1.7 7 0M9 9h.01M15 9h.01" /></svg><h3>Made for a grin</h3><p>Entertaining on purpose. No life-changing claims, just a fun dose of perspective.</p></article><article className="experience-card share-card"><span className="experience-number">03</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></svg><h3>Ready to share</h3><p>Get a polished personal card and a link made for a little friendly competition.</p></article></div><p className="experience-signoff">A more aware, happier, higher-value you.</p></section>
    <footer className="site-footer"><Logo /><div><a href="#top">About</a><a href="#why">Privacy</a><a href="#why">Terms</a><a href="#why">FAQs</a></div><p>Made with a little curiosity in India</p></footer>

    {modalOpen && <div className="quiz-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuiz(); }}><section ref={modalRef} className="quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title"><button className="modal-close" type="button" onClick={closeQuiz} disabled={loading || compressing} aria-label="Close WorthMe quiz"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button><div className="quiz-modal-top"><Logo className="modal-logo" /><ol className="modal-progress" aria-label={`Step ${formStep === "profile" ? 1 : 2} of 2`}><li className={formStep === "profile" ? "active" : "complete"}><span>1</span>Profile</li><li className={formStep === "details" ? "active" : ""}><span>2</span>Details</li></ol></div>{stage === "form" ? <form className="modal-form" onSubmit={formStep === "profile" ? continueToDetails : continueToReveal} noValidate>{formStep === "profile" ? <div className="modal-step"><p className="eyebrow">STEP 01 · YOUR PROFILE</p><h2 id="quiz-title" ref={modalTitleRef} tabIndex={-1}>Start with the basics.</h2><p className="modal-lead">Your photo is optional. If you choose one, it&apos;s compressed below 100 KB before it can be stored.</p><div className="profile-upload profile-card"><div className="profile-preview">{answers.profileImage ? <img src={answers.profileImage} alt="Selected profile preview" /> : <span aria-hidden="true">+</span>}</div><div><strong>Profile photo <small>optional</small></strong><p>Only appears on a result you choose to share.</p><label className="upload-button">{compressing ? "Compressing photo..." : "Choose photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectProfile} disabled={compressing} /></label>{answers.profileImage && <button className="remove-photo" type="button" onClick={() => update("profileImage", undefined)}>Remove</button>}</div></div><div className="fields profile-fields"><label>Your display name<input autoComplete="name" maxLength={28} value={answers.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Hari" required /></label><label>Age<input type="number" min="18" max="120" value={answers.age || ""} onChange={(e) => update("age", Number(e.target.value))} required /></label></div></div> : <div className="modal-step"><p className="eyebrow">STEP 02 · THE DETAILS</p><h2 id="quiz-title" ref={modalTitleRef} tabIndex={-1}>What&apos;s your world like?</h2><p className="modal-lead">Four quick details. This is just for a playful result, never a serious valuation.</p><div className="fields"><label>What do you do?<input maxLength={60} value={answers.profession} onChange={(e) => update("profession", e.target.value)} placeholder="e.g. Product designer" required /></label><label>Income range<select value={answers.income} onChange={(e) => update("income", e.target.value)} required><option value="">Choose a range</option><option>Below ₹2 lakh</option><option>₹2 lakh – ₹4 lakh</option><option>₹4 lakh – ₹8 lakh</option><option>₹8 lakh – ₹15 lakh</option><option>₹15 lakh – ₹30 lakh</option><option>Above ₹30 lakh</option><option>Prefer not to say</option></select></label><label>City<input maxLength={60} value={answers.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Chennai" required /></label><label>What are you chasing?<input maxLength={120} value={answers.goal} onChange={(e) => update("goal", e.target.value)} placeholder="e.g. Launching my first company" required /></label></div></div>}{error && <p className="error" role="alert">{error}</p>}<div className="modal-actions">{formStep === "details" && <button className="text-button modal-back" type="button" onClick={() => { setError(""); setFormStep("profile"); }}>Back</button>}<button className="primary-button" type="submit" disabled={compressing}>{formStep === "profile" ? "Continue to details" : "See my result"} <span aria-hidden="true">→</span></button></div></form> : <section className="launch-pass modal-reveal" aria-live="polite"><p className="eyebrow">YOUR SCORE IS READY</p><h2 id="quiz-title" ref={modalTitleRef} tabIndex={-1}>Let&apos;s reveal it.</h2><p>Your launch result is ready whenever you are.</p>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button" onClick={generate} disabled={loading}>{loading ? "Calculating your score..." : "Reveal My Worth"} <span aria-hidden="true">→</span></button><button className="text-button" type="button" onClick={() => { setError(""); setStage("form"); setFormStep("details"); }}>Edit my details</button></section>}</section></div>}
  </main>;
}