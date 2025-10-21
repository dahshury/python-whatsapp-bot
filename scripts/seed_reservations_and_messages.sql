-- Dynamic seed script: clears key tables and populates demo data covering the next 2 months.
-- Usage: psql -h localhost -U postgres -d whatsapp_bot -f scripts/seed_reservations_and_messages.sql

DO $$
DECLARE
    start_date          date := current_date;
    end_date            date := (current_date + interval '2 months')::date;
    customer_names      text[] := ARRAY[
        'Ala Baganne',
        'Mariam Al-Farsi',
        'Khaled Al-Harithy',
        'Layla Hassan',
        'Omar Al-Mutairi',
        'Noura Al-Salem',
        'Hassan Karim',
        'Fatima Al-Hassan',
        'Yousef Al-Jaberi',
        'Salma Al-Mahdi'
    ];
    slot_options        text[] := ARRAY[
        '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
        '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
        '16:00','16:30','17:00','17:30'
    ];
    status_pool         text[] := ARRAY['active','active','active','active','cancelled'];
    wa_ids              text[];
    day                 date;
    events_per_day      integer;
    slot                text;
    slot_choice         integer;
    selected_slots      text[];
    chosen_wa_id        text;
    reservation_type    integer;
    reservation_status  text;
    reservation_id      integer;
    conversation_chance numeric;
    convo_ts            timestamp;
    creation_ts         timestamp;
    cancel_ts           timestamp;
    msg_user            text;
    msg_assistant       text;
    total_reservations  integer := 0;
    total_threads       integer := 0;
BEGIN
    -- Wipe existing demo data (and related dependent records).
    TRUNCATE TABLE
        conversation,
        reservations,
        inbound_message_queue,
        notification_events,
        vacation_periods,
        customers
    RESTART IDENTITY CASCADE;

    -- Seed customers with deterministic WA IDs.
    FOR event_idx IN array_lower(customer_names, 1)..array_upper(customer_names, 1) LOOP
        INSERT INTO customers (wa_id, customer_name, age, age_recorded_at)
        VALUES (
            '971555' || to_char(400000 + event_idx, 'FM000000'),
            customer_names[event_idx],
            23 + ((event_idx * 3) % 18),
            start_date - (event_idx * 30)
        );
    END LOOP;

    SELECT array_agg(wa_id ORDER BY wa_id) INTO wa_ids FROM customers;

    -- Generate reservations for each day in the window.
    FOR day IN
        SELECT gs::date FROM generate_series(start_date, end_date, interval '1 day') AS gs
    LOOP
        events_per_day := CASE
            WHEN ((day - start_date) % 9 = 0) THEN 6 + floor(random() * 3)::int  -- busy promotional days
            WHEN random() < 0.35 THEN 0                                         -- occasional quiet days
            ELSE 1 + floor(random() * 4)::int                                   -- typical traffic
        END CASE;

        IF events_per_day = 0 THEN
            CONTINUE;
        END IF;

        selected_slots := ARRAY[]::text[];

        FOR event_idx IN 1..events_per_day LOOP
            chosen_wa_id := wa_ids[1 + floor(random() * array_length(wa_ids, 1))::int];

            slot := NULL;
            -- ensure unique time slots per day
            FOR i IN 1..array_length(slot_options, 1) LOOP
                slot_choice := 1 + floor(random() * array_length(slot_options, 1))::int;
                IF NOT (slot_options[slot_choice] = ANY(selected_slots)) THEN
                    slot := slot_options[slot_choice];
                    EXIT;
                END IF;
            END LOOP;

            IF slot IS NULL THEN
                CONTINUE; -- ran out of slots for the day
            END IF;

            selected_slots := array_append(selected_slots, slot);

            reservation_type := CASE WHEN random() < 0.3 THEN 1 ELSE 0 END;
            reservation_status := status_pool[1 + floor(random() * array_length(status_pool, 1))::int];

            creation_ts := day::timestamp - interval '1 day'
                - (floor(random() * 3)::int * interval '1 hour')
                - (floor(random() * 55)::int * interval '1 minute');
            cancel_ts := NULL;
            IF reservation_status = 'cancelled' THEN
                cancel_ts := creation_ts
                    + ((2 + floor(random() * 4)::int) * interval '1 hour')
                    + (floor(random() * 50)::int * interval '1 minute');
            END IF;

            INSERT INTO reservations (
                wa_id,
                date,
                time_slot,
                type,
                status,
                cancelled_at,
                created_at,
                updated_at
            )
            VALUES (
                chosen_wa_id,
                to_char(day, 'YYYY-MM-DD'),
                slot,
                reservation_type,
                reservation_status,
                cancel_ts,
                creation_ts,
                creation_ts + interval '10 minutes'
            )
            RETURNING id INTO reservation_id;

            total_reservations := total_reservations + 1;

            conversation_chance := CASE
                WHEN reservation_status = 'cancelled' THEN 0.95
                ELSE 0.82
            END;

            IF random() <= conversation_chance THEN
                convo_ts := day::timestamp - interval '1 day'
                    - (floor(random() * 2)::int * interval '1 hour')
                    - (floor(random() * 45)::int * interval '1 minute');

                msg_user := format(
                    'Hi, can I book a %s on %s at %s?',
                    CASE WHEN reservation_type = 0 THEN 'visit' ELSE 'follow-up' END,
                    to_char(day, 'FMDay, FMDD Mon'),
                    slot
                );
                msg_assistant := format(
                    'All set — your %s is scheduled for %s at %s.',
                    CASE WHEN reservation_type = 0 THEN 'appointment' ELSE 'follow-up' END,
                    to_char(day, 'FMDay, FMDD Mon'),
                    slot
                );

                INSERT INTO conversation (wa_id, role, message, date, time)
                VALUES
                    (
                        chosen_wa_id,
                        'user',
                        msg_user,
                        to_char(convo_ts::date, 'YYYY-MM-DD'),
                        to_char(convo_ts, 'HH24:MI')
                    ),
                    (
                        chosen_wa_id,
                        'assistant',
                        msg_assistant,
                        to_char(convo_ts::date, 'YYYY-MM-DD'),
                        to_char(convo_ts + interval '5 minutes', 'HH24:MI')
                    );

                IF reservation_status = 'cancelled' THEN
                    INSERT INTO conversation (wa_id, role, message, date, time)
                    VALUES
                        (
                            chosen_wa_id,
                            'user',
                            format(
                                'Something came up — please cancel the %s slot on %s.',
                                slot,
                                to_char(day, 'FMDD Mon YYYY')
                            ),
                            to_char(convo_ts::date, 'YYYY-MM-DD'),
                            to_char(convo_ts + interval '12 minutes', 'HH24:MI')
                        ),
                        (
                            chosen_wa_id,
                            'assistant',
                            format(
                                'No problem. The %s slot on %s is cancelled for you.',
                                slot,
                                to_char(day, 'FMDD Mon')
                            ),
                            to_char(convo_ts::date, 'YYYY-MM-DD'),
                            to_char(convo_ts + interval '17 minutes', 'HH24:MI')
                        );
                END IF;

                total_threads := total_threads + 1;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Seeded % reservations with % conversation threads across % days.',
        total_reservations,
        total_threads,
        (end_date - start_date + 1);
END $$;

-- To run inside Docker container:
-- cat scripts/seed_reservations_and_messages.sql | docker exec -i reservation_postgres psql -U postgres -d whatsapp_bot
