import { atomWithStorage } from "jotai/utils";
import type { Entitlements } from "./entitlement.types";

const allFeatures = [
  'sso:custom', 'sso:google', 'mfa', 'api:keys', 'comment:resolution',
  'page:permissions', 'ai', 'import:confluence', 'import:docx', 'import:pdf',
  'attachment:indexing', 'security:settings', 'mcp', 'scim',
  'page:verification', 'audit:logs', 'retention', 'sharing:controls',
  'templates', 'comment:viewer', 'export:pdf',
];

export const entitlementAtom = atomWithStorage<Entitlements | null>(
  "entitlements",
  {
    cloud: false,
    tier: "enterprise",
    features: allFeatures,
  },
);
