import { existsSync, readFileSync } from "fs";
import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { ISampleStore } from "../i-sample-store.ts";

export class CsvDataStore<TSample extends object> implements ISampleStore<TSample> {
  private writeChain = Promise.resolve();

  private columns: (keyof TSample)[] | undefined;

  public constructor(
    private readonly filenamePrefix: string,
    private readonly dir: string,
  ) {}

  public async getRange(from: Date, to: Date): Promise<TSample[]> {
    if (from > to) {
      return [];
    }

    const startDate = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    const endDate = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    const output: TSample[] = [];

    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const filePath = this.getDailyFilePath(cursor);
      if (!existsSync(filePath)) {
        continue;
      }
      const contents = readFileSync(filePath, "utf8");
      const rows = this.parseCsvRows(contents);
      if (rows.length <= 1) {
        continue;
      }
      const [headerRow] = rows;
      const activeColumns = headerRow as (keyof TSample)[];
      if (activeColumns.length === 0) {
        continue;
      }

      for (const row of rows.slice(1)) {
        if (row.length === 1 && row[0] === "") {
          continue;
        }
        const sample = {} as Record<keyof TSample, unknown>;
        activeColumns.forEach((column, index) => {
          sample[column] = row[index] ?? "";
        });
        output.push(sample as TSample);
      }
    }

    return output;
  }

  private csvEscape(value: unknown) {
    const stringValue = String(value ?? "");
    if (stringValue.includes(",") || stringValue.includes(`"`) || stringValue.includes("\n")) {
      return `"${stringValue.replaceAll(`"`, `""`)}"`;
    }
    return stringValue;
  }

  public async save(sample: TSample): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      if (!this.columns) {
        this.columns = Object.keys(sample) as (keyof TSample)[];
      }
      const now = new Date();
      const filePath = this.getDailyFilePath(now);
      await this.ensureHeader(filePath);
      const row = this.columns.map((column) => this.csvEscape(sample[column] ?? "")).join(",");
      await appendFile(filePath, `${row}\n`, "utf8");
    });
    return this.writeChain;
  }

  public async waitForIdle(): Promise<void> {
    await this.writeChain;
  }

  private getDailyFilePath(now = new Date()) {
    const date = now.toISOString().slice(0, 10);
    return join(this.dir, `${this.filenamePrefix}${date}.csv`);
  }

  private async ensureHeader(filePath: string) {
    if (existsSync(filePath) || !this.columns) {
      return;
    }
    await mkdir(this.dir, { recursive: true });
    await appendFile(filePath, `${this.columns.join(",")}\n`, "utf8");
  }

  private parseCsvRows(contents: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < contents.length; index += 1) {
      const character = contents[index];

      if (character === `"` && inQuotes && contents[index + 1] === `"`) {
        cell += `"`;
        index += 1;
        continue;
      }

      if (character === `"`) {
        inQuotes = !inQuotes;
        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && contents[index + 1] === "\n") {
          index += 1;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += character;
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    return rows;
  }
}
