// Обвязка проверок миграций: настоящий Postgres (PGlite, WebAssembly)
// в памяти, без Docker и без доступа к боевой базе.
//
// Supabase-специфику заменяют заглушки: роли anon/authenticated, схема
// auth с таблицей users и функцией auth.uid(), которая читает текущего
// пользователя из настройки test.uid.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const SUPABASE_DIR = fileURLToPath(new URL("../../supabase/", import.meta.url));

/** Порядок выполнения — как в инструкции к проекту. 003 (очистка демо) не входит. */
export const MIGRATIONS = [
  "schema.sql",
  "002-roles.sql",
  "004-dynamics.sql",
  "005-indicators.sql",
  "006-weight-sets.sql",
  "007-experts.sql",
  "008-admin.sql",
];

/** Текст миграции. pgcrypto в PGlite нет, а gen_random_uuid() встроен в Postgres 13+. */
export function migration(file) {
  return readFileSync(SUPABASE_DIR + file, "utf8").replace(
    /create extension[^;]*;/i,
    "",
  );
}

/**
 * Новая база с миграциями до `through` включительно.
 * `before` выполняется перед этой миграцией — чтобы подготовить данные,
 * которые она должна перенести.
 */
export async function createDb({ through, before } = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb
    );
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  `);

  const last = through ? MIGRATIONS.indexOf(through) : MIGRATIONS.length - 1;
  if (last < 0) throw new Error(`Неизвестная миграция: ${through}`);

  for (const file of MIGRATIONS.slice(0, last + 1)) {
    if (file === through && before) await before(db);
    await db.exec(migration(file));
  }
  return db;
}

/** Права, которые Supabase по умолчанию выдаёт ролям API. */
export async function grantApiRoles(db) {
  await db.exec(`
    grant usage on schema public, auth to anon, authenticated;
    grant select on all tables in schema public to anon, authenticated;
    grant insert, update, delete on public.evaluations, public.weight_sets to authenticated;
    grant update on public.profiles to authenticated;
    grant execute on all functions in schema public, auth to anon, authenticated;
  `);
}

/**
 * Запрос от имени пользователя (uid) или анонима (null) — с RLS, как через
 * PostgREST. Ошибка не бросается, а возвращается: проверки отказов — норма.
 */
export async function as(db, uid, sql) {
  await db.exec(
    uid
      ? `set test.uid = '${uid}'; set role authenticated;`
      : `set test.uid = ''; set role anon;`,
  );
  try {
    return { rows: (await db.query(sql)).rows, error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  } finally {
    await db.exec("reset role;");
  }
}

export async function rows(db, sql) {
  return (await db.query(sql)).rows;
}

/** Пользователь с профилем нужной роли (профиль создаёт триггер из 002). */
export async function addUser(db, id, email, role = "pending", meta = {}) {
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, email, meta],
  );
  await db.query("update public.profiles set role = $1 where id = $2", [role, id]);
}

/**
 * Оценка эксперта: все семь мезонов одним списком, upsert по ключу 007 —
 * как это делает калькулятор.
 */
export function upsertEvaluation(uid, slug, period, scores, evaluatedAt) {
  const date = evaluatedAt ? `, '${evaluatedAt}'` : "";
  return `
    insert into public.evaluations
      (outlet_id, period, evaluator_id, legal, quality, speed, multimedia,
       interactivity, engagement, convergence${evaluatedAt ? ", evaluated_at" : ""})
    select id, '${period}', '${uid}', ${scores.join(", ")}${date}
    from public.media_outlets where slug = '${slug}'
    on conflict (outlet_id, period, evaluator_id) do update set
      legal = excluded.legal, quality = excluded.quality, speed = excluded.speed,
      multimedia = excluded.multimedia, interactivity = excluded.interactivity,
      engagement = excluded.engagement, convergence = excluded.convergence
    returning smsi`;
}

/** Независимый расчёт W Кендалла (эксперты × объекты), средние ранги, поправка на связи. */
export function kendallW(matrix) {
  const m = matrix.length;
  const n = matrix[0].length;
  const R = Array(n).fill(0);
  let T = 0;
  for (const row of matrix) {
    const sorted = row.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && sorted[j + 1][0] === sorted[i][0]) j++;
      const rank = (i + j) / 2 + 1;
      const t = j - i + 1;
      for (let k = i; k <= j; k++) R[sorted[k][1]] += rank;
      T += t ** 3 - t;
      i = j + 1;
    }
  }
  const mean = R.reduce((a, b) => a + b) / n;
  const S = R.reduce((a, r) => a + (r - mean) ** 2, 0);
  return (12 * S) / (m * m * (n ** 3 - n) - m * T);
}
