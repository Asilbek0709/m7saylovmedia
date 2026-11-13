// 009-outlets-seed.sql: стартовый справочник СМИ по регионам.

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createDb, migration, rows } from "./harness.mjs";

describe("009-outlets-seed.sql", () => {
  let db;

  before(async () => {
    db = await createDb();
    // Как на проде: демо очищено, заведено одно своё издание.
    await db.exec(migration("003-clear-demo-data.sql"));
    await db.exec(`
      insert into public.media_outlets (name, slug, website, ownership, region)
      values ('Pressa.uz', 'pressa-uz', 'pressa.uz', 'nodavlat', 'Тошкент')`);
    await db.exec(migration("009-outlets-seed.sql"));
  });

  it("добавляет 62 издания к уже заведённому", async () => {
    const [{ c }] = await rows(db, "select count(*)::int as c from public.media_outlets");
    assert.equal(c, 63);
  });

  it("повторный запуск ничего не дублирует", async () => {
    await db.exec(migration("009-outlets-seed.sql"));
    const [{ c }] = await rows(db, "select count(*)::int as c from public.media_outlets");
    assert.equal(c, 63);
  });

  it("не трогает уже заведённые издания", async () => {
    const [pressa] = await rows(db, "select name, website from public.media_outlets where slug = 'pressa-uz'");
    assert.deepEqual(pressa, { name: "Pressa.uz", website: "pressa.uz" });
  });

  it("покрывает все 14 регионов, столица — как у существующих («Тошкент»)", async () => {
    const regions = await rows(db, "select distinct region from public.media_outlets order by region");
    assert.equal(regions.length, 14);
    assert.ok(regions.some((r) => r.region === "Тошкент"));
    assert.ok(!regions.some((r) => r.region === "Тошкент шаҳри"));
  });

  it("у изданий без сайта website пустой, а не строка", async () => {
    const [{ c }] = await rows(db, "select count(*)::int as c from public.media_outlets where website = ''");
    assert.equal(c, 0);
  });
});
