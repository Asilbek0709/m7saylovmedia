// 006-weight-sets.sql: версии весов и индекс, зафиксированный при сохранении.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { addUser, as, createDb, grantApiRoles, migration, rows } from "./harness.mjs";

const insertRound = (period, scores, date, slug = "kun-uz") => `
  insert into public.evaluations
    (outlet_id, period, legal, quality, speed, multimedia,
     interactivity, engagement, convergence, evaluated_at)
  select id, '${period}', ${scores.join(", ")}, '${date}'
  from public.media_outlets where slug = '${slug}'`;

describe("006-weight-sets.sql", () => {
  let db;
  let beforeMigration;

  before(async () => {
    db = await createDb({
      through: "006-weight-sets.sql",
      async before(db) {
        // Демо-данные из schema.sql плюс более ранний тур — для динамики.
        await db.exec(`update public.evaluations set evaluated_at = '2026-03-01'`);
        await db.exec(insertRound("Тур 0", [50, 60, 70, 80, 90, 55, 65], "2026-02-01"));
        beforeMigration = await rows(db, "select id, smsi from public.evaluations order by id");
      },
    });
  });

  it("повторный запуск не падает", async () => {
    await db.exec(migration("006-weight-sets.sql"));
  });

  it("индексы сохранённых оценок не изменились", async () => {
    const after = await rows(db, "select id, smsi from public.evaluations order by id");
    assert.equal(after.length, beforeMigration.length);
    after.forEach((row, i) => assert.equal(String(row.smsi), String(beforeMigration[i].smsi)));
  });

  it("все прежние оценки — версия 1, она покрывает самую раннюю", async () => {
    const versions = await rows(db, "select distinct weight_set_id from public.evaluations");
    assert.deepEqual(versions, [{ weight_set_id: 1 }]);
    const [v1] = await rows(db, "select valid_from from public.weight_sets where id = 1");
    assert.ok(new Date(v1.valid_from) <= new Date("2026-02-01"));
  });

  it("smsi больше не генерируемая колонка", async () => {
    const [col] = await rows(db, `
      select is_generated from information_schema.columns
      where table_name = 'evaluations' and column_name = 'smsi'`);
    assert.equal(col.is_generated, "NEVER");
  });

  describe("новая версия весов", () => {
    let snapshot;

    before(async () => {
      snapshot = await rows(db, "select id, smsi, weight_set_id from public.evaluations order by id");
      await db.exec(`
        insert into public.weight_sets
          (id, valid_from, legal, quality, speed, multimedia, interactivity, engagement, convergence, note)
        values (2, '2026-06-01', 0.30, 0.10, 0.10, 0.10, 0.10, 0.20, 0.10, 'тест')`);
    });

    it("не трогает прошлые оценки", async () => {
      const after = await rows(db, "select id, smsi, weight_set_id from public.evaluations order by id");
      assert.deepEqual(after, snapshot);
    });

    it("новый тур считается новыми весами", async () => {
      await db.exec(insertRound("Тур 2", [90, 80, 70, 60, 50, 40, 30], "2026-07-01"));
      const [row] = await rows(db, "select smsi, weight_set_id from public.evaluations where period = 'Тур 2'");
      // 90·.3 + 80·.1 + 70·.1 + 60·.1 + 50·.1 + 40·.2 + 30·.1 = 64
      assert.equal(row.weight_set_id, 2);
      assert.equal(Number(row.smsi), 64);
    });

    it("пересохранение прошлого тура остаётся на своей версии", async () => {
      await db.exec(`
        update public.evaluations
        set legal = 60, quality = 60, speed = 60, multimedia = 60,
            interactivity = 60, engagement = 60, convergence = 60
        where period = 'Тур 0'`);
      const [row] = await rows(db, "select smsi, weight_set_id from public.evaluations where period = 'Тур 0'");
      assert.equal(row.weight_set_id, 1);
      assert.equal(Number(row.smsi), 60);
    });

    it("произвольный smsi перезаписывается расчётом", async () => {
      await db.exec("update public.evaluations set smsi = 99.9 where period = 'Тур 0'");
      const [row] = await rows(db, "select smsi from public.evaluations where period = 'Тур 0'");
      assert.equal(Number(row.smsi), 60);
    });
  });

  it("набор весов нельзя изменить или удалить", async () => {
    await assert.rejects(db.exec("update public.weight_sets set legal = 0.2 where id = 1"), /нельзя изменить/);
    await assert.rejects(db.exec("delete from public.weight_sets where id = 1"), /нельзя изменить/);
  });

  it("сумма весов должна быть ровно 1", async () => {
    await assert.rejects(
      db.exec(`
        insert into public.weight_sets
          (id, valid_from, legal, quality, speed, multimedia, interactivity, engagement, convergence)
        values (3, '2027-01-01', 0.5, 0.5, 0.5, 0, 0, 0, 0)`),
      /weight_sets_sum_to_one/,
    );
  });

  it("оценка раньше первого набора отклоняется", async () => {
    await assert.rejects(
      db.exec(insertRound("Древний тур", [1, 1, 1, 1, 1, 1, 1], "2019-01-01", "uza")),
      /Нет набора весов/,
    );
  });

  it("проверка индикаторов из 005 продолжает работать", async () => {
    await assert.rejects(
      db.exec(`
        update public.evaluations
        set indicators = '{"legal":[90,80],"quality":[1],"speed":[1],"multimedia":[1],"interactivity":[1],"engagement":[1],"convergence":[1]}',
            legal = 50
        where period = 'Тур 0'`),
      /evaluations_indicators_consistent/,
    );
  });

  it("представления отдают версию весов", async () => {
    const dynamics = await rows(db, `
      select weight_set_id from public.media_dynamics
      where slug = 'kun-uz' order by evaluated_at`);
    assert.deepEqual(dynamics.map((r) => r.weight_set_id), [1, 1, 2]);
    const [latest] = await rows(db, "select * from public.media_latest_rankings limit 1");
    assert.ok("weight_set_id" in latest);
  });

  it("добавлять наборы может только администратор", async () => {
    const EXPERT = "00000000-0000-0000-0000-000000000001";
    const ADMIN = "00000000-0000-0000-0000-000000000002";
    await addUser(db, EXPERT, "expert@test", "expert");
    await addUser(db, ADMIN, "admin@test", "admin");
    await grantApiRoles(db);
    await db.exec("grant select on public.profiles to authenticated");

    const insert = (id, date) => `
      insert into public.weight_sets
        (id, valid_from, legal, quality, speed, multimedia, interactivity, engagement, convergence)
      values (${id}, '${date}', 0.18, 0.18, 0.14, 0.12, 0.12, 0.14, 0.12)`;

    const expert = await as(db, EXPERT, insert(10, "2028-01-01"));
    assert.match(expert.error ?? "", /row-level security/);
    const admin = await as(db, ADMIN, insert(11, "2029-01-01"));
    assert.equal(admin.error, null);
  });
});
