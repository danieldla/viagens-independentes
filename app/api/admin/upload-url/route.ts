import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { IMAGE_BUCKET, getSupabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED = /^image\/(png|jpe?g|webp|gif|avif)$/;

// Devolve um URL/token de upload assinado: o browser envia o ficheiro direto
// para o Supabase Storage (sem passar pelo limite de 4,5 MB das funções Vercel).
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { filename, contentType } = await req.json().catch(() => ({}));
  if (typeof filename !== "string" || !ALLOWED.test(String(contentType))) {
    return NextResponse.json(
      { error: "Formato não suportado (usa PNG, JPG, WebP, GIF ou AVIF)." },
      { status: 400 }
    );
  }

  const base = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "imagem";
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${base}.${ext}`;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage.from(IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Falha ao preparar upload." }, { status: 500 });
  }

  const { data: pub } = sb.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return NextResponse.json({ path: data.path, token: data.token, publicUrl: pub.publicUrl });
}
