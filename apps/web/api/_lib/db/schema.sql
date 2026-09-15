-- ONA-owned catalog + reviews. Run once against Vercel Postgres.
-- Reviews attach to products.id (UUID). BSale ids are the sync key.

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_type text NOT NULL CHECK (catalog_type IN ('lodge', 'guide')),
  bsale_product_id integer NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_type, bsale_product_id)
);

CREATE TABLE IF NOT EXISTS review_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  bsale_document_id integer,
  bsale_variant_id integer,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_invites_product_email_idx
  ON review_invites (product_id, email);

CREATE INDEX IF NOT EXISTS review_invites_document_id_idx
  ON review_invites (bsale_document_id)
  WHERE bsale_document_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id),
  invite_id uuid NOT NULL UNIQUE REFERENCES review_invites (id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  display_name text NOT NULL,
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_product_visible_idx
  ON reviews (product_id, created_at DESC)
  WHERE hidden_at IS NULL;
