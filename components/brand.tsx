import Image from "next/image";
import type { ReactNode } from "react";

export function Logo({ priority = false }: { priority?: boolean }) {
  return <Image className="logo" src="/brand/worthme-logo.png" alt="WorthMe — Discover. Laugh. Improve." width={903} height={301} priority={priority} sizes="160px" />;
}
export function Icon({ name, className = "" }: { name: "arrow" | "close" | "spark" | "shield" | "share" | "check" | "camera" | "clock" | "download" | "menu"; className?: string }) {
  const paths: Record<string, ReactNode> = {
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    spark: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" /><path d="M20 2v4m-2-2h4" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m9 10.5 6-4m-6 7 6 4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    camera: <><path d="M8 6 10 3h4l2 3h4v14H4V6Z" /><circle cx="12" cy="12" r="4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></>,
  };
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function LoadingExperience({ label = "Putting your perspective together…", compact = false }: { label?: string; compact?: boolean }) {
  return <div className={`loading-experience ${compact ? "compact" : ""}`} role="status" aria-live="polite">
    <div className="loading-scene" aria-hidden="true"><div className="loading-mini-card"><span className="mini-brand">Worth<mark>Me</mark></span><span className="loading-score">? <small>/ 100</small></span><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div><span className="loading-spark"><Icon name="spark" /></span></div>
    <div className="loading-orbit" aria-hidden="true"><span>W<span>M</span></span><i /><b /></div>
    <p className="eyebrow">A LITTLE CURIOSITY. A NEW PERSPECTIVE.</p><h2>{label}</h2>
    <div className="loading-track" aria-hidden="true"><i /></div><p>Your card will appear here as soon as it’s ready.</p>
  </div>;
}