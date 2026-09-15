import ResultView from "@/components/result-view";

export default async function ResultPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ d?: string }> }) {
  const { slug } = await params;
  const { d } = await searchParams;
  return <ResultView slug={slug} encoded={d} />;
}
