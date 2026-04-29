#!/usr/bin/env bash
# One-shot: apply 008_paper_embeddings.sql to linked production Supabase.
# Idempotent (CREATE TABLE / INDEX IF NOT EXISTS).
set -euo pipefail
cd "$(dirname "$0")/.."
exec supabase db query --linked --file supabase/migrations/008_paper_embeddings.sql
