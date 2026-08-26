from __future__ import annotations

import hashlib
import logging
import secrets
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine, get_db
from .models import Assessment, AuditEvent, ClaimRequest, Denial, Insurer, ReconsiderationPackage, SourceDocument, TPA, User
from .schemas import BootstrapUser, ClaimRequestIn, ClaimRequestOut, DenialIn, KnowledgeSearchOut, LoginRequest, ReconsiderationIn, TokenOut, UserCreate, UserOut
from .security import data_protection_status, decode_token, decrypt_text, encrypt_text, hash_password, issue_token, verify_password
from .seed_public_knowledge import seed_public_knowledge
from .seed_reference_data import seed_reference_data
from .vector_store import reindex_qdrant, search_knowledge

logger = logging.getLogger("claimbot.backend")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_reference_data(db)
        seed_public_knowledge(db)
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="ClaimBot Backend", version="0.5.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def request_metadata(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or secrets.token_urlsafe(10)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


def audit(db: Session, user_id: int | None, action: str, object_type: str, object_id: str | None = None, request_id: str | None = None, metadata: dict | None = None):
    db.add(AuditEvent(user_id=user_id, action=action, object_type=object_type, object_id=object_id, request_id=request_id, metadata_json=metadata or {}))


def current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    try:
        payload = decode_token(authorization.split(" ", 1)[1])
        user = db.get(User, int(payload["sub"]))
    except Exception:
        user = None
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session.")
    return user


def require_role(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role permission.")
        return user
    return dependency


@app.get("/health")
def health(db: Session = Depends(get_db)):
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    source_count = db.scalar(select(func.count()).select_from(SourceDocument)) or 0
    return {
        "status": "ok",
        "database": "sqlite" if settings.database_url.startswith("sqlite") else "external",
        "bootstrap_required": user_count == 0,
        "security": data_protection_status(),
        "qdrant_configured": bool(settings.qdrant_url),
        "public_source_documents": source_count,
    }


@app.get("/reference/insurers")
def reference_insurers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Insurer).order_by(Insurer.name)).all()
    return [{"slug": row.slug, "name": row.name, "metadata": row.metadata_json} for row in rows]


@app.get("/reference/tpas")
def reference_tpas(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(TPA).order_by(TPA.name)).all()
    return [{"slug": row.slug, "name": row.name, "metadata": row.metadata_json} for row in rows]


@app.post("/auth/bootstrap", response_model=TokenOut)
def bootstrap(payload: BootstrapUser, db: Session = Depends(get_db)):
    if len(settings.jwt_secret) < 32:
        raise HTTPException(status_code=503, detail="Backend authentication secret is not configured.")
    if not settings.bootstrap_token or not secrets.compare_digest(payload.bootstrap_token, settings.bootstrap_token):
        raise HTTPException(status_code=403, detail="Bootstrap is not enabled or token is invalid.")
    if (db.scalar(select(func.count()).select_from(User)) or 0) > 0:
        raise HTTPException(status_code=409, detail="A user already exists; bootstrap is disabled after first account creation.")
    user = User(email=payload.email.strip().lower(), password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.flush()
    audit(db, user.id, "bootstrap_user", "user", str(user.id))
    db.commit()
    return TokenOut(access_token=issue_token(user.id, user.email, user.role), user=UserOut(id=user.id, email=user.email, role=user.role))


@app.post("/auth/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    if len(settings.jwt_secret) < 32:
        raise HTTPException(status_code=503, detail="Backend authentication secret is not configured.")
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    audit(db, user.id, "login", "session")
    db.commit()
    return TokenOut(access_token=issue_token(user.id, user.email, user.role), user=UserOut(id=user.id, email=user.email, role=user.role))


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut(id=user.id, email=user.email, role=user.role)


@app.get("/users", response_model=list[UserOut])
def list_users(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(User).order_by(User.email)).all()
    return [UserOut(id=row.id, email=row.email, role=row.role) for row in rows]


@app.post("/users", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, request: Request, user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    row = User(email=email, password_hash=hash_password(payload.password), role=payload.role)
    db.add(row)
    db.flush()
    audit(db, user.id, "create_user", "user", str(row.id), request.headers.get("x-request-id"), {"role": row.role})
    db.commit()
    return UserOut(id=row.id, email=row.email, role=row.role)


def _ensure_phi_allowed(payload: ClaimRequestIn | DenialIn):
    if payload.contains_phi and (not settings.allow_phi or not settings.data_key):
        raise HTTPException(
            status_code=400,
            detail="PHI storage is disabled. Configure CLAIMBOT_ALLOW_PHI=true and CLAIMBOT_DATA_KEY only after privacy/security review.",
        )


def _claim_out(db: Session, row: ClaimRequest) -> ClaimRequestOut:
    latest = db.scalar(select(Assessment).where(Assessment.claim_request_id == row.id).order_by(desc(Assessment.created_at)).limit(1))
    return ClaimRequestOut(
        id=row.id,
        external_id=row.external_id,
        contains_phi=row.contains_phi,
        patient_name=decrypt_text(row.patient_name_enc) if row.contains_phi else (row.patient_name_enc or ""),
        dob=decrypt_text(row.dob_enc) if row.contains_phi else (row.dob_enc or ""),
        member_id=decrypt_text(row.member_id_enc) if row.contains_phi else (row.member_id_enc or ""),
        mrn=decrypt_text(row.mrn_enc) if row.contains_phi else (row.mrn_enc or ""),
        insurer_slug=row.insurer_slug,
        tpa_slug=row.tpa_slug,
        service_category=row.service_category,
        request_type=row.request_type,
        payload=row.payload_json,
        latest_assessment=latest.result_json if latest else None,
    )


@app.get("/requests", response_model=list[ClaimRequestOut])
def list_requests(limit: int = Query(25, ge=1, le=100), user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(ClaimRequest).where(ClaimRequest.created_by == user.id).order_by(desc(ClaimRequest.updated_at)).limit(limit)).all()
    return [_claim_out(db, row) for row in rows]


@app.post("/requests", response_model=ClaimRequestOut)
def save_request(payload: ClaimRequestIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _ensure_phi_allowed(payload)
    row = db.scalar(select(ClaimRequest).where(ClaimRequest.external_id == payload.external_id, ClaimRequest.created_by == user.id))
    protect = encrypt_text if payload.contains_phi else (lambda value: value)
    if row is None:
        row = ClaimRequest(external_id=payload.external_id, created_by=user.id)
        db.add(row)
    row.contains_phi = payload.contains_phi
    row.patient_name_enc = protect(payload.patient_name)
    row.dob_enc = protect(payload.dob)
    row.member_id_enc = protect(payload.member_id)
    row.mrn_enc = protect(payload.mrn)
    row.insurer_slug = payload.insurer_slug
    row.tpa_slug = payload.tpa_slug
    row.service_category = payload.service_category
    row.request_type = payload.request_type
    # Payload must be de-identified by the caller when contains_phi=False.
    row.payload_json = payload.payload
    db.flush()
    if payload.assessment is not None:
        db.add(Assessment(claim_request_id=row.id, result_json=payload.assessment))
    audit(db, user.id, "save_request", "claim_request", str(row.id), request.headers.get("x-request-id"), {"contains_phi": payload.contains_phi})
    db.commit()
    db.refresh(row)
    return _claim_out(db, row)


@app.delete("/requests")
def clear_requests(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ids = list(db.scalars(select(ClaimRequest.id).where(ClaimRequest.created_by == user.id)).all())
    if ids:
        denial_ids = list(db.scalars(select(Denial.id).where(Denial.claim_request_id.in_(ids), Denial.created_by == user.id)).all())
        if denial_ids:
            db.execute(delete(ReconsiderationPackage).where(
                ReconsiderationPackage.denial_id.in_(denial_ids),
                ReconsiderationPackage.created_by == user.id,
            ))
            db.execute(delete(Denial).where(Denial.id.in_(denial_ids), Denial.created_by == user.id))
        db.execute(delete(Assessment).where(Assessment.claim_request_id.in_(ids)))
        db.execute(delete(ClaimRequest).where(ClaimRequest.id.in_(ids), ClaimRequest.created_by == user.id))
    audit(db, user.id, "clear_requests", "claim_request", request_id=request.headers.get("x-request-id"), metadata={"count": len(ids)})
    db.commit()
    return {"deleted": len(ids)}


@app.post("/denials")
def save_denial(payload: DenialIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _ensure_phi_allowed(payload)
    if payload.claim_request_id is not None:
        claim = db.get(ClaimRequest, payload.claim_request_id)
        if claim is None or claim.created_by != user.id:
            raise HTTPException(status_code=404, detail="Claim request not found.")
    text = encrypt_text(payload.denial_text) if payload.contains_phi else payload.denial_text
    row = Denial(claim_request_id=payload.claim_request_id, denial_text_enc=text, classification=payload.classification, analysis_json=payload.analysis, created_by=user.id)
    db.add(row)
    db.flush()
    audit(db, user.id, "save_denial", "denial", str(row.id), request.headers.get("x-request-id"))
    db.commit()
    return {"id": row.id, "classification": row.classification}


@app.post("/reconsiderations")
def save_reconsideration(payload: ReconsiderationIn, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    denial = db.get(Denial, payload.denial_id)
    if denial is None or denial.created_by != user.id:
        raise HTTPException(status_code=404, detail="Denial not found.")
    row = ReconsiderationPackage(denial_id=payload.denial_id, basis=payload.basis, package_json=payload.package, created_by=user.id)
    db.add(row)
    db.flush()
    audit(db, user.id, "save_reconsideration", "reconsideration", str(row.id), request.headers.get("x-request-id"))
    db.commit()
    return {"id": row.id, "basis": row.basis}


@app.get("/knowledge/search", response_model=list[KnowledgeSearchOut])
def knowledge_search(q: str = Query(min_length=2), limit: int = Query(6, ge=1, le=20), user: User = Depends(current_user), db: Session = Depends(get_db)):
    return search_knowledge(db, q, limit)


@app.post("/knowledge/reindex")
def knowledge_reindex(user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    result = reindex_qdrant(db)
    audit(db, user.id, "knowledge_reindex", "document_chunk", metadata=result)
    db.commit()
    return result


@app.get("/audit")
def get_audit(limit: int = Query(100, ge=1, le=500), user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditEvent).order_by(desc(AuditEvent.created_at)).limit(limit)).all()
    return [{
        "id": row.id,
        "user_id": row.user_id,
        "action": row.action,
        "object_type": row.object_type,
        "object_id": row.object_id,
        "request_id": row.request_id,
        "metadata": row.metadata_json,
        "created_at": row.created_at.isoformat(),
    } for row in rows]
