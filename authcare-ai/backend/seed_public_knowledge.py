from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import DocumentChunk, SourceDocument

ROOT = Path(__file__).resolve().parents[1]


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def seed_public_knowledge(db: Session) -> dict[str, int]:
    sources = {item["id"]: item for item in json.loads((ROOT / "src/data/sources.json").read_text())}
    knowledge = json.loads((ROOT / "src/data/publicKnowledge.json").read_text())
    for item in knowledge:
        source_meta = sources[item["sourceId"]]
        source = db.scalar(select(SourceDocument).where(SourceDocument.source_key == item["sourceId"]))
        if source is None:
            source = SourceDocument(source_key=item["sourceId"], organization=source_meta["organization"], title=source_meta["title"], url=source_meta.get("url"), section=source_meta.get("section"), accessed=source_meta["accessed"], version=source_meta.get("version"), verification_status=source_meta.get("verificationStatus", "partial"), scope=source_meta["scope"])
            db.add(source)
            db.flush()
        else:
            source.organization = source_meta["organization"]
            source.title = source_meta["title"]
            source.url = source_meta.get("url")
            source.section = source_meta.get("section")
            source.accessed = source_meta["accessed"]
            source.version = source_meta.get("version")
            source.verification_status = source_meta.get("verificationStatus", "partial")
            source.scope = source_meta["scope"]
        source.content_hash = digest(source_meta["scope"])
        chunk = db.scalar(select(DocumentChunk).where(DocumentChunk.source_id == source.id, DocumentChunk.chunk_key == item["id"]))
        if chunk is None:
            chunk = DocumentChunk(source_id=source.id, chunk_key=item["id"], text=item["text"], tags_json=item["tags"], request_types_json=item["requestTypes"], services_json=item["services"], insurer_ids_json=item.get("insurerIds", []), verification_status=item["verification"], content_hash=digest(item["text"]))
            db.add(chunk)
        else:
            chunk.text = item["text"]
            chunk.tags_json = item["tags"]
            chunk.request_types_json = item["requestTypes"]
            chunk.services_json = item["services"]
            chunk.insurer_ids_json = item.get("insurerIds", [])
            chunk.verification_status = item["verification"]
            chunk.content_hash = digest(item["text"])
    db.flush()
    return {"chunks": len(knowledge), "sources": len(set(item["sourceId"] for item in knowledge))}


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        result = seed_public_knowledge(db)
        db.commit()
        print(f"Seeded {result['chunks']} public knowledge chunks into {result['sources']} source documents.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
