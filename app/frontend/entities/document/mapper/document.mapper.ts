import type { DocumentDomain } from "../core/document.domain";
import type { DocumentDto } from "../infrastructure/dto/document.dto";

export function documentToDto(domain: DocumentDomain): DocumentDto {
  const s = domain.snapshot;
  return { name: s.name ?? null, age: s.age ?? null, document: s.document };
}
