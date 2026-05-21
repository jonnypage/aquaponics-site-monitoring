import { Role } from "~/gql/generated/graphql";

export function allSiteIdSet(sites: readonly { id: string }[]): Set<string> {
  return new Set(sites.map((s) => s.id));
}

export function assignedSiteIdsForSave(
  role: Role,
  sites: readonly { id: string }[],
  selectedSites: Set<string>
): string[] {
  if (role === Role.Admin) {
    return sites.map((s) => s.id);
  }
  return Array.from(selectedSites);
}
