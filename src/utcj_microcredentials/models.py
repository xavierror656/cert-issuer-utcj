from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, EmailStr, Field, HttpUrl


class RecipientPayload(BaseModel):
    given_name: str = Field(min_length=1, max_length=120)
    family_name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class CredentialPayload(BaseModel):
    title: str = Field(min_length=5, max_length=240)
    description: str = Field(min_length=10, max_length=1200)
    issue_date: date
    course_name: str = Field(min_length=3, max_length=240)
    hours: int = Field(ge=1, le=5000)
    skills: list[str] = Field(min_length=1, max_length=12)
    grade: str = Field(min_length=1, max_length=120)
    evidence_url: HttpUrl | None = None


class IssuerPayload(BaseModel):
    name: str | None = None
    id: str | None = None


class IssueRequest(BaseModel):
    recipient: RecipientPayload
    credential: CredentialPayload
    issuer: IssuerPayload | None = None
    chain: str | None = None


class IssueResponse(BaseModel):
    status: str
    id: str
    chain: str
    transaction_id: str
    certificate_url: str
    visual_svg_url: str
    pdf_url: str
    issuer_profile_url: str
    issued_json: dict[str, Any]


class User(BaseModel):
    username: str
    role: str
