from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./claimbot.db")
    jwt_secret: str = os.getenv("CLAIMBOT_JWT_SECRET", "")
    bootstrap_token: str = os.getenv("CLAIMBOT_BOOTSTRAP_TOKEN", "")
    data_key: str = os.getenv("CLAIMBOT_DATA_KEY", "")
    allow_phi: bool = os.getenv("CLAIMBOT_ALLOW_PHI", "false").lower() == "true"
    cors_origins: tuple[str, ...] = tuple(
        origin.strip() for origin in os.getenv("CLAIMBOT_CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()
    )
    qdrant_url: str = os.getenv("QDRANT_URL", "")
    qdrant_api_key: str = os.getenv("QDRANT_API_KEY", "")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "claimbot_public_knowledge")
    token_minutes: int = int(os.getenv("CLAIMBOT_TOKEN_MINUTES", "480"))

    @property
    def production_auth_ready(self) -> bool:
        return len(self.jwt_secret) >= 32 and bool(self.bootstrap_token)


settings = Settings()
