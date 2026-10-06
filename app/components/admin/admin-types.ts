import type { getAdminContext } from "./admin-data";
export type AwaitedAdminContext = NonNullable<Awaited<ReturnType<typeof getAdminContext>>>;
