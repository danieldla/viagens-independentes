import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function refreshSite() {
  revalidateTag("content");
  revalidatePath("/", "layout");
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Criar (sem id) ou atualizar (com id)
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail("Não autorizado", 401);

  const b = await req.json().catch(() => null);
  if (!b) return fail("Pedido inválido.");

  const { type, id, countryId } = b;
  if (type !== "country" && type !== "city") return fail("Tipo inválido.");
  if (typeof b.title !== "string" || !b.title.trim()) return fail("O título é obrigatório.");
  if (typeof b.slug !== "string" || !SLUG_RE.test(b.slug)) {
    return fail("Slug inválido: usa só letras minúsculas, números e hífens.");
  }
  if (type === "city" && typeof countryId !== "string") return fail("Escolhe o país da cidade.");

  const row = {
    slug: b.slug,
    title: b.title.trim(),
    description: String(b.description ?? ""),
    cover_image: b.coverImage ? String(b.coverImage) : null,
    content: String(b.content ?? ""),
  };

  const sb = getSupabaseAdmin();
  const table = type === "country" ? "countries" : "cities";
  const payload = type === "city" ? { ...row, country_id: countryId } : row;

  const query = id
    ? sb.from(table).update(payload).eq("id", id)
    : sb.from(table).insert(payload);
  const { data, error } = await query.select().single();

  if (error) {
    return fail(error.code === "23505" ? "Já existe um registo com esse slug." : error.message);
  }

  refreshSite();
  return NextResponse.json({ row: data });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return fail("Não autorizado", 401);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if ((type !== "country" && type !== "city") || !id) return fail("Pedido inválido.");

  const { error } = await getSupabaseAdmin()
    .from(type === "country" ? "countries" : "cities")
    .delete()
    .eq("id", id);
  if (error) return fail(error.message);

  refreshSite();
  return NextResponse.json({ ok: true });
}
