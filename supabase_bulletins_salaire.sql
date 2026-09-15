-- A executer une seule fois dans l'editeur SQL de Supabase (Dashboard > SQL Editor),
-- sur le projet Aureo : l'outil de salaire n'a pas de base a lui, il s'appuie sur
-- les comptes et les profils qui existent deja.
--
-- Une ligne = un bulletin = un agent pour un mois donne. L'agent ne peut lire que
-- ses propres lignes ; seul un super_admin importe le classeur et voit tout le
-- monde. Un superviseur ou un coach ne voit rien : une paie n'est pas une donnee
-- d'equipe.

create table if not exists public.bulletins_salaire (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references public.profils (id) on delete cascade,
  annee smallint not null,
  mois smallint not null check (mois between 1 and 12),
  projet text,
  poste text,
  salaire_base numeric(12, 2),
  net_a_payer numeric(12, 2),
  -- L'intitule de la colonne de prime est conserve tel qu'il est ecrit dans le
  -- classeur ("Bonus avril", "Prime Juillet") : il ne designe pas le meme mois
  -- d'une feuille a l'autre, et c'est ce libelle que l'agent reconnait.
  prime_intitule text,
  prime_montant numeric(12, 2),
  prime_coach numeric(12, 2),
  total_mois numeric(12, 2),
  importe_le timestamptz not null default now(),
  importe_par uuid references public.profils (id),
  constraint bulletins_salaire_mois_unique unique (profil_id, annee, mois)
);

-- Le seul acces de l'outil : tous les bulletins d'un agent, du plus recent au
-- plus ancien.
create index if not exists bulletins_salaire_profil_idx
  on public.bulletins_salaire (profil_id, annee desc, mois desc);

alter table public.bulletins_salaire enable row level security;

-- Interroger profils directement depuis une politique buterait sur la RLS de
-- profils ; security definer la traverse. EXECUTE etant accorde a PUBLIC par
-- defaut, n'importe quel appelant peut appeler cette fonction : elle ne lit que
-- son propre role, il n'y a donc rien a en tirer.
create or replace function public.est_super_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.profils
    where id = auth.uid()
      and role = 'super_admin'
      and coalesce(actif, true) = true
  );
$function$;

drop policy if exists "bulletin lisible par son agent" on public.bulletins_salaire;
create policy "bulletin lisible par son agent"
  on public.bulletins_salaire
  for select
  using (profil_id = auth.uid() or public.est_super_admin());

drop policy if exists "bulletin ecrit par le super admin" on public.bulletins_salaire;
create policy "bulletin ecrit par le super admin"
  on public.bulletins_salaire
  for all
  using (public.est_super_admin())
  with check (public.est_super_admin());

-- Pour elargir la lecture aux admins plus tard, remplacer est_super_admin() par
-- une fonction qui accepte role in ('admin', 'super_admin') dans la politique de
-- select uniquement -- l'ecriture, elle, gagne a rester au seul super_admin.
