import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const DATA_DIR = path.join(process.cwd(), "data");
const COUNTRIES_DIR = path.join(DATA_DIR, "countries");
const CITIES_DIR = path.join(DATA_DIR, "cities");

export type CityRef = { slug: string; title: string };

export type Country = {
  slug: string;
  title: string;
  coverImage?: string;
  description: string;
  cities: CityRef[]; // do frontmatter; se vazio, descobertas a partir de data/cities/<país>/
  content: string; // Markdown em bruto
};

export type City = {
  slug: string;
  countrySlug: string;
  title: string;
  coverImage?: string;
  description: string;
  content: string;
};

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
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

function fileSlug(file: string): string {
  return file.replace(/\.md$/, "");
}

function readCityFile(countrySlug: string, file: string): City {
  const raw = fs.readFileSync(path.join(CITIES_DIR, countrySlug, file), "utf8");
  const { data, content } = matter(raw);
  return {
    slug: data.slug ?? fileSlug(file),
    countrySlug,
    title: data.title ?? fileSlug(file),
    coverImage: data.coverImage,
    description: data.description ?? excerpt(content),
    content,
  };
}

/** Todas as cidades de um país, lidas de data/cities/<país>/*.md */
export function getCitiesOfCountry(countrySlug: string): City[] {
  return listMarkdownFiles(path.join(CITIES_DIR, countrySlug)).map((f) =>
    readCityFile(countrySlug, f)
  );
}

export function getCity(countrySlug: string, citySlug: string): City | undefined {
  return getCitiesOfCountry(countrySlug).find((c) => c.slug === citySlug);
}

export function getAllCountries(): Country[] {
  return listMarkdownFiles(COUNTRIES_DIR)
    .map((file) => {
      const raw = fs.readFileSync(path.join(COUNTRIES_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const slug: string = data.slug ?? fileSlug(file);

      const cities: CityRef[] = Array.isArray(data.cities)
        ? data.cities
        : getCitiesOfCountry(slug).map(({ slug, title }) => ({ slug, title }));

      return {
        slug,
        title: data.title ?? slug,
        coverImage: data.coverImage,
        description: data.description ?? excerpt(content),
        cities,
        content,
      } satisfies Country;
    })
    .sort((a, b) => a.title.localeCompare(b.title, "pt"));
}

export function getCountry(slug: string): Country | undefined {
  return getAllCountries().find((c) => c.slug === slug);
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await remark().use(html).process(markdown);
  return String(file);
}
