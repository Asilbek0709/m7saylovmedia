// 008-admin.sql: администратор читает профили и меняет роли; последний
// администратор защищён.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { addUser, as, createDb, grantApiRoles, migration, rows } from "./harness.mjs";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const EXPERT = "00000000-0000-0000-0000-0000000000e1";
const NEWCOMER = "00000000-0000-0000-0000-0000000000b1";

describe("008-admin.sql", () => {
  let db;

  before(async () => {
    db = await createDb({ through: "008-admin.sql" });
    await db.exec(migration("008-admin.sql"));
    await addUser(db, ADMIN, "admin@test", "admin");
    await addUser(db, EXPERT, "expert@test", "expert");
    await addUser(db, NEWCOMER, "new@test", "pending", { full_name: "Новый Эксперт" });
    await grantApiRoles(db);
  });

  it("администратор видит все профили, эксперт — только свой", async () => {
    const admin = await as(db, ADMIN, "select count(*)::int as c from public.profiles");
    assert.equal(admin.rows[0].c, 3);
    const expert = await as(db, EXPERT, "select id from public.profiles");
    assert.deepEqual(expert.rows, [{ id: EXPERT }]);
  });

  it("администратор подтверждает заявку", async () => {
    const res = await as(db, ADMIN, `update public.profiles set role = 'expert' where id = '${NEWCOMER}' returning role`);
    assert.equal(res.error, null);
    assert.deepEqual(res.rows, [{ role: "expert" }]);
  });

  it("эксперт не может повысить себя", async () => {
    const res = await as(db, EXPERT, `update public.profiles set role = 'admin' where id = '${EXPERT}' returning id`);
    assert.equal(res.rows.length, 0);
    const [row] = await rows(db, `select role from public.profiles where id = '${EXPERT}'`);
    assert.equal(row.role, "expert");
  });

  it("через панель меняется только роль", async () => {
    const res = await as(db, ADMIN, `update public.profiles set email = 'x@x' where id = '${EXPERT}'`);
    assert.match(res.error ?? "", /только роль/);
  });

  it("последнего администратора разжаловать нельзя", async () => {
    const res = await as(db, ADMIN, `update public.profiles set role = 'expert' where id = '${ADMIN}'`);
    assert.match(res.error ?? "", /последнего администратора/);
  });

  it("при втором администраторе снять роль можно", async () => {
    await as(db, ADMIN, `update public.profiles set role = 'admin' where id = '${EXPERT}'`);
    const res = await as(db, ADMIN, `update public.profiles set role = 'expert' where id = '${ADMIN}' returning role`);
    assert.equal(res.error, null);
    assert.deepEqual(res.rows, [{ role: "expert" }]);
  });

  it("администратор видит автора оценки", async () => {
    await db.exec(`
      insert into public.evaluations
        (outlet_id, period, evaluator_id, legal, quality, speed, multimedia,
         interactivity, engagement, convergence)
      select id, 'Тур А', '${NEWCOMER}', 70, 70, 70, 70, 70, 70, 70
      from public.media_outlets where slug = 'kun-uz'`);
    // EXPERT стал администратором в предыдущей проверке.
    const res = await as(db, EXPERT, `
      select p.full_name from public.evaluations e
      join public.profiles p on p.id = e.evaluator_id
      where e.period = 'Тур А'`);
    assert.deepEqual(res.rows, [{ full_name: "Новый Эксперт" }]);
  });
});
