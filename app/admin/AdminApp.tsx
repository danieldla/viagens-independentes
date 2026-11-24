"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImageDropzone from "./ImageDropzone";
import type { CityRow, CountryRow } from "./types";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <p className="text-sm text-stone-500">A carregar editor…</p>,
});

type Kind = "country" | "city";
type Selection = { kind: Kind; id: string | null }; // id null = novo registo

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Props = { initialCountries: CountryRow[]; initialCities: CityRow[] };

export default function AdminApp({ initialCountries, initialCities }: Props) {
  const router = useRouter();
  const [countries, setCountries] = useState(initialCountries);
  const [cities, setCities] = useState(initialCities);
  const [sel, setSel] = useState<Selection | null>(null);

  const entry = sel?.id
    ? sel.kind === "country"
      ? countries.find((c) => c.id === sel.id)
      : cities.find((c) => c.id === sel.id)
    : undefined;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  function onSaved(kind: Kind, row: CountryRow | CityRow) {
    const upsert = <T extends { id: string; title: string }>(list: T[], r: T) =>
      (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]).sort(
        (a, b) => a.title.localeCompare(b.title, "pt")
      );
    if (kind === "country") setCountries((l) => upsert(l, row as CountryRow));
    else setCities((l) => upsert(l, row as CityRow));
    setSel({ kind, id: row.id });
  }

  function onDeleted(kind: Kind, id: string) {
    if (kind === "country") {
      setCountries((l) => l.filter((c) => c.id !== id));
      setCities((l) => l.filter((c) => c.country_id !== id));
    } else {
      setCities((l) => l.filter((c) => c.id !== id));
    }
    setSel(null);
  }

  const itemClass = (active: boolean) =>
    `block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-stone-100 ${
      active ? "bg-stone-100 font-semibold" : ""
    }`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <button onClick={logout} className="text-sm text-stone-600 underline">
          Sair
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSel({ kind: "country", id: null })}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              + Novo país
            </button>
            <button
              onClick={() => setSel({ kind: "city", id: null })}
              disabled={countries.length === 0}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50"
            >
              + Nova cidade
            </button>
          </div>

          <nav className="space-y-3">
            {countries.map((country) => (
              <div key={country.id}>
                <button
                  onClick={() => setSel({ kind: "country", id: country.id })}
                  className={itemClass(sel?.kind === "country" && sel.id === country.id)}
                >
                  {country.title}
                </button>
                <div className="ml-3 border-l border-stone-200 pl-2">
                  {cities
                    .filter((c) => c.country_id === country.id)
                    .map((city) => (
                      <button
                        key={city.id}
                        onClick={() => setSel({ kind: "city", id: city.id })}
                        className={itemClass(sel?.kind === "city" && sel.id === city.id)}
                      >
                        {city.title}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          {sel ? (
            <EntryForm
              key={`${sel.kind}:${sel.id ?? "new"}`}
              kind={sel.kind}
              entry={entry}
              countries={countries}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ) : (
            <p className="text-stone-500">
              Escolhe um país ou uma cidade à esquerda, ou cria um novo.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

type FormProps = {
  kind: Kind;
  entry?: CountryRow | CityRow;
  countries: CountryRow[];
  onSaved: (kind: Kind, row: CountryRow | CityRow) => void;
  onDeleted: (kind: Kind, id: string) => void;
};

function EntryForm({ kind, entry, countries, onSaved, onDeleted }: FormProps) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(entry));
  const [description, setDescription] = useState(entry?.description ?? "");
  const [coverImage, setCoverImage] = useState(entry?.cover_image ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [countryId, setCountryId] = useState(
    (entry as CityRow | undefined)?.country_id ?? countries[0]?.id ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const country = countries.find((c) => c.id === countryId);
  const viewHref = !entry
    ? null
    : kind === "country"
    ? `/${entry.slug}`
    : country
    ? `/${country.slug}/${entry.slug}`
    : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: kind,
        id: entry?.id,
        countryId: kind === "city" ? countryId : undefined,
        slug,
        title,
        description,
        coverImage,
        content,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "Erro ao guardar." });
      return;
    }
    setMessage({ ok: true, text: "Guardado. O site já foi atualizado." });
    onSaved(kind, data.row);
  }

  async function remove() {
    if (!entry) return;
    const extra = kind === "country" ? " Todas as cidades deste país serão apagadas." : "";
    if (!confirm(`Apagar "${entry.title}"?${extra}`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/save?type=${kind}&id=${entry.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(kind, entry.id);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ ok: false, text: data.error ?? "Erro ao apagar." });
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-md border border-stone-300 px-3 py-2";

  return (
    <form onSubmit={save} className="space-y-5">
      <h2 className="text-xl font-semibold">
        {entry ? "Editar" : "Novo"} {kind === "country" ? "país" : "cidade"}
      </h2>

      {kind === "city" && (
        <label className="block text-sm font-medium">
          País
          <select
            value={countryId}
            onChange={(e) => setCountryId(e.target.value)}
            className={input}
          >
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm font-medium">
        Título
        <input
          value={title}
          required
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={input}
        />
      </label>

      <label className="block text-sm font-medium">
        Slug (parte do URL)
        <input
          value={slug}
          required
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className={input}
        />
      </label>

      <label className="block text-sm font-medium">
        Descrição (SEO)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={input}
        />
      </label>

      <div>
        <label className="block text-sm font-medium">
          Imagem de capa (URL)
          <input
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://…"
            className={input}
          />
        </label>
        <div className="mt-2">
          <ImageDropzone
            label="Arrasta a imagem de capa para aqui ou clica para escolher"
            onUploaded={setCoverImage}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Texto</p>
        <div data-color-mode="light" className="mt-1">
          <MDEditor value={content} onChange={(v) => setContent(v ?? "")} height={420} />
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs text-stone-500">
            Imagens para o texto: depois do upload, aparecem no fim do texto em Markdown.
          </p>
          <ImageDropzone
            label="Arrasta imagens para inserir no texto"
            onUploaded={(url) => setContent((c) => `${c}${c ? "\n\n" : ""}![](${url})\n`)}
          />
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-stone-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "A guardar…" : "Guardar"}
        </button>
        {viewHref && (
          <a href={viewHref} target="_blank" rel="noreferrer" className="text-sm underline">
            Ver no site
          </a>
        )}
        {entry && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="ml-auto text-sm text-red-700 underline disabled:opacity-50"
          >
            Apagar
          </button>
        )}
      </div>
    </form>
  );
}
