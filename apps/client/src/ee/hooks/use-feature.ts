import { useAtom } from "jotai";
import { entitlementAtom } from "@/ee/entitlement/entitlement-atom";

export const useHasFeature = (feature: string): boolean => {
  return true;
};
