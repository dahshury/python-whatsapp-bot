clear users documents:
docker exec -i reservation_postgres psql -U postgres -d whatsapp_bot -c "UPDATE customers SET document = NULL;"
