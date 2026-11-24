import { remark } from "remark";
import html from "remark-html";

/**
 * Leitura pública via API REST do Supabase (PostgREST), com cache do Next.js.
 * - `revalidate`: renova a cache de hora a hora no máximo.
 * - `tags: ["content"]`: o admin invalida a cache ao gravar (revalidateTag).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const REVALIDATE_SECONDS = 3600;

export type CityRef = { slug: string; title: string };

export type CountrySummary = {
  slug: string;
  title: string;
  coverImage?: string;
  description: string;
};

export type Country = CountrySummary & {
  cities: CityRef[];
  content: string; // Markdown
};

export type City = {
  slug: string;
  title: string;
  coverImage?: string;
  description: string;
  content: string; // Markdown
  countrySlug: string;
  countryTitle: string;
};

async function rest<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente."
    );
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS, tags: ["content"] },
  });
  if (!res.ok) {
    throw new Error(`Supabase REST ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function excerpt(markdown: string, max = 160): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max - 1).trimEnd() + "…" : plain;
}

type CountryRow = {
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  content?: string;
  cities?: CityRef[];
};

type CityRow = {
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  content: string;
  countries: { slug: string; title: string };
};

export async function getAllCountries(): Promise<CountrySummary[]> {
  const rows = await rest<CountryRow[]>(
    "countries?select=slug,title,description,cover_image&order=title.asc"
  );
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    coverImage: r.cover_image ?? undefined,
    description: r.description ?? "",
  }));
}

export async function getCountry(slug: string): Promise<Country | undefined> {
  const rows = await rest<CountryRow[]>(
    `countries?select=slug,title,description,cover_image,content,cities(slug,title)` +
      `&cities.order=title.asc&slug=eq.${encodeURIComponent(slug)}&limit=1`
  );
  const r = rows[0];
  if (!r) return undefined;
  const content = r.content ?? "";
  return {
    slug: r.slug,
    title: r.title,
    coverImage: r.cover_image ?? undefined,
    description: r.description || excerpt(content),
    cities: r.cities ?? [],
    content,
  };
}

export async function getCity(
  countrySlug: string,
  citySlug: string
): Promise<City | undefined> {
  const rows = await rest<CityRow[]>(
    `cities?select=slug,title,description,cover_image,content,countries!inner(slug,title)` +
      `&slug=eq.${encodeURIComponent(citySlug)}` +
      `&countries.slug=eq.${encodeURIComponent(countrySlug)}&limit=1`
  );
  const r = rows[0];
  if (!r) return undefined;
  return {
    slug: r.slug,
    title: r.title,
    coverImage: r.cover_image ?? undefined,
    description: r.description || excerpt(r.content),
    content: r.content,
    countrySlug: r.countries.slug,
    countryTitle: r.countries.title,
  };
}

/** Pares { country, city } para generateStaticParams. */
export async function getAllCityParams(): Promise<{ country: string; city: string }[]> {
  const rows = await rest<{ slug: string; countries: { slug: string } }[]>(
    "cities?select=slug,countries!inner(slug)"
  );
  return rows.map((r) => ({ country: r.countries.slug, city: r.slug }));
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await remark().use(html).process(markdown);
  return String(file);
}
