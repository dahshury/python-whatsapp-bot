"""API router for app configuration management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_session
from app.services.domain.config.config_schemas import (
    AppConfigCreate,
    AppConfigRead,
    AppConfigUpdate,
)
from app.services.domain.config.config_service import (
    create_config,
    get_config,
    update_config,
)

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("", response_model=AppConfigRead)
async def get_app_config(session: Session = Depends(get_session)) -> AppConfigRead:
    """Get current app configuration."""
    try:
        return get_config(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}") from e


@router.put("", response_model=AppConfigRead)
async def update_app_config(
    update_data: AppConfigUpdate, session: Session = Depends(get_session)
) -> AppConfigRead:
    """Update app configuration."""
    try:
        return update_config(update_data, session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}") from e


@router.post("", response_model=AppConfigRead)
async def create_app_config(
    config_data: AppConfigCreate, session: Session = Depends(get_session)
) -> AppConfigRead:
    """Create new app configuration (replaces existing)."""
    try:
        return create_config(config_data, session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create configuration: {str(e)}") from e

