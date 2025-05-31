
-- command: sqlite3 threads_db.sqlite < migrate_db.sql
-- Migration script from old schema to new schema
BEGIN TRANSACTION;

-- Step 1: Create new customers table
CREATE TABLE IF NOT EXISTS customers_new (
    wa_id TEXT PRIMARY KEY,
    customer_name TEXT
);

-- Step 2: Populate customers table from threads table and get customer names from reservations
INSERT OR IGNORE INTO customers_new (wa_id, customer_name)
SELECT DISTINCT t.wa_id, r.customer_name
FROM threads t
LEFT JOIN reservations r ON t.wa_id = r.wa_id;

-- Handle any customers who only have cancelled reservations
INSERT OR IGNORE INTO customers_new (wa_id, customer_name)
SELECT DISTINCT cr.wa_id, cr.customer_name
FROM cancelled_reservations cr
WHERE cr.wa_id NOT IN (SELECT wa_id FROM customers_new);

-- Step 3: Create new reservations table with soft deletion support
CREATE TABLE IF NOT EXISTS reservations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wa_id TEXT,
    date TEXT,
    time_slot TEXT,
    type INTEGER CHECK(type IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wa_id) REFERENCES customers_new(wa_id)
);

-- Step 4: Migrate active reservations
INSERT INTO reservations_new (wa_id, date, time_slot, type, status, created_at, updated_at)
SELECT wa_id, date, time_slot, type, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM reservations;

-- Step 5: Migrate cancelled reservations
INSERT INTO reservations_new (wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at)
SELECT wa_id, date, time_slot, type, 'cancelled', cancelled_at, cancelled_at, cancelled_at
FROM cancelled_reservations;

-- Step 6: Drop old tables
DROP TABLE IF EXISTS threads;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS cancelled_reservations;

-- Step 7: Rename new tables
ALTER TABLE customers_new RENAME TO customers;
ALTER TABLE reservations_new RENAME TO reservations;

-- Step 8: Create new indexes
CREATE INDEX IF NOT EXISTS idx_customers_wa_id ON customers(wa_id);
CREATE INDEX IF NOT EXISTS idx_reservations_wa_id ON reservations(wa_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(date, time_slot);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_wa_id_status ON reservations(wa_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time_status ON reservations(date, time_slot, status);
CREATE INDEX IF NOT EXISTS idx_conversation_wa_id ON conversation(wa_id);
CREATE INDEX IF NOT EXISTS idx_conversation_wa_id_date_time ON conversation(wa_id, date, time);

-- Step 9: Drop old indexes (they should be automatically dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_cancelled_reservations_wa_id;
DROP INDEX IF EXISTS idx_cancelled_reservations_date_time;

COMMIT;

-- Verify migration
.headers on
.mode table
SELECT 'customers' as table_name, COUNT(*) as row_count FROM customers
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'active_reservations', COUNT(*) FROM reservations WHERE status = 'active'
UNION ALL
SELECT 'cancelled_reservations', COUNT(*) FROM reservations WHERE status = 'cancelled'
UNION ALL
SELECT 'conversation', COUNT(*) FROM conversation; 