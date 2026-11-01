import type postgres from "postgres";

/** Idempotent DDL bootstrap (demo). Safe to run concurrently from several services. */
export async function migrate(sql: postgres.Sql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(6060606)`;
    await tx`CREATE TABLE IF NOT EXISTS judge_submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      caller_id text NOT NULL,
      idempotency_key text NOT NULL,
      request_hash text NOT NULL,
      client_submission_id uuid NOT NULL UNIQUE,
      attempt_id uuid NOT NULL,
      assessment_item_id uuid NOT NULL,
      revision integer NOT NULL,
      language text NOT NULL,
      status text NOT NULL DEFAULT 'queued',
      limits jsonb NOT NULL,
      trace_id text NOT NULL,
      attempt_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      started_at timestamptz,
      finished_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (caller_id, idempotency_key)
    )`;
    await tx`CREATE TABLE IF NOT EXISTS judge_payload_snapshots (
      submission_id uuid PRIMARY KEY REFERENCES judge_submissions(id),
      source_code text NOT NULL,
      judge_package jsonb NOT NULL,
      source_hash text NOT NULL
    )`;
    await tx`CREATE TABLE IF NOT EXISTS judge_results (
      submission_id uuid PRIMARY KEY REFERENCES judge_submissions(id),
      execution_status text NOT NULL,
      verdict text,
      summary jsonb,
      metrics jsonb,
      diagnostics jsonb,
      failure_code text,
      failure_retryable boolean,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await tx`CREATE TABLE IF NOT EXISTS judge_outbox (
      id bigserial PRIMARY KEY,
      submission_id uuid NOT NULL REFERENCES judge_submissions(id),
      kind text NOT NULL,
      state text NOT NULL DEFAULT 'pending',
      payload jsonb NOT NULL,
      event_id uuid,
      attempts integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      last_error text,
      created_at timestamptz NOT NULL DEFAULT now(),
      delivered_at timestamptz
    )`;
    await tx`CREATE INDEX IF NOT EXISTS judge_outbox_due_idx ON judge_outbox (kind, state, next_attempt_at)`;
    await tx`CREATE TABLE IF NOT EXISTS judge_events (
      id bigserial PRIMARY KEY,
      submission_id uuid NOT NULL REFERENCES judge_submissions(id),
      type text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  });
}
