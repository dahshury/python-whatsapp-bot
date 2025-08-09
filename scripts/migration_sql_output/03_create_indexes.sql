
-- Create indexes for better performance

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Reservations indexes  
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_sender ON conversations(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_recipient ON conversations(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);

-- Vector similarity search index (HNSW for faster vector operations)
CREATE INDEX IF NOT EXISTS idx_conversations_embedding ON conversations USING hnsw (content_embedding vector_cosine_ops);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_history_entity ON history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp);


-- Sample vector search queries (for testing after import)

-- Find similar conversations (replace [0.1,0.2,0.3...] with actual embedding vector)
-- SELECT sender_id, content, 1 - (content_embedding <=> '[0.1,0.2,0.3]') as similarity_score
-- FROM conversations
-- WHERE content IS NOT NULL
-- ORDER BY content_embedding <=> '[0.1,0.2,0.3]'
-- LIMIT 5;

-- Count conversations by sender type
-- SELECT sender_type, COUNT(*) FROM conversations GROUP BY sender_type;

-- Find customer conversation history
-- SELECT c.name, conv.content, conv.timestamp 
-- FROM customers c
-- JOIN conversations conv ON (conv.sender_id = c.id AND conv.sender_type = 'user')
-- WHERE c.phone_number = 'PHONE_NUMBER_HERE'
-- ORDER BY conv.timestamp;
