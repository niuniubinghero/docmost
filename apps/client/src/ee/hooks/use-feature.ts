import { useAtomValue } from "jotai";
import { entitlementAtom } from "@/ee/entitlement/entitlement-atom";

export const useHasFeature = (feature: string): boolean => {
  const entitlement = useAtomValue(entitlementAtom);

  // Community edition: if no entitlement data, all features are enabled
  if (!entitlement) return true;

  return entitlement.features.includes(feature);
};
