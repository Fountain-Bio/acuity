import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

describe("CLI help", () => {
  test("advertises the appointment types command at the top level", () => {
    const result = spawnSync(process.execPath, ["run", "src/cli.ts", "--help"], {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("acuity appointment-types list");
    expect(result.stdout).toContain("List appointment types on the account");
  });
});
