"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="result-state"><p className="eyebrow">LET'S TRY THAT AGAIN</p><h1>A small plot twist.</h1><p>Something interrupted this page. You can retry or return home.</p><div className="state-actions"><button className="primary-button" onClick={reset}>Try again</button><a className="outline-button" href="/">Back to WorthMe</a></div></main>;
}