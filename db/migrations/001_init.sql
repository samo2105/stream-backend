-- 001_init.sql: Stream Activity Backend Initial Migration

-- 1. Stream Sessions Table
CREATE TABLE IF NOT EXISTS stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    peak_viewers INT NOT NULL DEFAULT 0,
    average_viewers INT NOT NULL DEFAULT 0,
    total_events INT NOT NULL DEFAULT 0,
    active_platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'live'
);

CREATE INDEX IF NOT EXISTS idx_stream_sessions_status ON stream_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_started_at ON stream_sessions(started_at DESC);

-- 2. Stream Events Table (Unified Normalized Event Log)
CREATE TABLE IF NOT EXISTS stream_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES stream_sessions(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(100),
    actor_name VARCHAR(100) NOT NULL,
    message TEXT,
    amount NUMERIC(10, 2),
    currency VARCHAR(10),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_events_platform_type ON stream_events(platform, event_type);
CREATE INDEX IF NOT EXISTS idx_stream_events_created_at ON stream_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_events_session_id ON stream_events(session_id);
CREATE INDEX IF NOT EXISTS idx_stream_events_metadata_gin ON stream_events USING GIN (metadata);

-- 3. Viewer Snapshots Table (Nullable for unlinked/unconfigured platforms)
CREATE TABLE IF NOT EXISTS viewer_snapshots (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES stream_sessions(id) ON DELETE SET NULL,
    twitch_viewers INT,
    kick_viewers INT,
    youtube_viewers INT,
    tiktok_viewers INT,
    facebook_viewers INT,
    total_viewers INT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewer_snapshots_recorded_at ON viewer_snapshots(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_viewer_snapshots_session_id ON viewer_snapshots(session_id);
