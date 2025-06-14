#!/bin/bash
set -e

# Wait for PostgreSQL
until nc -z walkscape-gear-postgres 5432; do
  echo "Waiting for PostgreSQL at walkscape-gear-postgres:5432..."
  sleep 1
done

echo "PostgreSQL is up — starting backend"
exec npm run serve
