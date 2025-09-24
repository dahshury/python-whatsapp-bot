## Backend refactor plan

| # | Task | Checkbox | Current LOC (targeted) | Destination / New Files | Rationale & Notes |
|---|------|----------|------------------------|--------------------------|-------------------|
| 1 | Extract response/validation helpers to shared utils | [ ] | ~60 LOC (format_response, errors) | `app/utils/response_utils.py` and re-export in `app/utils/__init__.py` | Centralize `format_response` and error constants; used across domain services. Avoid duplication. |
| 2 | Move WA ID validation to shared domain module | [ ] | ~40 LOC (`is_valid_number`) | Use existing `app/services/domain/shared/wa_id.py` and add thin wrapper `app/utils/wa_id_utils.py` for backward compatibility | DRY with existing `WaId` model; provide compatibility layer for old imports. |
| 3 | Split conversation DB access into conversation repository/service | [ ] | ~120 LOC (`append_message`, `get_all_conversations`, `retrieve_messages`, `make_thread`) | New: `app/services/domain/conversation/conversation_repository.py`, `conversation_service.py`; update imports | Align with DDD; keep DB access in repositories. Service orchestrates append/retrieve, emits realtime events. |
| 4 | Extract date parsing and normalization utilities | [ ] | ~220 LOC (`parse_unix_timestamp`, `parse_time`, `normalize_time_format`, `parse_date`, `parse_gregorian_date`, `parse_hijri_date`) | New: `app/services/domain/shared/time_parsing.py` (domain), plus re-exports via `app/utils/__init__.py` | Single source for robust parsing. Used by reservation/availability and elsewhere. |
| 5 | Extract vacation-period logic | [ ] | ~200 LOC (`_load_vacations_from_db`, `is_vacation_period`, `find_vacation_end_date`, `format_enhanced_vacation_message`) | New: `app/services/domain/shared/vacation_service.py`; reuse DB models from `app/db.py` | Consolidate vacation handling; avoid duplication with `app/utils/realtime.py` and API `/vacations`. |
| 6 | Extract time-slot generation and filtering | [ ] | ~180 LOC (`get_time_slots`, `filter_past_time_slots`, `find_nearest_time_slot`) | New: `app/services/domain/reservation/time_slot_service.py` | Dedicated service to generate, filter, and format slots; used by `AvailabilityService` and `ReservationService`. |
| 7 | Extract reservation read APIs | [ ] | ~110 LOC (`get_all_reservations`, `get_tomorrow_reservations`) | Leverage existing `app/services/domain/reservation/reservation_repository.py` by adding methods; thin wrappers in `reservation_service.py` | Prevents direct SQL in utils; unify querying. |
| 8 | Centralize schedule/working-hours config | [ ] | ~40 LOC (defaults in `get_time_slots`) | New: `app/services/domain/shared/schedule_config.py` | Single source for weekly schedule and Ramadan overrides; injectable into time-slot service. |
| 9 | Extract validation ruling for date/time scheduling | [ ] | ~90 LOC (`is_valid_date_time`) | Move to `app/services/domain/shared/scheduling_validation.py` (uses parsing + timezone) | Keeps business rules together; reused by reservation flows. |
| 10 | Align realtime broadcasting concerns | [ ] | ~20 LOC (enqueue from `append_message`) | Keep broadcasting inside corresponding domain service methods (conversation/reservation) | SoC: repositories have no side-effects; services emit events. |
| 11 | Create compatibility shims in `app/utils/__init__.py` | [ ] | ~50 LOC (re-export moved functions) | Update `app/utils/__init__.py` to import from new modules | Non-breaking change for existing call sites; enables incremental migration. |
| 12 | Update imports across backend (views, services) | [ ] | Touch points only | Replace `from app.utils.service_utils import ...` with new imports | Mechanical refactor; ensure no circular deps. |
| 13 | Add unit tests for parsing, vacation, time slots | [ ] | New tests | `tests/domain/shared/test_time_parsing.py`, `test_vacation_service.py`; `tests/domain/reservation/test_time_slot_service.py` | Guard regressions; cover edge cases (Windows/Unix time formats, Hijri conversion). |
| 14 | Remove deprecated functions from `service_utils.py` | [ ] | Entire file shrink to minimal or delete | Decompose into focused modules; keep only legacy no-op wrappers if needed | Final cleanup after consumers updated. |
| 15 | Document refactor in code comments (not .md docs) | [ ] | N/A | Docstrings at new modules/classes; brief rationale | Per project rule: no .md docs unless requested. |
| 16 | Verify DDD alignment with existing Reservation/Availability services | [ ] | N/A | Ensure no duplication with `reservation_service.py`, `availability_service.py` | Use existing domain services; merge new services where overlapping. |
| 17 | Migrate conversation to domain layer | [ ] | N/A | Implement `conversation_service` and use in LLM and API endpoints | Bring feature parity: append, retrieve, thread creation, limited history sorting. |
| 18 | Ensure i18n usage for messages | [ ] | N/A | Keep `get_message` calls within services; no hardcoded strings | Respect existing i18n approach. |
| 19 | Lint and type-check updated modules | [ ] | N/A | Run linters; fix issues | Maintain code quality; avoid runtime regressions. |
| 20 | Run end-to-end manual checks (happy paths) | [ ] | N/A | Reserve slot, list reservations, conversation append, vacations | Validate behavior parity and improvements. |

Notes:

- Target total reduction in `app/utils/service_utils.py`: from ~1,200 LOC to ≤50 LOC (shims or removal).
- Maintain backward compatibility via `app/utils/__init__.py` re-exports during transition, then progressively update imports.
- Prefer dependency injection for timezone, schedule, and repositories in new services.
- Reuse `app/services/domain/shared/datetime_service.py` and `wa_id.py` where applicable to avoid duplication.
