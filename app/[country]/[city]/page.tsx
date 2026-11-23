import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllCountries,
  getCitiesOfCountry,
  getCity,
  getCountry,
  markdownToHtml,
} from "@/lib/content";

type Props = { params: { country: string; city: string } };

export const dynamicParams = false;

// Percorre todos os países e, para cada um, os ficheiros em data/cities/<país>/
export function generateStaticParams() {
  return getAllCountries().flatMap((country) =>
    getCitiesOfCountry(country.slug).map((city) => ({
      country: country.slug,
      city: city.slug,
    }))
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const city = getCity(params.country, params.city);
  const country = getCountry(params.country);
  if (!city) return {};
  return {
    title: country ? `${city.title}, ${country.title}` : city.title,
    description: city.description,
    openGraph: {
      title: city.title,
      description: city.description,
      images: city.coverImage ? [city.coverImage] : undefined,
    },
  };
}

export default async function CityPage({ params }: Props) {
  const country = getCountry(params.country);
  const city = getCity(params.country, params.city);
  if (!country || !city) notFound();

  const contentHtml = await markdownToHtml(city.content);

  return (
    <article>
      <nav className="text-sm text-stone-500">
        <Link href={`/${country.slug}`} className="hover:underline">
          ← {country.title}
        </Link>
      </nav>

      {city.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={city.coverImage}
          alt=""
          className="mt-4 aspect-[21/9] w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{city.title}</h1>

      <div
        className="prose prose-stone mt-4 max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}
