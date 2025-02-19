-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE profiles IS 'Holds additional user metadata extending Supabase Auth';

-- Create channels table
CREATE TABLE channels (
  id text PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  subscriber_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE channels IS 'Stores channel information for YouTube and podcast channels';

-- Create rss_feeds table
CREATE TYPE feed_type AS ENUM ('youtube', 'podcast');

CREATE TABLE rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_url text UNIQUE NOT NULL,
  feed_type feed_type NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE rss_feeds IS 'Stores RSS feed details for channels and podcasts';

-- Create content table
CREATE TABLE content (
  id text PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type IN ('video', 'podcast')),
  unique_identifier text UNIQUE NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  transcript text NOT NULL,
  published_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  source_id text REFERENCES channels(id)
);

COMMENT ON TABLE content IS 'Unified table storing videos and podcast episodes';

-- Create summaries table
CREATE TABLE summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text REFERENCES content(id) ON DELETE CASCADE,
  summary text NOT NULL,
  summary_type text NOT NULL CHECK (summary_type IN ('short', 'detailed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE summaries IS 'AI-generated summaries for content items with different types';

-- Create subscriptions table
CREATE TYPE subscription_type AS ENUM ('channel', 'feed');

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_type subscription_type NOT NULL,
  subscription_id text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, subscription_type, subscription_id)
);

COMMENT ON TABLE subscriptions IS 'Tracks user subscriptions to channels or RSS feeds';

-- Create tags table
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

COMMENT ON TABLE tags IS 'Stores content tags';

-- Create content_tags table
CREATE TABLE content_tags (
  content_id text REFERENCES content(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

COMMENT ON TABLE content_tags IS 'Associates tags with content items';

-- Create user_votes table
CREATE TABLE user_votes (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id text REFERENCES channels(id) ON DELETE CASCADE,
  vote_type integer CHECK (vote_type IN (-1, 1)),
  vote_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, channel_id)
);

COMMENT ON TABLE user_votes IS 'Tracks user votes on channels for ranking and trending analysis';

-- Create content_questions table
CREATE TABLE content_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_id text REFERENCES content(id) ON DELETE CASCADE,
  question text NOT NULL,
  response text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE content_questions IS 'Records Q&A interactions for content items';

-- Create user_summary_history table
CREATE TABLE user_summary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_id text REFERENCES content(id) ON DELETE CASCADE,
  summary_id uuid REFERENCES summaries(id) ON DELETE CASCADE,
  generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE user_summary_history IS 'Tracks each summary request by a user for content items';

-- Create daily_digest table
CREATE TABLE daily_digest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email_sent boolean DEFAULT false,
  digest_content jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE daily_digest IS 'Tracks daily email notifications and stores digest content';

-- Create cron_logs table
CREATE TABLE cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  status text CHECK (status IN ('success', 'failed')),
  message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE cron_logs IS 'Logs for monitoring scheduled task execution';

-- Create indexes
CREATE INDEX idx_content_unique_identifier ON content(unique_identifier);
CREATE INDEX idx_content_source_id ON content(source_id);
CREATE INDEX idx_summaries_content_id ON summaries(content_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_type_id ON subscriptions(subscription_type, subscription_id);
CREATE INDEX idx_user_summary_history_user_id ON user_summary_history(user_id);
CREATE INDEX idx_user_summary_history_content_id ON user_summary_history(content_id);
CREATE INDEX idx_user_votes_channel_id ON user_votes(channel_id);
CREATE INDEX idx_content_questions_content_id ON content_questions(content_id);

-- Add full-text search support
ALTER TABLE content ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION content_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.transcript, '')), 'B') ||
    setweight(to_tsvector('english', coalesce((SELECT string_agg(name, ' ')
        FROM tags
        INNER JOIN content_tags ON tags.id = content_tags.tag_id
        WHERE content_tags.content_id = NEW.id), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON content FOR EACH ROW EXECUTE PROCEDURE content_search_vector_update();

CREATE INDEX content_search_vector_idx ON content USING gin(search_vector);

-- Add RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_summary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digest ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by owner"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Profiles are updatable by owner"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Channels policies
CREATE POLICY "Channels are viewable by everyone"
  ON channels FOR SELECT
  USING (true);

CREATE POLICY "Channels are insertable by authenticated users"
  ON channels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Content policies
CREATE POLICY "Content is viewable by everyone"
  ON content FOR SELECT
  USING (true);

CREATE POLICY "Content is insertable by authenticated users"
  ON content FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Summaries policies
CREATE POLICY "Summaries are viewable by everyone"
  ON summaries FOR SELECT
  USING (true);

-- Subscriptions policies
CREATE POLICY "Subscriptions are viewable by owner"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Subscriptions are manageable by owner"
  ON subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Tags are insertable by authenticated users"
  ON tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Content tags policies
CREATE POLICY "Content tags are viewable by everyone"
  ON content_tags FOR SELECT
  USING (true);

CREATE POLICY "Content tags are insertable by authenticated users"
  ON content_tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- User votes policies
CREATE POLICY "User votes are viewable by owner"
  ON user_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User votes are manageable by owner"
  ON user_votes FOR ALL
  USING (auth.uid() = user_id);

-- Content questions policies
CREATE POLICY "Content questions are viewable by owner"
  ON content_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Content questions are manageable by owner"
  ON content_questions FOR ALL
  USING (auth.uid() = user_id);

-- User summary history policies
CREATE POLICY "User summary history is viewable by owner"
  ON user_summary_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User summary history is manageable by owner"
  ON user_summary_history FOR ALL
  USING (auth.uid() = user_id);

-- Daily digest policies
CREATE POLICY "Daily digest is viewable by owner"
  ON daily_digest FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Daily digest is manageable by owner"
  ON daily_digest FOR ALL
  USING (auth.uid() = user_id);

-- Cron logs policies
CREATE POLICY "Cron logs are viewable by authenticated users"
  ON cron_logs FOR SELECT
  USING (auth.role() = 'authenticated');
