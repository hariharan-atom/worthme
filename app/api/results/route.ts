import { NextResponse } from "next/server";
import { isValidAnswers, makeResult } from "@/lib/worth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  if (!isValidAnswers(input)) return NextResponse.json({ error: "Please complete every field and confirm you are 18+." }, { status: 400 });
  const result = makeResult(input);
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("results").insert({ slug: result.slug, public_result: result });
    if (error) return NextResponse.json({ error: "We could not save that result. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ result });
}
