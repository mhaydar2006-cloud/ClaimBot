import commonRulesRaw from "@/rules/common.json";
import globemedRulesRaw from "@/rules/globemed.json";
import internalRulesRaw from "@/rules/internal.json";
import medivisaRulesRaw from "@/rules/medivisa.json";
import mednetRulesRaw from "@/rules/mednet.json";
import nextcareRulesRaw from "@/rules/nextcare.json";
import type { RuleSet, TpaId } from "@/types/claim";

export const COMMON_RULES = commonRulesRaw as RuleSet;

export const RULE_SETS: Record<TpaId, RuleSet> = {
  nextcare: nextcareRulesRaw as RuleSet,
  globemed: globemedRulesRaw as RuleSet,
  mednet: mednetRulesRaw as RuleSet,
  medivisa: medivisaRulesRaw as RuleSet,
  internal: internalRulesRaw as RuleSet,
  unknown: {
    ...internalRulesRaw,
    organizationId: "unknown",
    organizationName: "Unknown Administrator",
  } as RuleSet,
};

export function getRuleSet(tpaId: TpaId) {
  return RULE_SETS[tpaId];
}
