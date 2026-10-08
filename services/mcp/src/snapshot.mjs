import { readFile, stat } from "node:fs/promises";
import { z } from "zod";

const counts = z.object({
  error: z.number().int().min(0).max(200), warning: z.number().int().min(0).max(200), other: z.number().int().min(0).max(200),
});
const environment = z.object({
  container: z.object({
    state: z.enum(["running", "exited", "restarting", "created", "paused", "dead", "removing", "unknown"]),
    health: z.enum(["healthy", "unhealthy", "starting", "none", "unknown"]),
    restarts: z.number().int().min(0).max(1000000),
  }),
  application: z.object({
    reachable: z.boolean(), version: z.string().regex(/^[0-9A-Za-z._-]{1,40}$/).nullable(), commit: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
  }),
  diagnostics: z.object({
    available: z.boolean(), windowMinutes: z.literal(15), examinedLines: z.number().int().min(0).max(200), truncated: z.boolean(), counts,
  }),
});
const schema = z.object({
  schemaVersion: z.literal(1), collectedAt: z.iso.datetime(), environments: z.object({ test: environment, live: environment }),
});

export async function readSnapshot(path) {
  if ((await stat(path)).size > 16384) throw new Error("Snapshot fora do limite.");
  const snapshot = schema.parse(JSON.parse(await readFile(path, "utf8")));
  const ageSeconds = Math.floor((Date.now() - Date.parse(snapshot.collectedAt)) / 1000);
  if (ageSeconds < -5) throw new Error("Relógio do snapshot inválido.");
  return { ...snapshot, ageSeconds: Math.max(0, ageSeconds), stale: ageSeconds > 180 };
}
