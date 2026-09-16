import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isPublicResult } from "@/lib/worth";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]{10}$/.test(slug)) return NextResponse.json({ error: "This link is invalid." }, { status: 400 });
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "Saved results are unavailable on this deployment." }, { status: 503 });
    const { data, error } = await supabase.from("results").select("public_result").eq("slug", slug).abortSignal(AbortSignal.timeout(10000)).maybeSingle();
    if (error) return NextResponse.json({ error: "We could not load this result. Please try again." }, { status: 503 });
    if (!data || !isPublicResult(data.public_result)) return NextResponse.json({ error: "This result is unavailable." }, { status: 404 });
    return NextResponse.json({ result: data.public_result }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "The result service is temporarily unavailable." }, { status: 503 }); }
}