from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Insurer, TPA

INSURERS = [
    ("sna", "SNA", {"default_tpa": "nextcare", "mapping_status": "verified"}),
    ("fidelity", "Fidelity Insurance", {"allowed_tpas": ["nextcare", "mednet"], "mapping_status": "verified"}),
    ("libano-suisse", "Libano-Suisse", {"default_tpa": "globemed", "mapping_status": "verified"}),
    ("medgulf", "MEDGULF", {"default_tpa": "medivisa", "mapping_status": "verified"}),
    ("lia-assurex", "LIA Assurex", {"default_tpa": "internal", "mapping_status": "verified"}),
    ("other", "Other / Not Listed", {"mapping_status": "manual"}),
]

TPAS = [
    ("nextcare", "Nextcare", {"public_rule_coverage": "strong"}),
    ("medivisa", "MediVisa", {"public_rule_coverage": "strong"}),
    ("globemed", "GlobeMed Lebanon", {"public_rule_coverage": "partial"}),
    ("mednet", "MedNet Liban", {"public_rule_coverage": "partial"}),
    ("internal", "Internal insurer administration", {"public_rule_coverage": "unavailable"}),
    ("unknown", "Unknown / To Verify", {"public_rule_coverage": "unavailable"}),
]


def seed_reference_data(db: Session) -> dict[str, int]:
    for slug, name, metadata in INSURERS:
        row = db.scalar(select(Insurer).where(Insurer.slug == slug))
        if row is None:
            db.add(Insurer(slug=slug, name=name, metadata_json=metadata))
        else:
            row.name = name
            row.metadata_json = metadata

    for slug, name, metadata in TPAS:
        row = db.scalar(select(TPA).where(TPA.slug == slug))
        if row is None:
            db.add(TPA(slug=slug, name=name, metadata_json=metadata))
        else:
            row.name = name
            row.metadata_json = metadata

    db.flush()
    return {"insurers": len(INSURERS), "tpas": len(TPAS)}


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        result = seed_reference_data(db)
        db.commit()
        print(f"Seeded {result['insurers']} insurers and {result['tpas']} TPAs.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
