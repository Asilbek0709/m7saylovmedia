// 010-tours-evidence-audit.sql: права на издания, туры, обоснования, журнал.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { addUser, as, createDb, grantApiRoles, migration, rows, upsertEvaluation } from "./harness.mjs";

const E1 = "00000000-0000-0000-0000-0000000000e1";
const E2 = "00000000-0000-0000-0000-0000000000e2";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
const DEMO = "Сайлов-2026, 1-босқич";

const evalCount = (db, period) =>
  rows(db, `select count(*)::int as c from public.evaluations where period = '${period}'`).then((r) => r[0].c);

describe("010-tours-evidence-audit.sql", () => {
  let db;

  before(async () => {
    db = await createDb();
    await db.exec(migration("010-tours-evidence-audit.sql")); // повторный запуск
    await addUser(db, E1, "e1@test", "expert");
    await addUser(db, E2, "e2@test", "expert");
    await addUser(db, ADMIN, "admin@test", "admin");
    await grantApiRoles(db);
  });

  describe("туры", () => {
    it("существующие туры перенесены и открыты", async () => {
      const periods = await rows(db, "select name, status from public.monitoring_periods");
      assert.deepEqual(periods, [{ name: DEMO, status: "open" }]);
    });

    it("оценку в несуществующий тур не сохранить (опечатка не создаёт тур)", async () => {
      const res = await as(db, E1, upsertEvaluation(E1, "kun-uz", "Сайлов 2026 1-босқич", Array(7).fill(80)));
      assert.match(res.error ?? "", /evaluations_period_fkey|foreign key/);
    });

    it("туры заводит только администратор", async () => {
      const expert = await as(db, E1, "insert into public.monitoring_periods (name) values ('Тур X')");
      assert.match(expert.error ?? "", /row-level security/);
      const admin = await as(db, ADMIN, "insert into public.monitoring_periods (name, starts_on, ends_on) values ('2-босқич', '2026-12-01', '2026-12-20')");
      assert.equal(admin.error, null);
    });

    it("в открытом туре эксперт сохраняет оценку", async () => {
      const res = await as(db, E1, upsertEvaluation(E1, "kun-uz", "2-босқич", Array(7).fill(80)));
      assert.equal(res.error, null);
    });

    it("в закрытом туре оценку не добавить, не изменить и не удалить", async () => {
      await as(db, ADMIN, "update public.monitoring_periods set status = 'closed' where name = '2-босқич'");
      const add = await as(db, E2, upsertEvaluation(E2, "kun-uz", "2-босқич", Array(7).fill(70)));
      assert.match(add.error ?? "", /закрыт/);
      const edit = await as(db, E1, upsertEvaluation(E1, "kun-uz", "2-босқич", Array(7).fill(90)));
      assert.match(edit.error ?? "", /закрыт/);
      const del = await as(db, E1, "delete from public.evaluations where period = '2-босқич'");
      assert.match(del.error ?? "", /закрыт/);
      assert.equal(await evalCount(db, "2-босқич"), 1);
    });

    it("закрытый тур можно переименовать — оценки переезжают вместе с ним", async () => {
      const res = await as(db, ADMIN, "update public.monitoring_periods set name = 'Сайлов-2026, 2-босқич' where name = '2-босқич'");
      assert.equal(res.error, null);
      assert.equal(await evalCount(db, "Сайлов-2026, 2-босқич"), 1);
      assert.equal(await evalCount(db, "2-босқич"), 0);
    });

    it("тур с оценками нельзя удалить", async () => {
      const res = await as(db, ADMIN, "delete from public.monitoring_periods where name = 'Сайлов-2026, 2-босқич'");
      assert.match(res.error ?? "", /foreign key|violates/);
    });

    it("после открытия тура правка снова возможна", async () => {
      await as(db, ADMIN, "update public.monitoring_periods set status = 'open' where name = 'Сайлов-2026, 2-босқич'");
      const res = await as(db, E1, upsertEvaluation(E1, "kun-uz", "Сайлов-2026, 2-босқич", Array(7).fill(90)));
      assert.equal(res.error, null);
    });

    it("конец тура не раньше начала", async () => {
      await assert.rejects(
        db.exec("insert into public.monitoring_periods (name, starts_on, ends_on) values ('Плохой', '2026-12-10', '2026-12-01')"),
        /check/,
      );
    });
  });

  describe("издания", () => {
    it("эксперт правит издание, slug не меняется", async () => {
      const res = await as(db, E1, "update public.media_outlets set region = 'Самарқанд', ownership = 'davlat' where slug = 'anhor-uz' returning slug, region, ownership");
      assert.equal(res.error, null);
      assert.deepEqual(res.rows, [{ slug: "anhor-uz", region: "Самарқанд", ownership: "davlat" }]);
    });

    it("эксперт не может удалить издание", async () => {
      const res = await as(db, E1, "delete from public.media_outlets where slug = 'anhor-uz' returning id");
      assert.equal(res.rows.length, 0);
    });

    it("издание с оценками не удаляет даже администратор — оценки не пропадут", async () => {
      const res = await as(db, ADMIN, "delete from public.media_outlets where slug = 'kun-uz'");
      assert.match(res.error ?? "", /foreign key|violates/);
    });

    it("администратор удаляет издание без оценок", async () => {
      await db.exec("insert into public.media_outlets (name, slug, ownership, region) values ('Пустое', 'pustoe', 'nodavlat', 'Тошкент')");
      const res = await as(db, ADMIN, "delete from public.media_outlets where slug = 'pustoe' returning id");
      assert.equal(res.error, null);
      assert.equal(res.rows.length, 1);
    });
  });

  describe("обоснования", () => {
    it("сохраняются вместе с оценкой", async () => {
      const res = await as(db, E2, `
        insert into public.evaluations
          (outlet_id, period, evaluator_id, legal, quality, speed, multimedia, interactivity, engagement, convergence, evidence)
        select id, 'Сайлов-2026, 2-босқич', '${E2}', 70, 70, 70, 70, 70, 70, 70,
               '{"legal": "3 материала без маркировки рекламы", "general": "https://example.uz/a"}'
        from public.media_outlets where slug = 'kun-uz'
        returning evidence`);
      assert.equal(res.error, null);
      assert.equal(res.rows[0].evidence.legal, "3 материала без маркировки рекламы");
    });

    it("должны быть объектом", async () => {
      await assert.rejects(
        db.exec(`update public.evaluations set evidence = '"просто строка"' where evaluator_id = '${E2}'`),
        /evaluations_evidence_object/,
      );
    });

    it("чужие обоснования эксперту не видны, аноним не видит вовсе", async () => {
      const other = await as(db, E1, `select evidence from public.evaluations where evaluator_id = '${E2}'`);
      assert.equal(other.rows.length, 0);
      const anon = await as(db, null, "select count(*)::int as c from public.evaluations where evidence is not null");
      assert.equal(anon.rows[0].c, 0);
    });
  });

  describe("журнал", () => {
    it("пишет создание, изменение и удаление с автором", async () => {
      await db.exec("update public.monitoring_periods set status = 'open'");
      await as(db, E1, upsertEvaluation(E1, "gazeta-uz", "Сайлов-2026, 2-босқич", Array(7).fill(60)));
      await as(db, E1, upsertEvaluation(E1, "gazeta-uz", "Сайлов-2026, 2-босқич", Array(7).fill(65)));
      await as(db, E1, `delete from public.evaluations e using public.media_outlets o
        where o.id = e.outlet_id and o.slug = 'gazeta-uz' and e.period = 'Сайлов-2026, 2-босқич'`);
      const log = await rows(db, `
        select a.action, a.actor_id, (a.old_data->>'legal')::int as old_legal, (a.new_data->>'legal')::int as new_legal
        from public.evaluation_audit a join public.media_outlets o on o.id = a.outlet_id
        where o.slug = 'gazeta-uz' order by a.id`);
      assert.deepEqual(log, [
        { action: "insert", actor_id: E1, old_legal: null, new_legal: 60 },
        { action: "update", actor_id: E1, old_legal: 60, new_legal: 65 },
        { action: "delete", actor_id: E1, old_legal: 65, new_legal: null },
      ]);
    });

    it("пересохранение без изменений в журнал не попадает", async () => {
      const before = (await rows(db, "select count(*)::int as c from public.evaluation_audit"))[0].c;
      await as(db, E1, upsertEvaluation(E1, "kun-uz", "Сайлов-2026, 2-босқич", Array(7).fill(90)));
      const after = (await rows(db, "select count(*)::int as c from public.evaluation_audit"))[0].c;
      assert.equal(after, before);
    });

    it("журнал читает только администратор", async () => {
      const expert = await as(db, E1, "select count(*)::int as c from public.evaluation_audit");
      assert.equal(expert.rows[0].c, 0);
      const admin = await as(db, ADMIN, "select count(*)::int as c from public.evaluation_audit");
      assert.ok(admin.rows[0].c > 0);
      const write = await as(db, ADMIN, "insert into public.evaluation_audit (evaluation_id, outlet_id, period, action) values (gen_random_uuid(), gen_random_uuid(), 'x', 'insert')");
      assert.match(write.error ?? "", /permission denied|row-level security/);
    });
  });
});
