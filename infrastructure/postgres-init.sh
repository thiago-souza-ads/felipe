#!/bin/bash
set -e

# Create multiple databases
for DB in felipe_auth felipe_users felipe_docs; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE $DB;
    GRANT ALL PRIVILEGES ON DATABASE $DB TO "$POSTGRES_USER";
EOSQL

  # Enable pgvector extension in each DB
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
done

echo "Databases and extensions created."
