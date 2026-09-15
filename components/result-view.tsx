"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicResult } from "@/lib/worth";

function unpack(encoded?: string): PublicResult | null {
  if (!encoded) return null;
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((encoded.length + 3) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded)))) as PublicResult;
  } catch { return null; }
}
function Logo() { return <NextImage className="logo" src="/brand/worthme-logo.png" alt="WorthMe - Discover. Laugh. Improve." width={903} height={301} priority />; }
async function loadImage(source: string) { const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(); image.src = source; }); return image; }

export default function ResultView({ slug, encoded }: { slug: string; encoded?: string }) {
  const initial = useMemo(() => unpack(encoded), [encoded]);
  const [result, setResult] = useState<PublicResult | null>(initial);
  const [state, setState] = useState(initial ? "ready" : "loading");
  const [notice, setNotice] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem(`worthme:${slug}`);
    if (saved) { try { setResult(JSON.parse(saved)); setState("ready"); } catch { /* Ignore stale browser data. */ } }
    if (initial) return;
    fetch(`/api/results/${slug}`).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setResult(body.result); setState("ready"); }).catch(() => { if (!saved) setState("missing"); });
  }, [initial, slug]);
  async function drawCard() {
    if (!result || !canvas.current) return;
    const c = canvas.current, ctx = c.getContext("2d"); if (!ctx) return;
    c.width = 1080; c.height = 1350; ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#061833"; ctx.fillRect(0, 0, 1080, 25); ctx.fillStyle = "#061833"; ctx.font = "900 68px Arial"; ctx.fillText("Worth", 72, 118); ctx.fillStyle = "#ffc400"; ctx.fillText("Me", 275, 118); ctx.fillStyle = "#061833"; ctx.font = "600 25px Arial"; ctx.fillText("DISCOVER. LAUGH. IMPROVE.", 74, 158);
    if (result.profileImage) try { const image = await loadImage(result.profileImage); ctx.save(); ctx.beginPath(); ctx.roundRect(72, 225, 320, 410, 28); ctx.clip(); const scale = Math.max(320 / image.width, 410 / image.height); ctx.drawImage(image, 72 + (320 - image.width * scale) / 2, 225 + (410 - image.height * scale) / 2, image.width * scale, image.height * scale); ctx.restore(); } catch { /* The card remains usable without a profile photo. */ }
    ctx.fillStyle = "#061833"; ctx.font = "900 58px Arial"; ctx.fillText(result.name.toUpperCase().slice(0, 19), 445, 280); ctx.font = "700 24px Arial"; ctx.fillStyle = "#5a6780"; ctx.fillText(result.humanType.toUpperCase(), 447, 320);
    ctx.fillStyle = "#fff3ca"; ctx.beginPath(); ctx.roundRect(445, 355, 560, 230, 26); ctx.fill(); ctx.fillStyle = "#061833"; ctx.font = "700 28px Arial"; ctx.fillText("WORTH SCORE", 480, 410); ctx.font = "900 145px Arial"; ctx.fillText(String(result.score), 480, 540); ctx.font = "700 54px Arial"; ctx.fillText("/ 100", 700, 530);
    ctx.fillStyle = "#d7f8ee"; ctx.beginPath(); ctx.roundRect(445, 620, 560, 125, 24); ctx.fill(); ctx.fillStyle = "#061833"; ctx.font = "700 25px Arial"; ctx.fillText("ENTERTAINMENT VALUE", 480, 665); ctx.font = "900 49px Arial"; ctx.fillText(result.valuation, 480, 720);
    let y = 815; result.scores.forEach((score) => { ctx.fillStyle = "#061833"; ctx.font = "700 24px Arial"; ctx.fillText(score.label, 75, y); ctx.fillStyle = "#e9edf3"; ctx.beginPath(); ctx.roundRect(330, y - 22, 370, 18, 9); ctx.fill(); ctx.fillStyle = "#53b6eb"; ctx.beginPath(); ctx.roundRect(330, y - 22, score.value * 3.7, 18, 9); ctx.fill(); ctx.fillStyle = "#061833"; ctx.font = "700 25px Arial"; ctx.fillText(String(score.value), 730, y); y += 62; });
    ctx.fillStyle = "#fff0d2"; ctx.beginPath(); ctx.roundRect(72, 1150, 936, 115, 26); ctx.fill(); ctx.fillStyle = "#061833"; ctx.font = "800 26px Arial"; ctx.fillText(`YOUR VALUE GAP: ${result.valueGap.toUpperCase()}`, 108, 1200); ctx.font = "500 22px Arial"; ctx.fillText(result.upgrade.slice(0, 72), 108, 1240); ctx.fillStyle = "#061833"; ctx.fillRect(0, 1325, 1080, 25);
  }
  async function download() { await drawCard(); const link = document.createElement("a"); link.download = `worthme-${result?.slug}.png`; link.href = canvas.current?.toDataURL("image/png") ?? ""; link.click(); setNotice("Your card is downloading."); }
  async function share() { const url = window.location.href; const text = `I scored ${result?.score}/100 on WorthMe and apparently I am worth ${result?.valuation}. Think you can beat me?`; try { if (navigator.share) await navigator.share({ title: "My WorthMe score", text, url }); else { await navigator.clipboard.writeText(`${text}\n${url}`); setNotice("Challenge link copied."); } } catch { /* User dismissed the native share sheet. */ } }
  if (state === "loading") return <main className="result-state"><div className="loader" /><p>Calculating a surprisingly serious result...</p></main>;
  if (!result) return <main className="result-state"><h1>This card has moved on.</h1><p>It may have expired, or the link is incomplete.</p><a className="primary-button" href="/">Make your own</a></main>;
  return <main className="result-page"><nav className="site-nav"><a href="/" aria-label="WorthMe home"><Logo /></a><a className="nav-cta" href="/">Make your own <span>→</span></a></nav><section className="result-wrap"><p className="eyebrow centered">SAME PERSON. BIGGER POTENTIAL.</p><h1>{result.name}, this is your <mark>WorthMe.</mark></h1><div className="result-board"><aside className="result-photo">{result.profileImage ? <img src={result.profileImage} alt={`${result.name}'s selected profile`} /> : <div className="initials">{result.name.slice(0, 1).toUpperCase()}</div>}<i>Curious today.<br />Better tomorrow!</i></aside><article className="score-report"><p className="report-label">WORTH SCORE <span>For entertainment only</span></p><div className="score-total"><strong>{result.score}</strong><span>/ 100</span><b>★</b></div><div className="value-box"><p>ESTIMATED ENTERTAINMENT VALUE</p><strong>{result.valuation}</strong></div><div className="human-type"><span>✦</span>{result.humanType}</div><div className="bars">{result.scores.map((score, index) => <div className="bar" key={score.label}><span>{score.label}</span><i><b className={`bar-fill fill-${index}`} style={{ width: `${score.value}%` }} /></i><strong>{score.value}</strong></div>)}</div></article><aside className="result-side"><section className="verdict"><p className="eyebrow">AI VERDICT</p><blockquote>&ldquo;{result.verdict}&rdquo;</blockquote></section><section className="gap-card"><p>YOUR BIGGEST<br />VALUE GAP</p><strong>{result.valueGap}</strong></section><section className="upgrade-card"><p>YOUR ONE UPGRADE</p><strong>{result.upgrade}</strong></section></aside></div><div className="challenge-result"><div><p>THINK YOU&apos;RE WORTH MORE?</p><strong>Challenge a friend!</strong></div><button className="primary-button" onClick={share}>Share my score <span aria-hidden="true">→</span></button><button className="outline-button" onClick={download}>Download card</button></div>{notice && <p className="notice" aria-live="polite">{notice}</p>}<p className="disclaimer">WorthMe is a playful entertainment experience - not a financial, professional, employment, or psychological assessment. You decide whether to share this card.</p></section><canvas ref={canvas} className="sr-only" aria-hidden="true" /></main>;
}