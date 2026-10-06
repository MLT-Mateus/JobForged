import { mockHomeByOrganization, mockOrganization, mockUser } from "./mocks";
import type { HomeData, HomeUser, Organization } from "./types";

export type HomeContext = { organization: Organization; user: HomeUser; data: HomeData | null };

export async function getHomeContext(organizationId: string): Promise<HomeContext> {
  return {
    organization: mockOrganization,
    user: mockUser,
    data: mockHomeByOrganization[organizationId] ?? null,
  };
}

export const activeOrganizationId = mockOrganization.id;
