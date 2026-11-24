import { getSupabaseAdmin } from "@/lib/supabase-admin";
import AdminApp from "./AdminApp";
import type { CityRow, CountryRow } from "./types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sb = getSupabaseAdmin();
  const [countries, cities] = await Promise.all([
    sb.from("countries").select("*").order("title"),
    sb.from("cities").select("*").order("title"),
  ]);

  if (countries.error || cities.error) {
    return (
      <p className="text-red-700">
        Erro ao ler o Supabase: {countries.error?.message ?? cities.error?.message}
      </p>
    );
  }

  return (
    <AdminApp
      initialCountries={countries.data as CountryRow[]}
      initialCities={cities.data as CityRow[]}
    />
  );
}
