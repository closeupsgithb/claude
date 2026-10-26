-- Histórico del dashboard de Shimano Iberia (Neon). Se conserva siempre: nada se borra.
-- series_daily: una fila por país, red, métrica y día. Se reescribe (upsert) cada día, sin duplicar.
CREATE TABLE IF NOT EXISTS series_daily (
  country text NOT NULL,            -- es | pt | all
  source text NOT NULL,             -- instagram | facebook | youtube | ads
  metric text NOT NULL,             -- followers | reach | interactions | subscribers | views | spend | impressions | clicks
  day date NOT NULL,
  value double precision NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (country, source, metric, day)
);
CREATE INDEX IF NOT EXISTS series_daily_day_idx ON series_daily (day);

-- content_items: piezas de Instagram/Facebook y vídeos de YouTube.
CREATE TABLE IF NOT EXISTS content_items (
  id text PRIMARY KEY,
  source text NOT NULL,             -- instagram | facebook | youtube
  country text NOT NULL,
  published_at timestamptz NOT NULL,
  type text,
  reach integer,
  views integer,
  interactions integer,
  engagement_rate double precision,
  content text,
  url text,
  image text,
  extra jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_items_pub_idx ON content_items (published_at);

CREATE TABLE IF NOT EXISTS ingest_log (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  range_from date,
  range_to date,
  rows_series integer,
  rows_content integer,
  note text
);
