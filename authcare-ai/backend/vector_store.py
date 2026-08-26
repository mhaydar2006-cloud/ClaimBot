from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import DocumentChunk, SourceDocument

DIM = 384
TOKEN_RE = re.compile(r"[a-z0-9]{2,}")


def hash_embed(text: str, dim: int = DIM) -> list[float]:
    counts: Counter[int] = Counter()
    for token in TOKEN_RE.findall(text.lower()):
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        index = int.from_bytes(digest, "big") % dim
        counts[index] += 1
    vector = [0.0] * dim
    for index, count in counts.items():
        vector[index] = 1.0 + math.log(count)
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(a: Iterable[float], b: Iterable[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _qdrant_client():
    if not settings.qdrant_url:
        return None
    try:
        from qdrant_client import QdrantClient
        return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
    except Exception:
        return None


def reindex_qdrant(db: Session) -> dict[str, int | str]:
    client = _qdrant_client()
    if client is None:
        return {"indexed": 0, "mode": "database-fallback", "message": "QDRANT_URL is not configured or qdrant-client is unavailable."}
    from qdrant_client.models import Distance, PointStruct, VectorParams

    rows = db.execute(select(DocumentChunk, SourceDocument).join(SourceDocument, DocumentChunk.source_id == SourceDocument.id)).all()
    if not client.collection_exists(settings.qdrant_collection):
        client.create_collection(settings.qdrant_collection, vectors_config=VectorParams(size=DIM, distance=Distance.COSINE))
    points = []
    for chunk, source in rows:
        points.append(PointStruct(
            id=chunk.id,
            vector=hash_embed(chunk.text),
            payload={
                "chunk_key": chunk.chunk_key,
                "source_key": source.source_key,
                "organization": source.organization,
                "title": source.title,
                "url": source.url,
                "verification_status": chunk.verification_status,
                "text": chunk.text,
                "request_types": chunk.request_types_json,
                "services": chunk.services_json,
                "insurer_ids": chunk.insurer_ids_json,
            },
        ))
    if points:
        client.upsert(settings.qdrant_collection, points=points, wait=True)
    return {"indexed": len(points), "mode": "qdrant"}


def search_knowledge(db: Session, query: str, limit: int = 6) -> list[dict]:
    client = _qdrant_client()
    if client is not None:
        try:
            response = client.query_points(settings.qdrant_collection, query=hash_embed(query), limit=limit, with_payload=True)
            output = []
            for point in response.points:
                payload = point.payload or {}
                output.append({**payload, "id": str(point.id), "score": float(point.score)})
            return output
        except Exception:
            pass

    rows = db.execute(select(DocumentChunk, SourceDocument).join(SourceDocument, DocumentChunk.source_id == SourceDocument.id)).all()
    query_vector = hash_embed(query)
    scored = []
    for chunk, source in rows:
        score = cosine(query_vector, hash_embed(chunk.text + " " + " ".join(chunk.tags_json or [])))
        if score <= 0:
            continue
        scored.append({
            "id": str(chunk.id),
            "text": chunk.text,
            "source_key": source.source_key,
            "organization": source.organization,
            "title": source.title,
            "url": source.url,
            "verification_status": chunk.verification_status,
            "score": float(score),
        })
    return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]
