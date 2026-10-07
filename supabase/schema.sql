-- =====================================================================
-- Mandarin Learning Dashboard — Supabase schema
-- Jalankan seluruh file ini di Supabase > SQL Editor > New query > Run.
-- Aman dijalankan ulang di project kosong. (Untuk reset: hapus tabel dulu.)
-- Catatan: tabel "users" = auth.users bawaan Supabase.
-- =====================================================================

-- ---------- 1. TABEL ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_target_minutes int not null default 60 check (daily_target_minutes between 0 and 1440),
  reminder_enabled boolean not null default true,
  reminder_time time not null default '20:00',
  current_hsk_level smallint not null default 1 check (current_hsk_level between 1 and 5),
  target_hsk_level smallint not null default 5 check (target_hsk_level between 1 and 5),
  monthly_goal_hours numeric(6,1) check (monthly_goal_hours is null or monthly_goal_hours >= 0),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  language text not null default 'id' check (language in ('id','en')),
  pomodoro_preset text not null default '25/5' check (pomodoro_preset in ('25/5','50/10','60/10')),
  timezone text not null default 'Asia/Makassar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Target per level, bisa diedit per user (lewat halaman HSK Roadmap atau langsung di tabel ini).
create table public.hsk_levels (
  user_id uuid not null references auth.users(id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  title text not null,
  month_number smallint not null,
  vocab_target int not null default 0 check (vocab_target >= 0),
  grammar_target int not null default 0 check (grammar_target >= 0),
  listening_hours_target numeric(6,1) not null default 0 check (listening_hours_target >= 0),
  reading_hours_target numeric(6,1) not null default 0 check (reading_hours_target >= 0),
  speaking_hours_target numeric(6,1) not null default 0 check (speaking_hours_target >= 0),
  writing_hours_target numeric(6,1) not null default 0 check (writing_hours_target >= 0),
  study_hours_target numeric(6,1) not null default 0 check (study_hours_target >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, level)
);

create table public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null check (skill in ('vocabulary','grammar','listening','speaking','reading','writing')),
  target numeric(7,1) not null check (target >= 0),
  unit text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  duration_minutes int not null default 0 check (duration_minutes between 0 and 1440),
  activities text[] not null check (
    cardinality(activities) >= 1
    and activities <@ array['vocabulary','grammar','listening','speaking','reading','writing']::text[]
  ),
  vocab_count int not null default 0 check (vocab_count >= 0),
  grammar_count int not null default 0 check (grammar_count >= 0),
  listening_minutes int not null default 0 check (listening_minutes between 0 and 1440),
  speaking_minutes int not null default 0 check (speaking_minutes between 0 and 1440),
  reading_minutes int not null default 0 check (reading_minutes between 0 and 1440),
  writing_minutes int not null default 0 check (writing_minutes between 0 and 1440),
  notes text,
  source text not null default 'manual' check (source in ('manual','timer')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_sessions_user_date_idx on public.study_sessions (user_id, session_date desc);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chinese text not null check (length(trim(chinese)) > 0),
  pinyin text,
  meaning text not null check (length(trim(meaning)) > 0),
  hsk_level smallint not null default 1 check (hsk_level between 1 and 9),
  category text,
  example text,
  example_translation text,
  -- spaced repetition
  last_reviewed timestamptz,
  next_review timestamptz not null default now(),
  review_count int not null default 0,
  difficulty text check (difficulty in ('again','hard','good','easy')),
  ease_factor numeric(4,2) not null default 2.5,
  interval_days int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index vocabulary_unique_idx on public.vocabulary (user_id, chinese, coalesce(pinyin, ''));
create index vocabulary_due_idx on public.vocabulary (user_id, next_review);
create index vocabulary_level_idx on public.vocabulary (user_id, hsk_level);

create table public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  rating text not null check (rating in ('again','hard','good','easy')),
  interval_days int not null default 0,
  ease_factor numeric(4,2),
  reviewed_at timestamptz not null default now()
);
create index vocabulary_reviews_user_idx on public.vocabulary_reviews (user_id, reviewed_at desc);

create table public.grammar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null check (length(trim(pattern)) > 0),
  hsk_level smallint not null default 1 check (hsk_level between 1 and 9),
  meaning text not null,
  example text,
  pinyin text,
  translation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  material text not null,
  duration_minutes int not null default 0 check (duration_minutes between 0 and 1440),
  hsk_level smallint check (hsk_level between 1 and 9),
  source text,
  score numeric(5,1) check (score between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listening_user_date_idx on public.listening_sessions (user_id, session_date desc);

create table public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  topic text not null,
  duration_minutes int not null default 0 check (duration_minutes between 0 and 1440),
  self_score numeric(3,1) check (self_score between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index speaking_user_date_idx on public.speaking_sessions (user_id, session_date desc);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  material text not null,
  pages int check (pages >= 0),
  words int check (words >= 0),
  duration_minutes int not null default 0 check (duration_minutes between 0 and 1440),
  comprehension_pct numeric(5,1) check (comprehension_pct between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reading_user_date_idx on public.reading_sessions (user_id, session_date desc);

create table public.writing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  topic text not null,
  chinese_text text not null,
  pinyin text,
  translation text,
  word_count int check (word_count >= 0),
  self_score numeric(3,1) check (self_score between 0 and 10),
  duration_minutes int not null default 0 check (duration_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index writing_user_date_idx on public.writing_sessions (user_id, session_date desc);

-- Snapshot review bulanan (disimpan manual dari halaman Monthly Review / Roadmap).
create table public.monthly_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  hsk_level smallint not null check (hsk_level between 1 and 5),
  progress_pct numeric(5,2) not null default 0,
  study_days int not null default 0,
  study_minutes int not null default 0,
  vocab_count int not null default 0,
  grammar_count int not null default 0,
  listening_minutes int not null default 0,
  speaking_minutes int not null default 0,
  reading_minutes int not null default 0,
  writing_minutes int not null default 0,
  performance text check (performance in ('excellent','good','needs_improvement')),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_start)
);

-- Diisi oleh trigger (read-only untuk user).
create table public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_study_date date,
  updated_at timestamptz not null default now()
);

-- Struktur untuk push notification di masa depan (belum dipakai UI).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------- 2. VIEW daily_progress ----------
-- Satu baris per user per hari belajar. Mengagregasi study_sessions + semua tracker.
-- security_invoker = RLS tabel dasar tetap berlaku untuk user yang memanggil.
create view public.daily_progress with (security_invoker = true) as
select user_id, activity_date,
  sum(study_minutes)::int as study_minutes,
  sum(vocab_count)::int as vocab_count,
  sum(grammar_count)::int as grammar_count,
  sum(listening_minutes)::int as listening_minutes,
  sum(speaking_minutes)::int as speaking_minutes,
  sum(reading_minutes)::int as reading_minutes,
  sum(writing_minutes)::int as writing_minutes
from (
  select user_id, session_date as activity_date, duration_minutes as study_minutes, vocab_count, grammar_count,
         listening_minutes, speaking_minutes, reading_minutes, writing_minutes from public.study_sessions
  union all select user_id, session_date, duration_minutes, 0, 0, duration_minutes, 0, 0, 0 from public.listening_sessions
  union all select user_id, session_date, duration_minutes, 0, 0, 0, duration_minutes, 0, 0 from public.speaking_sessions
  union all select user_id, session_date, duration_minutes, 0, 0, 0, 0, duration_minutes, 0 from public.reading_sessions
  union all select user_id, session_date, duration_minutes, 0, 0, 0, 0, 0, duration_minutes from public.writing_sessions
) t
group by user_id, activity_date;

-- ---------- 3. FUNGSI & TRIGGER ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','study_settings','hsk_levels','daily_goals','study_sessions','vocabulary',
    'grammar','listening_sessions','speaking_sessions','reading_sessions','writing_sessions','monthly_progress']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- Hitung ulang streak dari seluruh hari belajar (zona waktu mengikuti study_settings.timezone).
create or replace function public.refresh_streak(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_tz text; v_today date; v_cur int; v_long int; v_last date;
begin
  select timezone into v_tz from study_settings where user_id = p_user;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  with days as (select activity_date d from daily_progress where user_id = p_user),
  grp as (select d, d - (row_number() over (order by d))::int as g from days),
  isl as (select count(*)::int n, max(d) e from grp group by g)
  select coalesce(max(n), 0), coalesce(max(n) filter (where e >= v_today - 1), 0), (select max(d) from days)
    into v_long, v_cur, v_last from isl;
  insert into streaks (user_id, current_streak, longest_streak, last_study_date, updated_at)
  values (p_user, v_cur, v_long, v_last, now())
  on conflict (user_id) do update
    set current_streak = excluded.current_streak, longest_streak = excluded.longest_streak,
        last_study_date = excluded.last_study_date, updated_at = now();
end $$;

create or replace function public.trg_refresh_streak() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_streak(coalesce(new.user_id, old.user_id));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['study_sessions','listening_sessions','speaking_sessions','reading_sessions','writing_sessions']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.trg_refresh_streak()', t || '_streak', t);
  end loop;
end $$;

-- Data awal per user: profil, setting, target harian, target HSK, contoh kosakata & grammar. Idempotent.
create or replace function public.bootstrap_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
    select p_user, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    from auth.users u where u.id = p_user
  on conflict do nothing;
  insert into study_settings (user_id) values (p_user) on conflict do nothing;
  insert into streaks (user_id) values (p_user) on conflict do nothing;

  insert into daily_goals (user_id, skill, target, unit) values
    (p_user, 'vocabulary', 20, 'words'),
    (p_user, 'listening', 30, 'min'),
    (p_user, 'reading', 20, 'min'),
    (p_user, 'speaking', 15, 'min'),
    (p_user, 'writing', 10, 'min'),
    (p_user, 'grammar', 1, 'lesson')
  on conflict do nothing;

  -- Target default: patokan awal (silakan edit di halaman HSK Roadmap).
  insert into hsk_levels (user_id, level, title, month_number, vocab_target, grammar_target,
    listening_hours_target, reading_hours_target, speaking_hours_target, writing_hours_target, study_hours_target) values
    (p_user, 1, 'HSK 3.0 Level 1', 1,  500, 48, 10,  8,  6,  4,  45),
    (p_user, 2, 'HSK 3.0 Level 2', 2,  772, 81, 14, 12,  8,  6,  60),
    (p_user, 3, 'HSK 3.0 Level 3', 3,  973, 81, 18, 16, 10,  8,  80),
    (p_user, 4, 'HSK 3.0 Level 4', 4, 1000, 76, 22, 20, 12, 10, 100),
    (p_user, 5, 'HSK 3.0 Level 5', 5, 1071, 71, 26, 24, 14, 12, 120)
  on conflict do nothing;

  if not exists (select 1 from vocabulary where user_id = p_user) then
    insert into vocabulary (user_id, chinese, pinyin, meaning, hsk_level, category, example, example_translation) values
      (p_user, '你好', 'nǐ hǎo', 'Halo', 1, 'Greeting', '你好，你叫什么名字？', 'Halo, siapa namamu?'),
      (p_user, '谢谢', 'xièxie', 'Terima kasih', 1, 'Greeting', '谢谢你的帮助。', 'Terima kasih atas bantuanmu.'),
      (p_user, '再见', 'zàijiàn', 'Sampai jumpa', 1, 'Greeting', '明天见，再见！', 'Sampai besok, sampai jumpa!'),
      (p_user, '我', 'wǒ', 'Saya', 1, 'Pronoun', '我是学生。', 'Saya seorang pelajar.'),
      (p_user, '你', 'nǐ', 'Kamu', 1, 'Pronoun', '你好吗？', 'Apa kabar?'),
      (p_user, '他', 'tā', 'Dia (laki-laki)', 1, 'Pronoun', '他是我的朋友。', 'Dia adalah temanku.'),
      (p_user, '她', 'tā', 'Dia (perempuan)', 1, 'Pronoun', '她是老师。', 'Dia adalah seorang guru.'),
      (p_user, '是', 'shì', 'Adalah / benar', 1, 'Verb', '我是印度尼西亚人。', 'Saya orang Indonesia.'),
      (p_user, '有', 'yǒu', 'Punya / ada', 1, 'Verb', '我有一本书。', 'Saya punya sebuah buku.'),
      (p_user, '吃', 'chī', 'Makan', 1, 'Verb', '我喜欢吃米饭。', 'Saya suka makan nasi.'),
      (p_user, '喝', 'hē', 'Minum', 1, 'Verb', '我想喝水。', 'Saya mau minum air.'),
      (p_user, '学习', 'xuéxí', 'Belajar', 1, 'Verb', '我每天学习汉语。', 'Saya belajar bahasa Mandarin setiap hari.'),
      (p_user, '工作', 'gōngzuò', 'Bekerja / pekerjaan', 1, 'Verb', '他在公司工作。', 'Dia bekerja di perusahaan.'),
      (p_user, '喜欢', 'xǐhuan', 'Suka', 1, 'Verb', '我喜欢喝茶。', 'Saya suka minum teh.'),
      (p_user, '今天', 'jīntiān', 'Hari ini', 1, 'Time', '今天天气很好。', 'Cuaca hari ini sangat bagus.'),
      (p_user, '明天', 'míngtiān', 'Besok', 1, 'Time', '明天我去工作。', 'Besok saya pergi bekerja.');
  end if;

  if not exists (select 1 from grammar where user_id = p_user) then
    insert into grammar (user_id, pattern, hsk_level, meaning, example, pinyin, translation) values
      (p_user, '了', 1, 'Menunjukkan perubahan keadaan / tindakan yang sudah selesai.', '我吃饭了。', 'Wǒ chīfàn le.', 'Saya sudah makan.'),
      (p_user, '过', 2, 'Menunjukkan pengalaman pernah melakukan sesuatu.', '我去过北京。', 'Wǒ qùguo Běijīng.', 'Saya pernah pergi ke Beijing.'),
      (p_user, '在 + kata kerja', 1, 'Menunjukkan tindakan yang sedang berlangsung.', '我在学习汉语。', 'Wǒ zài xuéxí Hànyǔ.', 'Saya sedang belajar bahasa Mandarin.'),
      (p_user, '吗', 1, 'Partikel di akhir kalimat untuk pertanyaan ya/tidak.', '你喜欢喝茶吗？', 'Nǐ xǐhuan hē chá ma?', 'Apakah kamu suka minum teh?'),
      (p_user, '不 / 没', 1, '不 untuk kebiasaan, niat, atau masa depan; 没(有) untuk menyangkal 有 atau tindakan yang belum terjadi.', '我没有时间。', 'Wǒ méiyǒu shíjiān.', 'Saya tidak punya waktu.'),
      (p_user, '的', 1, 'Penanda kepemilikan atau penghubung kata sifat/keterangan dengan kata benda.', '这是我的书。', 'Zhè shì wǒ de shū.', 'Ini adalah bukuku.');
  end if;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.bootstrap_user(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dipanggil app untuk akun yang dibuat sebelum schema ini dijalankan.
create or replace function public.bootstrap_me() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform public.bootstrap_user(auth.uid());
end $$;

-- Contoh sesi belajar (ditandai is_sample) agar kalender, streak, dan grafik langsung terisi. Bisa dihapus.
create or replace function public.seed_sample_sessions() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_tz text; d date;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select timezone into v_tz from study_settings where user_id = v_uid;
  d := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  delete from study_sessions where user_id = v_uid and is_sample;
  insert into study_sessions (user_id, session_date, duration_minutes, activities, vocab_count, grammar_count,
    listening_minutes, speaking_minutes, reading_minutes, writing_minutes, notes, is_sample) values
    (v_uid, d - 1, 45, array['vocabulary','listening'], 18, 0, 30, 0, 0, 0, 'Contoh: kosakata sapaan + latihan listening', true),
    (v_uid, d - 2, 40, array['grammar','speaking'], 0, 1, 0, 15, 0, 0, 'Contoh: belajar penggunaan 了 dan 过.', true),
    (v_uid, d - 3, 35, array['vocabulary','reading'], 20, 0, 0, 0, 20, 0, 'Contoh: kosakata kata kerja + baca teks pendek', true),
    (v_uid, d - 5, 30, array['vocabulary','writing'], 12, 0, 0, 0, 0, 10, 'Contoh: menulis perkenalan diri', true),
    (v_uid, d - 6, 50, array['listening','speaking','grammar'], 0, 1, 25, 15, 0, 0, 'Contoh: dialog sehari-hari', true);
end $$;

create or replace function public.remove_sample_sessions() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from study_sessions where user_id = auth.uid() and is_sample;
end $$;

-- Fungsi internal tidak boleh dipanggil lewat API.
revoke execute on function public.refresh_streak(uuid) from public, anon, authenticated;
revoke execute on function public.bootstrap_user(uuid) from public, anon, authenticated;
revoke execute on function public.trg_refresh_streak() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bootstrap_me() from public, anon;
revoke execute on function public.seed_sample_sessions() from public, anon;
revoke execute on function public.remove_sample_sessions() from public, anon;
grant execute on function public.bootstrap_me() to authenticated;
grant execute on function public.seed_sample_sessions() to authenticated;
grant execute on function public.remove_sample_sessions() to authenticated;

-- ---------- 4. ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = (select auth.uid()));

alter table public.streaks enable row level security;
create policy streaks_select_own on public.streaks for select to authenticated using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['study_settings','hsk_levels','daily_goals','study_sessions','vocabulary','grammar',
    'listening_sessions','speaking_sessions','reading_sessions','writing_sessions','monthly_progress','push_subscriptions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end $$;

alter table public.vocabulary_reviews enable row level security;
create policy vocab_reviews_select_own on public.vocabulary_reviews for select to authenticated using (user_id = (select auth.uid()));
create policy vocab_reviews_insert_own on public.vocabulary_reviews for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.vocabulary v where v.id = vocabulary_id and v.user_id = (select auth.uid())));
create policy vocab_reviews_delete_own on public.vocabulary_reviews for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.daily_progress to authenticated;

-- ---------- 5. (Opsional) akun yang sudah terdaftar sebelum schema dijalankan ----------
-- Tidak perlu: app memanggil bootstrap_me() otomatis saat pertama login.
