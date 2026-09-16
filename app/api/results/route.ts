import { NextResponse } from "next/server";
import { isValidAnswers, makeResult } from "@/lib/worth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 120 * 1024;
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Send your answers as JSON." }, { status: 415 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Open WorthMe to create a result." }, { status: 403 });
  // Read a bounded stream, including requests without a Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Your answers are missing." }, { status: 400 });
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) { await reader.cancel(); return NextResponse.json({ error: "That upload is too large. Choose a smaller photo." }, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return NextResponse.json({ error: "Your answers could not be read. Please try again." }, { status: 400 }); }
    if (!isValidAnswers(input)) return NextResponse.json({ error: "Check your answers and use a valid photo. WorthMe is for adults aged 18+." }, { status: 400 });
    const result = makeResult(input);
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from("results").insert({ slug: result.slug, public_result: result }).abortSignal(AbortSignal.timeout(12000));
      if (error) return NextResponse.json({ error: "We could not save your result. Your answers are still here—please try again." }, { status: 503 });
    }
    return NextResponse.json({ result, stored: Boolean(supabase) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The result service is temporarily unavailable. Please try again." }, { status: 503 });
  } finally { reader.releaseLock(); }
}