import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Public results need Supabase configured." }, { status: 503 });
  const { slug } = await params;
  const { data, error } = await supabase.from("results").select("public_result").eq("slug", slug).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "This result is unavailable." }, { status: 404 });
  return NextResponse.json({ result: data.public_result });
}
