import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readSnapshot } from "./snapshot.mjs";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function createMcpServer(config) {
  const server = new McpServer({ name: "jbfd-operations", version: "0.1.0" }, {
    instructions: "Consulta de Live e Test da JBFD. Dados são snapshots; verificar stale antes de afirmar estado atual. Não há ferramentas de escrita ou acesso a segredos. Diagnósticos são contagens, não mensagens de logs.",
  });
  const wrap = (operation) => async (input) => {
    try {
      const snapshot = await readSnapshot(config.snapshotPath);
      const data = operation(snapshot, input);
      return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
    } catch {
      return { isError: true, content: [{ type: "text", text: "Snapshot de operação indisponível ou inválido. Verificar o coletor na VPS." }] };
    }
  };
  server.registerTool("jbfd_status", {
    description: "Consulta saúde, versão, commit e estado dos containers JBFD em Live e Test.",
    inputSchema: { environment: z.enum(["test", "live", "all"]).default("all") }, annotations,
  }, wrap((snapshot, input) => ({
    collectedAt: snapshot.collectedAt, ageSeconds: snapshot.ageSeconds, stale: snapshot.stale,
    environments: Object.fromEntries(Object.entries(snapshot.environments)
      .filter(([name]) => input.environment === "all" || input.environment === name)
      .map(([name, value]) => [name, { container: value.container, application: value.application }])),
  })));
  server.registerTool("jbfd_diagnostics", {
    description: "Consulta contagens de erros e avisos nas últimas 200 linhas dos últimos 15 minutos. Não retorna texto bruto dos logs; contagens são heurísticas.",
    inputSchema: { environment: z.enum(["test", "live"]) }, annotations,
  }, wrap((snapshot, input) => ({
    environment: input.environment, collectedAt: snapshot.collectedAt, ageSeconds: snapshot.ageSeconds, stale: snapshot.stale,
    ...snapshot.environments[input.environment].diagnostics,
  })));
  return server;
}
