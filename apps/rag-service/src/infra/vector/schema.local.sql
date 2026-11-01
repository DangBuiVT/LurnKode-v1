CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA m4_rag;

CREATE TABLE m4_rag.rag_sources (
  material_id uuid PRIMARY KEY,
  course_id uuid,
  active_version text,
  generation bigint NOT NULL CHECK (generation > 0),
  status text NOT NULL CHECK (status IN ('indexed', 'inactive')),
  embedding_model text,
  embedding_dimension integer,
  embedding_format text,
  CHECK (
    (status = 'inactive' AND active_version IS NULL) OR
    (status = 'indexed' AND active_version IS NOT NULL AND course_id IS NOT NULL
      AND embedding_model IS NOT NULL AND embedding_dimension = 768 AND embedding_format IS NOT NULL)
  )
);
CREATE INDEX source_course_status ON m4_rag.rag_sources(course_id, status);

CREATE TABLE m4_rag.rag_chunks (
  id text PRIMARY KEY,
  material_id uuid NOT NULL REFERENCES m4_rag.rag_sources(material_id) ON DELETE RESTRICT,
  course_id uuid NOT NULL,
  chapter_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  version_key text NOT NULL,
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  heading_path text NOT NULL,
  start_offset bigint NOT NULL,
  end_offset bigint NOT NULL,
  location jsonb,
  file_name text,
  material_title text NOT NULL,
  embedding vector(768) NOT NULL CHECK (vector_norm(embedding) > 0),
  embedding_model text NOT NULL,
  embedding_format text NOT NULL,
  CONSTRAINT chunk_version_ordinal UNIQUE (material_id, version_key, ordinal),
  CHECK (start_offset >= 0 AND end_offset > start_offset)
);
CREATE INDEX chunk_course_source_version ON m4_rag.rag_chunks(course_id, material_id, version_key);

CREATE FUNCTION m4_rag.reject_chunk_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical RAG chunks are immutable';
END;
$$;
CREATE TRIGGER immutable_chunks BEFORE UPDATE OR DELETE ON m4_rag.rag_chunks
FOR EACH ROW EXECUTE FUNCTION m4_rag.reject_chunk_mutation();

ALTER TABLE m4_rag.rag_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE m4_rag.rag_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA m4_rag FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA m4_rag FROM PUBLIC;
