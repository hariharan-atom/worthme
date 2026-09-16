"use client";
import { useEffect, useState } from "react";
import { isPublicResult, type PublicResult } from "@/lib/worth";
import { packResult, unpackResult } from "@/lib/share";
import { Icon, LoadingExperience, Logo } from "./brand";

export default function ResultView({ slug, encoded }: { slug: string; encoded?: string }) {
  const [result, setResult] = useState<PublicResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setResult(null); setState("loading"); setPhotoFailed(false); setNotice(""); setManualLink("");
    let cached: PublicResult | null = null;
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(`worthme:${slug}`) || "null");
      if (isPublicResult(parsed) && parsed.slug === slug) cached = parsed;
    } catch { /* Private browsing and corrupt session entries are safe to ignore. */ }
    const portable = unpackResult(encoded, slug);
    if (portable) {
      // The link is authoritative; reuse only the matching card's local photo.
      const profileImage = cached && packResult(cached) === packResult(portable) ? cached.profileImage : undefined;
      setResult({ ...portable, profileImage }); setState("ready"); clearTimeout(timer);
      return () => { active = false; };
    }
    if (encoded || !/^[a-z0-9]{10}$/.test(slug)) { setState("missing"); clearTimeout(timer); return () => { active = false; }; }
    if (cached) { setResult(cached); setState("ready"); }
    fetch(`/api/results/${slug}`, { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!active) return;
      if (response.status === 404 || response.status === 400) { setResult(null); setState("missing"); return; }
      if (!response.ok || !isPublicResult(body.result) || body.result.slug !== slug) throw new Error("Unavailable");
      setResult(body.result); setState("ready");
    }).catch(() => { if (active && !cached) setState("error"); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [slug, encoded, retry]);
  async function share() {
    if (!result) return;
    const url = window.location.href;
    setNotice(""); setManualLink("");
    try {
      if (navigator.share) await navigator.share({ title: "My WorthMe score", text: `I scored ${result.score}/100 on WorthMe. What’s your plot twist?`, url });
      else { await navigator.clipboard.writeText(url); setNotice("Your link is copied. Let the friendly competition begin."); }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setManualLink(url);
      setNotice("Select and copy your link below.");
    }
  }
  async function download() {
    if (!result || downloading) return;
    setDownloading(true); setNotice("");
    try {
      const { downloadCard } = await import("@/lib/download-card");
      await downloadCard(result);
      setNotice("Your card is downloading.");
    } catch { setNotice("The card could not be downloaded. Please try again or share the link."); }
    finally { setDownloading(false); }
  }
  if (state === "loading") return <main className="result-state"><LoadingExperience /></main>;
  if (!result) return <main className="result-state"><p className="eyebrow">{state === "error" ? "A SMALL CONNECTION HICCUP" : "THIS LINK NEEDS A SECOND LOOK"}</p><h1>{state === "error" ? "Your card is taking a moment." : "We couldn’t find that card."}</h1><p>{state === "error" ? "The result service is unavailable right now. Try again in a moment." : "The link may be incomplete or the result may no longer be available."}</p><div className="state-actions">{state === "error" && <button className="primary-button" onClick={() => setRetry(r => r + 1)}>Try again</button>}<a className="outline-button" href="/">Back to WorthMe</a></div></main>;
  return <div className="result-page">
    <a className="skip-link" href="#result">Skip to your result</a>
    <header className="site-header"><nav className="site-nav" aria-label="Main navigation"><a href="/" aria-label="WorthMe home"><Logo priority /></a><a className="nav-cta" href="/">Make your own <Icon name="arrow" /></a></nav></header>
    <main id="result" className="result-wrap"><p className="eyebrow centered">SAME PERSON. BIGGER POTENTIAL.</p><h1>{result.name}, this is your <mark>WorthMe.</mark></h1>
      {encoded && <p className="preview-notice">This is a portable preview card. Share the full link to keep it working. Your photo stays in this browser and is not included in this link.</p>}
      <div className="result-board">
        <aside className="result-photo">{result.profileImage && !photoFailed ? <img src={result.profileImage} alt={`${result.name}’s chosen profile photo`} onError={() => setPhotoFailed(true)} /> : <div className="initials" aria-label={`Initial for ${result.name}`}>{Array.from(result.name)[0].toUpperCase()}</div>}<i>Curious today.<br />Better tomorrow.</i></aside>
        <article className="score-report" aria-label="Your worth score"><p className="report-label">WORTH SCORE <span>For entertainment</span></p><div className="score-total"><strong>{result.score}</strong><span>/ 100</span><Icon name="spark" /></div><div className="value-box"><p>FICTIONAL ENTERTAINMENT VALUE</p><strong>{result.valuation}</strong></div><div className="human-type">{result.humanType}</div><div className="bars">{result.scores.map((score, i) => <div className="bar" key={i}><span>{score.label}</span><i aria-hidden="true"><b className={`bar-fill fill-${i}`} style={{ width: `${score.value}%` }} /></i><strong aria-label={`${score.value} out of 100`}>{score.value}</strong></div>)}</div></article>
        <aside className="result-side"><section className="verdict"><h2 className="eyebrow">THE WORTHME VERDICT</h2><blockquote>“{result.verdict}”</blockquote></section><section className="gap-card"><h2 className="eyebrow">YOUR NEXT GROWTH AREA</h2><strong>{result.valueGap}</strong></section><section className="upgrade-card"><h2 className="eyebrow">ONE LITTLE UPGRADE</h2><strong>{result.upgrade}</strong></section></aside>
      </div>
      <div className="challenge-result"><div><p>GOOD CONVERSATIONS START HERE</p><strong>Pass the curiosity.</strong></div><button className="primary-button" onClick={share}>Share my score <Icon name="share" /></button><button className="outline-button" onClick={download} disabled={downloading}>{downloading ? "Drawing your card…" : "Download card"}<Icon name="download" /></button></div>
      {notice && <p className="notice" role="status">{notice}</p>}
      {manualLink && <label className="share-fallback">Your share link<input aria-label="Your share link" readOnly value={manualLink} onFocus={e => e.currentTarget.select()} /></label>}
      <p className="disclaimer">You are more than a score. WorthMe is an entertainment experience, not a financial, professional, or psychological assessment. Anyone with your link can view and forward this card.</p>
    </main>
  </div>;
}
