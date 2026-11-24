-- ============ TABELAS ============
create table public.countries (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  description text not null default '',
  cover_image text,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cities (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references public.countries(id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  description text not null default '',
  cover_image text,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (country_id, slug)
);

create index cities_country_id_idx on public.cities (country_id);

-- ============ updated_at automático ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger countries_set_updated_at before update on public.countries
  for each row execute function public.set_updated_at();
create trigger cities_set_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

-- ============ SEGURANÇA (RLS) ============
-- Leitura pública (anon key). Sem políticas de escrita: só a service_role
-- (usada no servidor, em /api/admin) consegue inserir, editar ou apagar.
alter table public.countries enable row level security;
alter table public.cities    enable row level security;

create policy "Leitura pública de países" on public.countries
  for select to anon, authenticated using (true);
create policy "Leitura pública de cidades" on public.cities
  for select to anon, authenticated using (true);

-- ============ DADOS DE EXEMPLO (opcional) ============
insert into public.countries (slug, title, description, cover_image, content) values
  ('portugal', 'Portugal',
   'Guia independente para viajar por Portugal: cidades, transportes e dicas práticas.',
   '/images/portugal.svg',
   E'## Viajar por Portugal\n\nTexto de exemplo sobre Portugal. Substitui este conteúdo pelo teu guia.')
on conflict (slug) do nothing;

insert into public.cities (country_id, slug, title, description, cover_image, content)
select id, 'lisboa', 'Lisboa', 'Guia de Lisboa: bairros, miradouros e transportes.',
       '/images/lisboa.svg', E'## Lisboa\n\nTexto de exemplo sobre Lisboa.'
from public.countries where slug = 'portugal'
on conflict (country_id, slug) do nothing;

insert into public.cities (country_id, slug, title, description, cover_image, content)
select id, 'porto', 'Porto', 'Guia do Porto: Ribeira, caves de vinho e Douro.',
       '/images/porto.svg', E'## Porto\n\nTexto de exemplo sobre o Porto.'
from public.countries where slug = 'portugal'
on conflict (country_id, slug) do nothing;
