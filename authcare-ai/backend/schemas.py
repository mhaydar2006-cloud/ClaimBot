from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


Role = Literal["admin", "coordinator", "clinician", "admissions", "billing"]


class BootstrapUser(BaseModel):
    bootstrap_token: str
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=10)
    role: Role = "admin"


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=10)
    role: Role = "coordinator"


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ClaimRequestIn(BaseModel):
    external_id: str = Field(min_length=1, max_length=160)
    contains_phi: bool = False
    patient_name: str = ""
    dob: str = ""
    member_id: str = ""
    mrn: str = ""
    insurer_slug: str
    tpa_slug: str
    service_category: str
    request_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    assessment: dict[str, Any] | None = None


class ClaimRequestOut(BaseModel):
    id: int
    external_id: str
    contains_phi: bool
    patient_name: str
    dob: str
    member_id: str
    mrn: str
    insurer_slug: str
    tpa_slug: str
    service_category: str
    request_type: str
    payload: dict[str, Any]
    latest_assessment: dict[str, Any] | None = None


class DenialIn(BaseModel):
    claim_request_id: int | None = None
    contains_phi: bool = False
    denial_text: str
    classification: str
    analysis: dict[str, Any]


class ReconsiderationIn(BaseModel):
    denial_id: int
    basis: str
    package: dict[str, Any]


class KnowledgeSearchOut(BaseModel):
    id: str
    text: str
    source_key: str
    organization: str
    title: str
    url: str | None
    verification_status: str
    score: float
