# Mandarin Learning Dashboard ("Mandarin OS")

Dashboard belajar Mandarin pribadi: **1 Bulan = 1 Level HSK 3.0**. Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + RLS), siap deploy ke Vercel. Mobile first, light/dark mode.

## Fitur
Dashboard (streak, target harian, progres HSK, kalender ala GitHub, timer) · Daily Study + Quick Add · Vocabulary (CRUD, search, filter, sort, pagination) + Flashcard spaced repetition · Grammar · Listening / Speaking / Reading / Writing tracker (CRUD + grafik) · Study timer Pomodoro (25/5, 50/10, 60/10) yang otomatis menyimpan sesi · HSK Roadmap (target bisa diedit) · Statistics (bar, donut, line chart) · Monthly Review + rekomendasi otomatis · Achievements · Settings · Reminder di dashboard.

## Struktur folder
```
supabase/schema.sql        # tabel, view, trigger, fungsi, RLS, seed (jalankan di Supabase)
src/middleware.ts          # proteksi route + refresh sesi
src/lib/                   # supabase client, types, srs.ts (algoritma), stats.ts, hooks.ts
src/components/            # UI (ala shadcn), record-form, tracker-page, timer, charts, ...
src/app/(auth)/            # login, register, forgot-password, reset-password
src/app/(app)/             # dashboard, daily-study, vocabulary(+review), grammar, listening,
                           # speaking, reading, writing, roadmap, statistics, monthly-review,
                           # achievements, settings
src/app/auth/callback/     # penukaran kode email (konfirmasi / reset password)
```

## 1. Siapkan Supabase
1. Buat project di https://supabase.com.
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
3. **Project Settings → API**: salin *Project URL* dan *anon/publishable key*.
4. **Authentication → URL Configuration**: isi *Site URL* (`http://localhost:3000` untuk lokal, lalu URL Vercel) dan tambahkan ke *Redirect URLs*: `http://localhost:3000/**` dan `https://NAMA-APP.vercel.app/**`.
5. (Opsional, enak untuk pemakaian pribadi) **Authentication → Providers → Email**: matikan *Confirm email* agar register langsung masuk. Kalau dibiarkan aktif, kamu harus klik link konfirmasi di email.

## 2. Jalankan lokal
```bash
npm install
cp .env.example .env.local     # isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                    # http://localhost:3000
```
Register akun → otomatis dibuatkan profil, setting, target harian, target HSK 1–5, 16 kosakata HSK 1, dan 6 grammar. Di **Settings → Sample data** kamu bisa memuat 5 sesi belajar contoh (bisa dihapus).

## 3. Deploy ke Vercel
1. Push folder ini ke GitHub.
2. Vercel → **Add New → Project** → pilih repo (framework terdeteksi Next.js).
3. **Environment Variables**: tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy, lalu masukkan URL Vercel ke Supabase *Site URL / Redirect URLs* (langkah 1.4).
5. Di HP: buka URL → menu browser → *Add to Home Screen*.

Tidak ada credential yang di-hardcode. Anon key memang boleh ada di browser karena semua tabel dilindungi RLS. Jangan pernah memakai `service_role` key di project ini.

## Desain data singkat
| Kebutuhan | Implementasi |
|---|---|
| `users` | `auth.users` bawaan Supabase |
| `profiles`, `study_settings`, `streaks` | 1 baris per user |
| `study_sessions` + `listening/speaking/reading/writing_sessions` | log aktivitas, semua ber-`user_id` + RLS |
| `daily_progress` | **VIEW** (bukan tabel) yang menjumlah semua log per hari — selalu sinkron |
| `daily_goals` | target harian per skill (editable di Settings) |
| `hsk_levels` | target per level per user (editable di HSK Roadmap) |
| `vocabulary`, `vocabulary_reviews` | kosakata + jadwal SRS (`last_reviewed`, `next_review`, `review_count`, `difficulty`, `ease_factor`, `interval_days`) |
| `monthly_progress` | snapshot bulanan (tombol di Monthly Review / "Mark level completed") |
| `push_subscriptions` | disiapkan untuk push notification nanti (belum dipakai UI) |

`streaks` dihitung ulang oleh trigger database setiap sesi ditambah/diubah/dihapus (zona waktu dari `study_settings.timezone`, default `Asia/Makassar`).

## Aturan perhitungan
- **Study Day**: hari yang punya minimal satu sesi (Quick Add mewajibkan ≥1 aktivitas dicentang) atau entri tracker.
- **Waktu belajar** = durasi `study_sessions` + durasi entri tracker (listening/speaking/reading/writing).
- **Vocabulary Learned** = jumlah "new words" yang kamu catat di sesi belajar (bukan jumlah baris tabel `vocabulary`).
- **Progres level/bulan** = rata-rata 7 komponen (vocab, grammar, listening, reading, speaking, writing, jam belajar), masing-masing dibatasi 100% terhadap target level aktif, dihitung dari data bulan kalender berjalan.
- **Performance**: Excellent / Good / Needs Improvement dibanding kecepatan ideal bulan berjalan.
- **SRS** (`src/lib/srs.ts`): Again = ulang 10 menit; Hard = ×1.2; Good = 1 hari lalu ×ease; Easy = 3 hari lalu ×ease×1.3.

## Batasan yang perlu diketahui
- Target HSK default (kosakata 500/772/973/1000/1071, grammar, jam) adalah **patokan awal**, bukan salinan resmi silabus. Cocokkan dengan sumber resmi lalu edit di halaman HSK Roadmap.
- Setting *Language* tersimpan, tetapi teks antarmuka belum diterjemahkan penuh.
- Reminder hanya tampil di dashboard (sesuai versi pertama); tabel `push_subscriptions` sudah siap untuk dikembangkan.
- Achievements dihitung langsung dari data, tidak disimpan sebagai tabel.
- Komponen UI ditulis tangan bergaya shadcn/ui (tanpa CLI), jadi bisa diganti dengan komponen shadcn asli kapan saja.
- `next.config.mjs` memakai `ignoreBuildErrors` agar build tidak terblok; jalankan `npm run typecheck` untuk melihat peringatan tipe.

## Troubleshooting
- *"relation ... does not exist"* → `schema.sql` belum dijalankan.
- Login berhasil tapi data kosong / error RLS → pastikan `schema.sql` dijalankan penuh tanpa error; app memanggil `bootstrap_me()` otomatis untuk akun lama.
- Link email mengarah ke localhost → perbaiki *Site URL* di Supabase.
