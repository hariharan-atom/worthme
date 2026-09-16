import { isPublicResult, type PublicResult } from "./worth.ts";
export function packResult(result: PublicResult): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ ...result, profileImage: undefined }));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
export function unpackResult(encoded: unknown, slug: string): PublicResult | null {
  if (typeof encoded !== "string" || encoded.length > 12000 || !/^[\w-]+$/.test(encoded)) return null;
  try {
    const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
    return isPublicResult(value) && value.slug === slug ? value : null;
  } catch { return null; }
}