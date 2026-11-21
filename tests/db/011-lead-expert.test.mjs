// 011-lead-expert.sql: главный эксперт управляет турами, но не ролями.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { addUser, as, createDb, grantApiRoles, migration, rows, upsertEvaluation } from "./harness.mjs";

const EXPERT = "00000000-0000-0000-0000-0000000000e1";
const LEAD = "00000000-0000-0000-0000-00000000001d";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";

describe("011-lead-expert.sql", () => {
  let db;

  before(async () => {
    db = await createDb();
    await db.exec(migration("011-lead-expert.sql")); // повторный запуск
    await addUser(db, EXPERT, "e@test", "expert");
    await addUser(db, LEAD, "lead@test", "expert");
    await addUser(db, ADMIN, "admin@test", "admin");
    await grantApiRoles(db);
  });

  it("администратор назначает главного эксперта", async () => {
    const res = await as(db, ADMIN, `update public.profiles set role = 'lead' where id = '${LEAD}' returning role`);
    assert.equal(res.error, null);
    assert.deepEqual(res.rows, [{ role: "lead" }]);
  });

  it("неизвестную роль не записать", async () => {
    await assert.rejects(
      db.exec(`update public.profiles set role = 'boss' where id = '${EXPERT}'`),
      /profiles_role_check/,
    );
  });

  it("эксперт и главный эксперт роли не назначают — ни себе, ни другим", async () => {
    for (const [uid, target] of [[EXPERT, EXPERT], [EXPERT, LEAD], [LEAD, LEAD], [LEAD, EXPERT]]) {
      const res = await as(db, uid, `update public.profiles set role = 'admin' where id = '${target}' returning id`);
      assert.equal(res.rows.length, 0, `${uid} → ${target}`);
    }
    const roles = await rows(db, `select id, role from public.profiles where id in ('${EXPERT}', '${LEAD}') order by role`);
    assert.deepEqual(roles.map((r) => r.role), ["expert", "lead"]);
  });

  it("главный эксперт создаёт, закрывает и переименовывает тур", async () => {
    const create = await as(db, LEAD, "insert into public.monitoring_periods (name) values ('Тур Л')");
    assert.equal(create.error, null);
    const close = await as(db, LEAD, "update public.monitoring_periods set status = 'closed' where name = 'Тур Л' returning status");
    assert.deepEqual(close.rows, [{ status: "closed" }]);
    const rename = await as(db, LEAD, "update public.monitoring_periods set name = 'Тур Л2', status = 'open' where name = 'Тур Л' returning name");
    assert.deepEqual(rename.rows, [{ name: "Тур Л2" }]);
  });

  it("обычный эксперт туры не трогает", async () => {
    const create = await as(db, EXPERT, "insert into public.monitoring_periods (name) values ('Тур Э')");
    assert.match(create.error ?? "", /row-level security/);
    const close = await as(db, EXPERT, "update public.monitoring_periods set status = 'closed' where name = 'Тур Л2' returning name");
    assert.equal(close.rows.length, 0);
  });

  it("главный эксперт оценивает как эксперт, чужие оценки не видит", async () => {
    const own = await as(db, LEAD, upsertEvaluation(LEAD, "kun-uz", "Тур Л2", Array(7).fill(80)));
    assert.equal(own.error, null);
    await as(db, EXPERT, upsertEvaluation(EXPERT, "kun-uz", "Тур Л2", Array(7).fill(60)));
    const seen = await as(db, LEAD, "select evaluator_id from public.evaluations where period = 'Тур Л2'");
    assert.deepEqual(seen.rows.map((r) => r.evaluator_id), [LEAD]);
  });

  it("названия из 009 без русских приписок; правленные вручную не трогает", async () => {
    await db.exec(`
      insert into public.media_outlets (name, slug, ownership, region) values
        ('Jizzax TV (частный)', 'jizzax-tv-2', 'nodavlat', 'Жиззах'),
        ('Navoiy TV — правка эксперта', 'navoiy-tv-2', 'nodavlat', 'Навоий')`);
    await db.exec(migration("011-lead-expert.sql"));
    const names = await rows(db, "select slug, name from public.media_outlets where slug in ('jizzax-tv-2', 'navoiy-tv-2') order by slug");
    assert.deepEqual(names, [
      { slug: "jizzax-tv-2", name: "Jizzax TV (xususiy)" },
      { slug: "navoiy-tv-2", name: "Navoiy TV — правка эксперта" },
    ]);
  });

  it("журнал главному эксперту недоступен", async () => {
    const res = await as(db, LEAD, "select count(*)::int as c from public.evaluation_audit");
    assert.equal(res.rows[0].c, 0);
  });
});
