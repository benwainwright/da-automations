import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, expect, it } from "bun:test";
import { CsvDataStore } from "./csv-data-store.ts";

interface TestSample {
  id: string;
  note: string;
  count: number | string;
}

describe("CsvDataStore", () => {
  it("save() creates header once and appends escaped rows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-data-store-"));
    const store = new CsvDataStore<TestSample>("samples-", dir);

    await store.save({ id: "1", note: `hello, "world"`, count: 10 });
    await store.save({ id: "2", note: "line1\nline2", count: 20 });

    const date = new Date().toISOString().slice(0, 10);
    const filePath = join(dir, `samples-${date}.csv`);
    const contents = readFileSync(filePath, "utf8");

    expect(contents.match(/^id,note,count$/gm)?.length).toBe(1);
    expect(contents).toContain(`1,"hello, ""world""",10`);
    expect(contents).toContain(`2,"line1\nline2",20`);
  });

  it("getRange() returns rows for each existing date in range", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-data-store-"));
    const store = new CsvDataStore<TestSample>("samples-", dir);

    writeFileSync(join(dir, "samples-2026-01-10.csv"), "id,note,count\na,first,1\n", "utf8");
    writeFileSync(
      join(dir, "samples-2026-01-11.csv"),
      `id,note,count\nb,"has,comma",2\nc,"has ""quotes""",3\n`,
      "utf8",
    );

    const rows = await store.getRange(
      new Date("2026-01-10T00:00:00.000Z"),
      new Date("2026-01-11T23:59:59.999Z"),
    );

    expect(rows).toEqual([
      { id: "a", note: "first", count: "1" },
      { id: "b", note: "has,comma", count: "2" },
      { id: "c", note: `has "quotes"`, count: "3" },
    ]);
  });

  it("getRange() handles quoted newlines and invalid ranges", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-data-store-"));
    const store = new CsvDataStore<TestSample>("samples-", dir);

    writeFileSync(
      join(dir, "samples-2026-01-12.csv"),
      'id,note,count\nx,"multi\nline",4\n',
      "utf8",
    );

    const rows = await store.getRange(
      new Date("2026-01-12T00:00:00.000Z"),
      new Date("2026-01-12T23:59:59.999Z"),
    );
    expect(rows).toEqual([{ id: "x", note: "multi\nline", count: "4" }]);

    const empty = await store.getRange(
      new Date("2026-01-13T00:00:00.000Z"),
      new Date("2026-01-12T00:00:00.000Z"),
    );
    expect(empty).toEqual([]);
  });

  it("queues concurrent save() calls and preserves call order", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-data-store-"));
    const store = new CsvDataStore<TestSample>("samples-", dir);

    await Promise.all([
      store.save({ id: "1", note: "first", count: 1 }),
      store.save({ id: "2", note: "second", count: 2 }),
      store.save({ id: "3", note: "third", count: 3 }),
    ]);
    await store.waitForIdle();

    const date = new Date().toISOString().slice(0, 10);
    const filePath = join(dir, `samples-${date}.csv`);
    const lines = readFileSync(filePath, "utf8").trim().split("\n");
    expect(lines).toEqual(["id,note,count", "1,first,1", "2,second,2", "3,third,3"]);
  });

  it("getRange() uses existing file header even when save() inferred different in-memory order", async () => {
    const dir = mkdtempSync(join(tmpdir(), "csv-data-store-"));
    const store = new CsvDataStore<TestSample>("samples-", dir);
    await store.save({ note: "saved", id: "seed", count: 0 });
    await store.waitForIdle();

    writeFileSync(join(dir, "samples-2026-01-14.csv"), "id,note,count\na,alpha,7\n", "utf8");

    const rows = await store.getRange(
      new Date("2026-01-14T00:00:00.000Z"),
      new Date("2026-01-14T23:59:59.999Z"),
    );
    expect(rows).toEqual([{ id: "a", note: "alpha", count: "7" }]);
  });
});
