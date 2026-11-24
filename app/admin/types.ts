export type CountryRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  content: string;
};

export type CityRow = CountryRow & { country_id: string };
