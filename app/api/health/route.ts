export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    environment: process.env.APP_ENV ?? "sites",
    version: "0.00",
    commit: process.env.APP_COMMIT ?? null,
  });
}
