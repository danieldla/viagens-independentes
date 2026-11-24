import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCountries, getCountry, markdownToHtml } from "@/lib/content";

type Props = { params: { country: string } };

// dynamicParams fica ativo (por omissão): países criados no /admin depois do
// build são gerados no primeiro acesso e ficam em cache.

export async function generateStaticParams() {
  try {
    const countries = await getAllCountries();
    return countries.map((c) => ({ country: c.slug }));
  } catch {
    return []; // build sem acesso ao Supabase: as páginas geram-se a pedido
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await getCountry(params.country);
  if (!country) return {};
  return {
    title: country.title,
    description: country.description,
    openGraph: {
      title: country.title,
      description: country.description,
      images: country.coverImage ? [country.coverImage] : undefined,
    },
  };
}

export default async function CountryPage({ params }: Props) {
  const country = await getCountry(params.country);
  if (!country) notFound();

  const contentHtml = await markdownToHtml(country.content);

  return (
    <article>
      {country.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={country.coverImage}
          alt=""
          className="aspect-[21/9] w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{country.title}</h1>

      <div
        className="prose prose-stone mt-4 max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {country.cities.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Cidades</h2>
          <ul className="mt-3 flex flex-wrap gap-3">
            {country.cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${country.slug}/${city.slug}`}
                  className="inline-block rounded-md border border-stone-300 px-4 py-2 hover:bg-stone-50"
                >
                  {city.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
