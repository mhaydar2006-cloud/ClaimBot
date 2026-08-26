from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(40), default="coordinator")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Insurer(Base):
    __tablename__ = "insurers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class TPA(Base):
    __tablename__ = "tpas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    insurer_id: Mapped[int | None] = mapped_column(ForeignKey("insurers.id"), nullable=True)
    tpa_id: Mapped[int | None] = mapped_column(ForeignKey("tpas.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    version: Mapped[str] = mapped_column(String(120), default="unknown")
    effective_from: Mapped[str | None] = mapped_column(String(32), nullable=True)
    effective_to: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class Policy(Base):
    __tablename__ = "policies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    policy_ref: Mapped[str] = mapped_column(String(255), index=True)
    source_mode: Mapped[str] = mapped_column(String(40), default="user_supplied")
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_json: Mapped[dict] = mapped_column(JSON, default=dict)
    version: Mapped[str] = mapped_column(String(120), default="unknown")
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Benefit(Base):
    __tablename__ = "benefits"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("policies.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40))
    annual_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remaining_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    session_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preauthorization_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    nssf_coordination: Mapped[str] = mapped_column(String(40), default="unknown")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class SourceDocument(Base):
    __tablename__ = "source_documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_key: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    organization: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str] = mapped_column(String(500))
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    section: Mapped[str | None] = mapped_column(String(500), nullable=True)
    accessed: Mapped[str] = mapped_column(String(32))
    version: Mapped[str | None] = mapped_column(String(120), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(40), default="partial")
    scope: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="source", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (UniqueConstraint("source_id", "chunk_key", name="uq_source_chunk"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("source_documents.id"), index=True)
    chunk_key: Mapped[str] = mapped_column(String(180))
    text: Mapped[str] = mapped_column(Text)
    tags_json: Mapped[list] = mapped_column(JSON, default=list)
    request_types_json: Mapped[list] = mapped_column(JSON, default=list)
    services_json: Mapped[list] = mapped_column(JSON, default=list)
    insurer_ids_json: Mapped[list] = mapped_column(JSON, default=list)
    verification_status: Mapped[str] = mapped_column(String(40), default="partial")
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    source: Mapped[SourceDocument] = relationship(back_populates="chunks")


class ClaimRequest(Base):
    __tablename__ = "claim_requests"
    __table_args__ = (UniqueConstraint("created_by", "external_id", name="uq_claim_owner_external"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String(160), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    contains_phi: Mapped[bool] = mapped_column(Boolean, default=False)
    patient_name_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    dob_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    member_id_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    mrn_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    insurer_slug: Mapped[str] = mapped_column(String(120))
    tpa_slug: Mapped[str] = mapped_column(String(120))
    service_category: Mapped[str] = mapped_column(String(80))
    request_type: Mapped[str] = mapped_column(String(40))
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Assessment(Base):
    __tablename__ = "assessments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    claim_request_id: Mapped[int] = mapped_column(ForeignKey("claim_requests.id"), index=True)
    engine_version: Mapped[str] = mapped_column(String(80), default="claimbot-v0.4")
    result_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Denial(Base):
    __tablename__ = "denials"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    claim_request_id: Mapped[int | None] = mapped_column(ForeignKey("claim_requests.id"), nullable=True, index=True)
    denial_text_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification: Mapped[str] = mapped_column(String(100))
    analysis_json: Mapped[dict] = mapped_column(JSON)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ReconsiderationPackage(Base):
    __tablename__ = "reconsideration_packages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    denial_id: Mapped[int] = mapped_column(ForeignKey("denials.id"), index=True)
    basis: Mapped[str] = mapped_column(String(40))
    package_json: Mapped[dict] = mapped_column(JSON)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    object_type: Mapped[str] = mapped_column(String(120), index=True)
    object_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
