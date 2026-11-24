import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCityParams, getCity, markdownToHtml } from "@/lib/content";

type Props = { params: { country: string; city: string } };

export async function generateStaticParams() {
  try {
    return await getAllCityParams();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity(params.country, params.city);
  if (!city) return {};
  return {
    title: `${city.title}, ${city.countryTitle}`,
    description: city.description,
    openGraph: {
      title: city.title,
      description: city.description,
      images: city.coverImage ? [city.coverImage] : undefined,
    },
  };
}

export default async function CityPage({ params }: Props) {
  const city = await getCity(params.country, params.city);
  if (!city) notFound();

  const contentHtml = await markdownToHtml(city.content);

  return (
    <article>
      <nav className="text-sm text-stone-500">
        <Link href={`/${city.countrySlug}`} className="hover:underline">
          ← {city.countryTitle}
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
