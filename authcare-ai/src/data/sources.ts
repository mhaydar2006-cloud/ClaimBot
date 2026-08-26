import sourcesRaw from "@/data/sources.json";
import type { SourceRecord } from "@/types/claim";

export const SOURCES = sourcesRaw as SourceRecord[];

export function getSource(sourceId: string) {
  return SOURCES.find((source) => source.id === sourceId);
}
