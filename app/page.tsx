import Link from "next/link";
import { getAllCountries } from "@/lib/content";

export default async function HomePage() {
  const countries = await getAllCountries();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Destinos</h1>
      <p className="mt-2 max-w-prose text-stone-600">
        Escolhe um país para ver o guia e as cidades disponíveis.
      </p>

      {countries.length === 0 ? (
        <p className="mt-8 text-stone-500">Ainda não há países publicados.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {countries.map((country) => (
            <li key={country.slug}>
              <Link href={`/${country.slug}`} className="group block">
                {country.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={country.coverImage}
                    alt=""
                    className="aspect-[16/9] w-full rounded-lg object-cover"
                  />
                )}
                <h2 className="mt-3 text-xl font-semibold group-hover:underline">
                  {country.title}
                </h2>
                <p className="mt-1 text-sm text-stone-600">{country.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
