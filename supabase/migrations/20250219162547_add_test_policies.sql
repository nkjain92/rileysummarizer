-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Channels are publicly readable" ON channels;
DROP POLICY IF EXISTS "Channels can be created by authenticated users" ON channels;
DROP POLICY IF EXISTS "Channels can be updated by authenticated users" ON channels;

-- Create new policies
CREATE POLICY "Channels are accessible to all users"
ON channels FOR SELECT
USING (true);

CREATE POLICY "Channels can be created by any authenticated user"
ON channels FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Channels can be updated by any authenticated user"
ON channels FOR UPDATE
USING (auth.role() = 'authenticated');

-- Enable RLS on related tables
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

-- Content policies
CREATE POLICY "Content is accessible to all users"
ON content FOR SELECT
USING (true);

CREATE POLICY "Content can be created by authenticated users"
ON content FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Content can be updated by authenticated users"
ON content FOR UPDATE
USING (auth.role() = 'authenticated');

-- Summaries policies
CREATE POLICY "Summaries are accessible to all users"
ON summaries FOR SELECT
USING (true);

CREATE POLICY "Summaries can be created by authenticated users"
ON summaries FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Summaries can be updated by authenticated users"
ON summaries FOR UPDATE
USING (auth.role() = 'authenticated');

-- Tags policies
CREATE POLICY "Tags are accessible to all users"
ON tags FOR SELECT
USING (true);

CREATE POLICY "Tags can be created by authenticated users"
ON tags FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Content tags policies
CREATE POLICY "Content tags are accessible to all users"
ON content_tags FOR SELECT
USING (true);

CREATE POLICY "Content tags can be created by authenticated users"
ON content_tags FOR INSERT
WITH CHECK (auth.role() = 'authenticated');