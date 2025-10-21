# Database Schema
This project uses PostgreSQL with a small set of core tables to drive reservations, messaging, and automation features. All tables are created by SQLAlchemy models in `app/db.py` (plus the authentication model in `app/auth/models.py`). The sections below summarize each table, its columns, and important constraints or indexes.

## users
Authentication records managed by fastapi-users. Columns are inherited from `SQLAlchemyBaseUserTableUUID`.
| Column          | Type      | Constraints/Default       | Notes                                   |
|-----------------|-----------|---------------------------|-----------------------------------------|
| `id`            | UUID      | PK, generated via UUID    | Primary key                             |
| `email`         | Text      | Unique, not null          | Login identifier                        |
| `hashed_password` | Text    | Not null                  | Argon2/Bcrypt hash depending on config |
| `is_active`     | Boolean   | Default `true`            | Soft-disable flag                       |
| `is_superuser`  | Boolean   | Default `false`           | Admin access flag                       |
| `is_verified`   | Boolean   | Default `false`           | Email verification flag                 |
Indexes: implicit unique index on `email`.

## customers
Stores WhatsApp customers and optional profile data.
| Column            | Type      | Constraints/Default              | Notes                                       |
|-------------------|-----------|----------------------------------|---------------------------------------------|
| `wa_id`           | Text      | PK                               | WhatsApp ID (phone identifier)              |
| `customer_name`   | Text      | Nullable                         | Display name                                |
| `age`             | Integer   | Nullable                         | Optional age                                |
| `age_recorded_at` | Date      | Nullable                         | Date age was captured                       |
| `document`        | JSON/JSONB| Nullable                         | Excalidraw/structured notes                 |
Indexes: `idx_customers_wa_id` for rapid lookup by `wa_id`.

## conversation
Stores chat history for analytics and transcript replay.
| Column    | Type    | Constraints/Default | Notes                                      |
|-----------|---------|---------------------|--------------------------------------------|
| `id`      | Serial  | PK                  | Auto-increment primary key                  |
| `wa_id`   | Text    | FK → customers.wa_id| Identifies the customer                     |
| `role`    | Text    | Nullable            | `user`, `assistant`, etc.                   |
| `message` | Text    | Nullable            | Message body                                |
| `date`    | Text    | Nullable            | ISO date string                             |
| `time`    | Text    | Nullable            | 24h time string                             |
Indexes: `idx_conversation_wa_id`, `idx_conversation_wa_id_date_time`.

## reservations
Represents bookings and follow-ups.
| Column        | Type      | Constraints/Default                                   | Notes                                                  |
|---------------|-----------|-------------------------------------------------------|--------------------------------------------------------|
| `id`          | Serial    | PK                                                    | Auto-increment                                         |
| `wa_id`       | Text      | FK → customers.wa_id, not null                        | Linked customer                                        |
| `date`        | Text      | Not null                                              | Stored as `YYYY-MM-DD`                                 |
| `time_slot`   | Text      | Not null                                              | e.g. `09:00`                                           |
| `type`        | Integer   | Not null, constraint `ck_reservations_type`           | `0` = appointment, `1` = follow-up                     |
| `status`      | Text      | Not null, default `active`, constraint `ck_reservations_status` | `active` or `cancelled`                    |
| `cancelled_at`| Timestamp | Nullable                                              | Timestamp of cancellation                              |
| `created_at`  | Timestamp | Default `CURRENT_TIMESTAMP`                           | Insert timestamp                                       |
| `updated_at`  | Timestamp | Default `CURRENT_TIMESTAMP`, auto-updated             | Last modification                                      |
Indexes: `idx_reservations_wa_id`, `idx_reservations_date_time`, `idx_reservations_status`, `idx_reservations_wa_id_status`, `idx_reservations_date_time_status`.

## vacation_periods
Optional business closures used to pause messaging.
| Column         | Type      | Constraints/Default                              | Notes                                            |
|----------------|-----------|--------------------------------------------------|--------------------------------------------------|
| `id`           | Serial    | PK                                               |                                                  |
| `start_date`   | Date      | Not null                                         | Start of closure                                |
| `end_date`     | Date      | Nullable                                         | Null for open-ended                             |
| `duration_days`| Integer   | Nullable, check `duration_days >= 1`             | Convenience field                               |
| `title`        | Text      | Nullable                                         | Description                                      |
| `created_at`   | Timestamp | Default `CURRENT_TIMESTAMP`                      | Insert timestamp                                 |
| `updated_at`   | Timestamp | Default `CURRENT_TIMESTAMP`, auto-updated        | Last modification                                |
Indexes: `idx_vacations_start`, `idx_vacations_end`. Checks: `start_date <= end_date` when both set.

## notification_events
Captures emitted notifications for replay and diagnostics.
| Column     | Type      | Constraints/Default       | Notes                                    |
|------------|-----------|---------------------------|------------------------------------------|
| `id`       | Serial    | PK                        |                                          |
| `event_type` | Text    | Not null, indexed         | e.g., `reservation_created`             |
| `ts_iso`   | Text      | Not null, indexed         | ISO timestamp string                     |
| `data`     | Text      | Not null                  | Raw JSON payload                         |
| `created_at`| Timestamp| Default `CURRENT_TIMESTAMP`| Insert timestamp                         |
Indexes: `idx_notification_events_type_ts`, `idx_notification_events_created_at`.

## inbound_message_queue
Internal queue for deferred WhatsApp processing.
| Column      | Type      | Constraints/Default                                     | Notes                                               |
|-------------|-----------|---------------------------------------------------------|-----------------------------------------------------|
| `id`        | Serial    | PK                                                      |                                                     |
| `message_id`| Text      | Nullable, partial unique index when not null            | WhatsApp message id                                 |
| `wa_id`     | Text      | Nullable, indexed                                       | Customer identifier                                 |
| `payload`   | Text      | Not null                                                | Raw payload for retry                               |
| `status`    | Text      | Not null, default `pending`                             | `pending`, `processing`, `done`, `failed`           |
| `attempts`  | Integer   | Not null, default `0`                                   | Retry counter                                       |
| `created_at`| Timestamp | Default `CURRENT_TIMESTAMP`, indexed                    |                                                     |
| `updated_at`| Timestamp | Default `CURRENT_TIMESTAMP`, auto-updated               |                                                     |
| `locked_at` | Timestamp | Nullable, indexed                                       | When a worker claims the job                        |
Indexes: partial unique index `uq_inbound_message_queue_message_id_not_null` (PostgreSQL), plus `idx_inbound_queue_status_created`.

## Relationships Summary
- `customers` → `reservations` and `conversation` via `wa_id`.
- `inbound_message_queue` optionally references customers through `wa_id`.
- `users` is independent but used for authentication/authorization in the API.
Additional helper tables (full-text search objects) may be created by migrations, but the core schema above is what ships by default.