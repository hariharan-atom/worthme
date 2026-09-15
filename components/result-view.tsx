"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicResult } from "@/lib/worth";

function unpack(encoded?: string): PublicResult | null {
  if (!encoded) return null;
  try {
    const padded = encoded.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((encoded.length + 3) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded)))) as PublicResult;
  } catch { return null; }
}
function Mark() { return <span className="mark" aria-hidden="true"><i /><i /><i /></span>; }

export default function ResultView({ slug, encoded }: { slug: string; encoded?: string }) {
  const initial = useMemo(() => unpack(encoded), [encoded]);
  const [result, setResult] = useState<PublicResult | null>(initial);
  const [state, setState] = useState(initial ? "ready" : "loading");
  const [notice, setNotice] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (initial) return;
    fetch(`/api/results/${slug}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setResult(body.result); setState("ready");
    }).catch(() => setState("missing"));
  }, [initial, slug]);
  function drawCard() {
    if (!result || !canvas.current) return;
    const c = canvas.current, ctx = c.getContext("2d"); if (!ctx) return;
    c.width = 1080; c.height = 1350;
    const bg = ctx.createLinearGradient(0, 0, 1080, 1350); bg.addColorStop(0, "#11162a"); bg.addColorStop(.58, "#202050"); bg.addColorStop(1, "#c43e7b"); ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.beginPath(); ctx.arc(940, 180, 260, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(130, 1230, 310, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 52px Arial"; ctx.fillText("WORTHME™", 74, 102); ctx.font = "600 28px Arial"; ctx.fillStyle = "#cbd5ff"; ctx.fillText("AN ENTERTAINMENT-ONLY VALUATION", 74, 150);
    ctx.fillStyle = "#fff"; ctx.font = "700 76px Arial"; ctx.fillText(result.name.toUpperCase().slice(0, 22), 74, 285); ctx.font = "500 36px Arial"; ctx.fillStyle = "#d8d8f0"; ctx.fillText(result.humanType.toUpperCase(), 74, 342);
    ctx.font = "700 282px Arial"; ctx.fillStyle = "#f8df86"; ctx.fillText(String(result.score), 67, 620); ctx.font = "600 46px Arial"; ctx.fillStyle = "#fff"; ctx.fillText("/100  WORTH SCORE", 470, 590);
    ctx.font = "700 57px Arial"; ctx.fillText(result.valuation, 74, 698); ctx.font = "500 29px Arial"; ctx.fillStyle = "#d8d8f0"; ctx.fillText("ENTERTAINMENT VALUATION", 76, 742);
    let y = 840; result.scores.slice(0, 4).forEach((score) => { ctx.fillStyle = "#fff"; ctx.font = "600 30px Arial"; ctx.fillText(score.label.toUpperCase(), 76, y); ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(420, y - 25, 510, 18); ctx.fillStyle = "#f8df86"; ctx.fillRect(420, y - 25, score.value * 5.1, 18); ctx.fillStyle = "#fff"; ctx.font = "700 31px Arial"; ctx.fillText(String(score.value), 958, y); y += 76; });
    ctx.fillStyle = "#fff"; ctx.font = "700 32px Arial"; ctx.fillText(`VALUE GAP  ·  ${result.valueGap.toUpperCase()}`, 76, 1190); ctx.font = "500 27px Arial"; ctx.fillStyle = "#d8d8f0"; ctx.fillText("worthme.app · your actual worth is not a score", 76, 1250);
  }
  function download() { drawCard(); const link = document.createElement("a"); link.download = `worthme-${result?.slug}.png`; link.href = canvas.current?.toDataURL("image/png") ?? ""; link.click(); setNotice("Your card is downloading."); }
  async function share() { const url = window.location.href; const text = `I scored ${result?.score}/100 on WorthMe and apparently I’m worth ${result?.valuation}. Think you can beat me?`; try { if (navigator.share) await navigator.share({ title: "My WorthMe score", text, url }); else { await navigator.clipboard.writeText(`${text}\n${url}`); setNotice("Challenge link copied."); } } catch { /* User dismissed the native share sheet. */ } }
  if (state === "loading") return <main className="loading-page"><div className="loader" /><p>Opening this very serious valuation…</p></main>;
  if (!result) return <main className="loading-page"><h1>This card has moved on.</h1><p>It may have expired, or the link is incomplete.</p><a className="button" href="/">Make your own</a></main>;
  return <main className="result-page"><nav><a className="brand" href="/"><Mark />WorthMe<span>™</span></a><a className="nav-link" href="/">Make your own</a></nav><section className="result-wrap"><p className="eyebrow">YOUR ENTERTAINMENT VALUATION</p><h1 className="result-title">{result.name},<br /><em>this is your moment.</em></h1><div className="result-grid"><article className="result-card"><div className="card-top"><span>WORTH SCORE</span><p>For entertainment only</p></div><div className="score-line"><strong>{result.score}</strong><span>/100</span></div><p className="valuation">{result.valuation}</p><p className="valuation-label">ENTERTAINMENT VALUATION</p><div className="human"><span>Human type</span><h2>{result.humanType}</h2></div><div className="bars">{result.scores.map((score) => <div className="bar" key={score.label}><span>{score.label}</span><i><b style={{ width: `${score.value}%` }} /></i><strong>{score.value}</strong></div>)}</div></article><aside className="verdict"><p className="eyebrow">THE VERDICT</p><blockquote>“{result.verdict}”</blockquote><div className="gap"><span>Your biggest value gap</span><strong>{result.valueGap}</strong><p>{result.upgrade}</p></div></aside></div><div className="result-actions"><button className="button" onClick={download}>Download my card <span aria-hidden="true">↓</span></button><button className="button secondary" onClick={share}>Challenge a friend <span aria-hidden="true">↗</span></button></div>{notice && <p className="notice" aria-live="polite">{notice}</p>}<p className="disclaimer">WorthMe is a playful entertainment experience—not a financial, professional, employment, or psychological assessment. You choose whether to share this card.</p></section><canvas ref={canvas} className="sr-only" aria-hidden="true" /></main>;
}
