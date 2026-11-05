// 007-experts.sql: несколько экспертов на тур, закрытые индивидуальные
// оценки, разброс и W Кендалла.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  addUser,
  as,
  createDb,
  grantApiRoles,
  kendallW,
  migration,
  rows,
  upsertEvaluation,
} from "./harness.mjs";

const E1 = "00000000-0000-0000-0000-0000000000e1";
const E2 = "00000000-0000-0000-0000-0000000000e2";
const E3 = "00000000-0000-0000-0000-0000000000e3";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
const PENDING = "00000000-0000-0000-0000-000000000099";

const round = (db, slug, period) =>
  rows(db, `
    select r.* from public.evaluation_rounds r
    join public.media_outlets o on o.id = r.outlet_id
    where o.slug = '${slug}' and r.period = '${period}'`).then((r) => r[0]);

const countRows = (db, slug, period) =>
  rows(db, `
    select count(*)::int as c from public.evaluations e
    join public.media_outlets o on o.id = e.outlet_id
    where o.slug = '${slug}' and e.period = '${period}'`).then((r) => r[0].c);

describe("007-experts.sql", () => {
  let db;
  let dynamicsBefore;

  before(async () => {
    db = await createDb({
      through: "007-experts.sql",
      async before(db) {
        await addUser(db, E1, "e1@test", "expert");
        await addUser(db, E2, "e2@test", "expert");
        await addUser(db, E3, "e3@test", "expert");
        await addUser(db, ADMIN, "admin@test", "admin");
        await addUser(db, PENDING, "pending@test", "pending");
        // До 007 эксперт хранился текстом — email в другом регистре.
        await db.exec(`
          insert into public.evaluations
            (outlet_id, period, evaluator, legal, quality, speed, multimedia,
             interactivity, engagement, convergence)
          select id, 'Старый тур', 'E1@test', 70, 70, 70, 70, 70, 70, 70
          from public.media_outlets where slug = 'anhor-uz'`);
        dynamicsBefore = await rows(db, `
          select slug, period, smsi, prev_smsi from public.media_dynamics
          order by slug, period`);
      },
    });
    await grantApiRoles(db);
  });

  it("повторный запуск не падает", async () => {
    await db.exec(migration("007-experts.sql"));
    // Представления пересоздаются заново. Supabase выдаёт ролям API права
    // на новые объекты сам (default privileges), PGlite — нет.
    await grantApiRoles(db);
  });

  it("email старой оценки сопоставлен с профилем", async () => {
    const [row] = await rows(db, "select evaluator_id from public.evaluations where period = 'Старый тур'");
    assert.equal(row.evaluator_id, E1);
  });

  it("с одним экспертом динамика и рейтинг не изменились", async () => {
    const after = await rows(db, `
      select slug, period, smsi, prev_smsi, experts from public.media_dynamics
      order by slug, period`);
    assert.equal(after.length, dynamicsBefore.length);
    after.forEach((row, i) => {
      const was = dynamicsBefore[i];
      assert.equal(row.slug, was.slug);
      assert.equal(row.period, was.period);
      assert.equal(String(row.smsi), String(was.smsi));
      assert.equal(String(row.prev_smsi), String(was.prev_smsi));
      assert.equal(row.experts, 1);
    });
  });

  describe("два эксперта на одно издание", () => {
    before(async () => {
      const a = await as(db, E1, upsertEvaluation(E1, "kun-uz", "Тур Б", [80, 80, 80, 80, 80, 80, 80]));
      const b = await as(db, E2, upsertEvaluation(E2, "kun-uz", "Тур Б", [90, 71, 80, 80, 80, 80, 80]));
      assert.equal(a.error, null);
      assert.equal(b.error, null);
    });

    it("дают две строки", async () => {
      assert.equal(await countRows(db, "kun-uz", "Тур Б"), 2);
    });

    it("итог тура — среднее по мезонам, SMSI от средних", async () => {
      const r = await round(db, "kun-uz", "Тур Б");
      assert.equal(r.experts, 2);
      assert.equal(Number(r.legal), 85);
      assert.equal(Number(r.quality), 75.5);
      // 85·.18 + 75.5·.18 + 80·.64 = 80.09
      assert.equal(Number(r.smsi), 80.1);
      // Индексы экспертов 80.0 и 80.2
      assert.equal(Number(r.smsi_range), 0.2);
      assert.equal(r.needs_consensus, false);
    });

    it("пересохранение своей оценки обновляет строку", async () => {
      const res = await as(db, E1, upsertEvaluation(E1, "kun-uz", "Тур Б", [82, 80, 80, 80, 80, 80, 80]));
      assert.equal(res.error, null);
      assert.equal(await countRows(db, "kun-uz", "Тур Б"), 2);
    });
  });

  describe("права", () => {
    it("чужую оценку не изменить и не удалить прямым запросом", async () => {
      const upd = await as(db, E2, `update public.evaluations set legal = 1 where evaluator_id = '${E1}' returning id`);
      assert.equal(upd.rows.length, 0);
      const del = await as(db, E2, `delete from public.evaluations where evaluator_id = '${E1}' returning id`);
      assert.equal(del.rows.length, 0);
      const [own] = await rows(db, `select legal from public.evaluations where evaluator_id = '${E1}' and period = 'Тур Б'`);
      assert.equal(own.legal, 82);
    });

    it("нельзя записать оценку от имени другого эксперта", async () => {
      const res = await as(db, E2, upsertEvaluation(E1, "gazeta-uz", "Тур Б", [1, 1, 1, 1, 1, 1, 1]));
      assert.match(res.error ?? "", /row-level security/);
    });

    it("неподтверждённый пользователь не пишет", async () => {
      const res = await as(db, PENDING, upsertEvaluation(PENDING, "kun-uz", "Тур Б", [50, 50, 50, 50, 50, 50, 50]));
      assert.match(res.error ?? "", /row-level security/);
    });

    it("аноним не видит индивидуальных оценок, но видит итоги", async () => {
      const raw = await as(db, null, "select count(*)::int as c from public.evaluations");
      assert.equal(raw.error, null);
      assert.equal(raw.rows[0].c, 0);
      const ranking = await as(db, null, "select count(*)::int as c from public.media_latest_rankings");
      assert.ok(ranking.rows[0].c > 0);
    });

    it("в публичных представлениях нет эксперта и его индикаторов", async () => {
      const leaked = await rows(db, `
        select table_name, column_name from information_schema.columns
        where table_name in ('media_dynamics', 'media_latest_rankings', 'evaluation_rounds', 'media_rankings')
          and column_name in ('evaluator', 'evaluator_id', 'indicators')`);
      assert.deepEqual(leaked, []);
    });

    it("эксперт видит только свои оценки, администратор — все", async () => {
      const own = await as(db, E2, "select distinct evaluator_id from public.evaluations");
      assert.deepEqual(own.rows, [{ evaluator_id: E2 }]);
      const all = await as(db, ADMIN, "select count(distinct coalesce(evaluator_id::text, '-'))::int as c from public.evaluations");
      assert.ok(all.rows[0].c >= 3);
    });

    it("администратор правит записи без эксперта (демо)", async () => {
      const res = await as(db, ADMIN, "update public.evaluations set legal = legal where evaluator_id is null returning id");
      assert.equal(res.error, null);
      assert.equal(res.rows.length, 10);
    });
  });

  it("размах SMSI больше 5 — требует согласования", async () => {
    await as(db, E1, upsertEvaluation(E1, "daryo-uz", "Тур Б", [90, 90, 90, 90, 90, 90, 90]));
    await as(db, E2, upsertEvaluation(E2, "daryo-uz", "Тур Б", [80, 80, 80, 80, 80, 80, 80]));
    const r = await round(db, "daryo-uz", "Тур Б");
    assert.equal(r.needs_consensus, true);
    assert.equal(Number(r.smsi_range), 10);
    // Выборочное σ значений 90 и 80 = 7.07
    assert.equal(Number(r.smsi_sd), 7.1);
    assert.deepEqual(r.criteria_spread.legal, { sd: 7.1, range: 10 });
  });

  it("эксперты одного тура считаются одним набором весов", async () => {
    await db.exec(`
      insert into public.weight_sets
        (id, valid_from, legal, quality, speed, multimedia, interactivity, engagement, convergence)
      values (2, '2027-01-01', 0.30, 0.10, 0.10, 0.10, 0.10, 0.20, 0.10)`);
    await as(db, E1, upsertEvaluation(E1, "uza", "Тур В", [60, 60, 60, 60, 60, 60, 60], "2026-12-31"));
    await as(db, E2, upsertEvaluation(E2, "uza", "Тур В", [70, 70, 70, 70, 70, 70, 70], "2027-01-05"));
    const sets = await rows(db, `
      select distinct weight_set_id from public.evaluations e
      join public.media_outlets o on o.id = e.outlet_id
      where o.slug = 'uza' and e.period = 'Тур В'`);
    assert.deepEqual(sets, [{ weight_set_id: 1 }]);
  });

  describe("W Кендалла", () => {
    // 3 эксперта × 5 изданий, у второго эксперта — связанные ранги.
    const panel = {
      [E1]: { "kun-uz": 90, "gazeta-uz": 80, "daryo-uz": 70, uza: 60, "xabar-uz": 50 },
      [E2]: { "kun-uz": 85, "gazeta-uz": 85, "daryo-uz": 60, uza: 65, "xabar-uz": 40 },
      [E3]: { "kun-uz": 70, "gazeta-uz": 90, "daryo-uz": 80, uza: 50, "xabar-uz": 60 },
    };
    const slugs = ["kun-uz", "gazeta-uz", "daryo-uz", "uza", "xabar-uz"];

    before(async () => {
      for (const [uid, marks] of Object.entries(panel)) {
        for (const [slug, v] of Object.entries(marks)) {
          const res = await as(db, uid, upsertEvaluation(uid, slug, "Тур W", Array(7).fill(v)));
          assert.equal(res.error, null);
        }
      }
      // Издание, которое оценил один эксперт, в W не входит.
      await as(db, E1, upsertEvaluation(E1, "yuz-uz", "Тур W", Array(7).fill(99)));
    });

    it("совпадает с независимым расчётом", async () => {
      // Все баллы мезонов одинаковы, поэтому SMSI эксперта = балл.
      const expected = kendallW(Object.values(panel).map((marks) => slugs.map((s) => marks[s])));
      const [got] = await rows(db, "select * from public.period_agreement where period = 'Тур W'");
      assert.equal(got.experts, 3);
      assert.equal(got.outlets, 5);
      assert.ok(Math.abs(Number(got.kendall_w) - expected) < 0.0005, `${got.kendall_w} vs ${expected}`);
      assert.ok(Math.abs(Number(got.chi2) - 3 * 4 * Number(got.kendall_w)) < 0.02);
      assert.equal(got.df, 4);
    });

    it("с одним экспертом не считается", async () => {
      const [single] = await rows(db, "select * from public.period_agreement where period = 'Сайлов-2026, 1-босқич'");
      assert.equal(single.experts, 1);
      assert.equal(single.kendall_w, null);
    });

    it("эталон: полное согласие даёт 1", () => {
      assert.ok(Math.abs(kendallW([[1, 2, 3], [1, 2, 3]]) - 1) < 1e-9);
    });
  });
});
