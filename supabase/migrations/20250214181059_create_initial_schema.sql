-- Create profiles table to extend Supabase Auth
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE profiles IS 'Holds additional user metadata extending Supabase Auth';

-- Create channels table
CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE channels IS 'YouTube channels that users can subscribe to';

-- Create videos table with enhanced metadata
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  channel_id TEXT REFERENCES channels(id) ON DELETE CASCADE,
  unique_identifier TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  transcript_path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  metadata JSONB,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE videos IS 'YouTube videos with their transcripts and metadata';
COMMENT ON COLUMN videos.unique_identifier IS 'Normalized identifier to handle different URL formats';

-- Create user_summaries table with enhanced features
CREATE TABLE user_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  detailed_summary TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE user_summaries IS 'User-specific video summaries with optional detailed versions';

-- Create tags table for better tag management
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE content_tags (
  content_id TEXT NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'summary')),
  PRIMARY KEY (content_id, tag_id)
);

COMMENT ON TABLE tags IS 'Reusable tags for categorizing content';
COMMENT ON TABLE content_tags IS 'Associates tags with videos or summaries';

-- Create subscriptions table
CREATE TYPE subscription_type AS ENUM ('channel');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_type subscription_type NOT NULL,
  subscription_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, subscription_type, subscription_id)
);

COMMENT ON TABLE subscriptions IS 'Tracks user subscriptions to channels';

-- Create indexes
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX idx_videos_unique_identifier ON videos(unique_identifier);
CREATE INDEX idx_user_summaries_user_id ON user_summaries(user_id);
CREATE INDEX idx_user_summaries_video_id ON user_summaries(video_id);
CREATE INDEX idx_user_summaries_created_at ON user_summaries(created_at DESC);
CREATE INDEX idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX idx_content_tags_tag_id ON content_tags(tag_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_summaries_updated_at
  BEFORE UPDATE ON user_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

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

-- Videos policies
CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT
  USING (true);

CREATE POLICY "Videos are insertable by authenticated users"
  ON videos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Videos are updatable by authenticated users"
  ON videos FOR UPDATE
  USING (auth.role() = 'authenticated');

-- User summaries policies
CREATE POLICY "Summaries are viewable by owner"
  ON user_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Summaries are insertable by owner"
  ON user_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Summaries are updatable by owner"
  ON user_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Summaries are deletable by owner"
  ON user_summaries FOR DELETE
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

-- Subscriptions policies
CREATE POLICY "Subscriptions are viewable by owner"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Subscriptions are insertable by owner"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Subscriptions are deletable by owner"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);
