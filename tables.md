# Database Schema Documentation

This document is the primary reference for the database schema and backend architecture of the **Riley Video Summarizer** project. It covers the core tables, relationships, and API endpoints. As the project evolves, update this document to reflect changes in the database structure, API endpoints, or backend functionality.

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Authentication](#authentication)
3. [Core Tables](#core-tables)
   - [profiles](#profiles)
   - [channels](#channels)
   - [rss_feeds](#rss_feeds)
   - [content](#content)
   - [summaries](#summaries)
4. [Relationship Tables](#relationship-tables)
   - [subscriptions](#subscriptions)
   - [tags and content_tags](#tags-and-content_tags)
   - [user_votes](#user_votes)
   - [content_questions](#content_questions)
   - [user_summary_history](#user_summary_history)
5. [Utility Tables](#utility-tables)
   - [daily_digest](#daily_digest)
   - [cron_logs](#cron_logs)
6. [Additional Optimizations](#additional-optimizations)
   - [Indexes](#indexes)
   - [Search Support](#search-support)
7. [API Endpoints](#api-endpoints)
8. [Design Decisions](#design-decisions)
9. [Future Considerations](#future-considerations)

---

## Schema Overview

Our database centers on a unified content model with clear separation of source metadata. Key points include:

- **User Management:** Handled via Supabase Auth with extended metadata in the `profiles` table.
- **Content & Source Metadata:** Videos and podcasts are stored in the unified `content` table. Channels (and optional RSS feeds) are stored separately.
- **Summaries:** AI-generated summaries (short or detailed) are maintained in a dedicated table.
- **User Interactions:** User history, subscriptions, votes, and Q&A interactions are captured for both tracking and discovery.
- **System Operations:** Utility tables support background tasks and monitoring.

---

## Authentication

Authentication is managed by Supabase Auth. The `profiles` table extends Supabase user data by linking on the user’s UUID.

### profiles

```sql
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

COMMENT ON TABLE profiles IS 'Holds additional user metadata extending Supabase Auth';

Core Tables

channels

Stores channel details for both YouTube and podcast channels. A channel may optionally link to an RSS feed.

CREATE TABLE channels (
  id text PRIMARY KEY, -- Channel ID (YouTube or podcast)
  name text NOT NULL,
  url text NOT NULL,
  rss_feed_id uuid REFERENCES rss_feeds(id), -- Optional link to an RSS feed
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE channels IS 'Stores channel information for YouTube and podcast channels';

rss_feeds

Stores RSS feed details for channels and podcasts.

CREATE TYPE feed_type AS ENUM ('youtube', 'podcast');

CREATE TABLE rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_url text UNIQUE NOT NULL,
  feed_type feed_type NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE rss_feeds IS 'Stores RSS feed details for channels and podcasts';

content

A unified table that stores both videos and podcast episodes. It uses a normalized unique_identifier to handle URL variations and prevent duplicates.

CREATE TABLE content (
  id text PRIMARY KEY, -- Content ID (e.g., YouTube Video ID or Podcast Episode ID)
  content_type text NOT NULL CHECK (content_type IN ('video', 'podcast')),
  unique_identifier text UNIQUE NOT NULL, -- Normalized identifier from the URL
  title text NOT NULL,
  url text NOT NULL,
  transcript text NOT NULL,
  published_at timestamp with time zone NOT NULL, -- Original publish time from source
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL, -- Submission time on our platform
  source_id text REFERENCES channels(id) -- Reference to the originating channel
);

COMMENT ON TABLE content IS 'Unified table storing videos and podcast episodes';

summaries

Stores AI-generated summaries for content items. Each summary row has a type (e.g., ‘short’ or ‘detailed’).

CREATE TABLE summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id text REFERENCES content(id) ON DELETE CASCADE,
  summary text NOT NULL,
  summary_type text NOT NULL CHECK (summary_type IN ('short', 'detailed')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE summaries IS 'AI-generated summaries for content items with different types';

Relationship Tables

subscriptions

Tracks user subscriptions to channels or RSS feeds using a polymorphic design.

CREATE TYPE subscription_type AS ENUM ('channel', 'feed');

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_type subscription_type NOT NULL,
  subscription_id text NOT NULL, -- Channel ID (from channels) or Feed ID (from rss_feeds)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, subscription_type, subscription_id)
);

COMMENT ON TABLE subscriptions IS 'Tracks user subscriptions to channels or RSS feeds';

tags and content_tags

Used for tagging content items.

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

CREATE TABLE content_tags (
  content_id text NOT NULL, -- References content.id
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

COMMENT ON TABLE content_tags IS 'Associates tags with content items';

user_votes

Records user upvotes/downvotes on channels. (For simplicity, votes are only at the channel level per your user stories.)

CREATE TABLE user_votes (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id text REFERENCES channels(id) ON DELETE CASCADE,
  vote_type integer CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
  vote_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, channel_id)
);

COMMENT ON TABLE user_votes IS 'Tracks user votes on channels for ranking and trending analysis';

content_questions

Stores Q&A interactions for a content item (video or podcast). For now, we handle one-off questions; threaded conversations can be added later if needed.

CREATE TABLE content_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_id text NOT NULL, -- References content.id
  question text NOT NULL,
  response text, -- AI or moderator response
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE content_questions IS 'Records Q&A interactions for content items';

user_summary_history

Tracks each instance when a user generates or accesses a summary, enabling a “My Summaries” feed.

CREATE TABLE user_summary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_id text REFERENCES content(id) ON DELETE CASCADE,
  summary_id uuid REFERENCES summaries(id) ON DELETE CASCADE,
  generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE user_summary_history IS 'Tracks each summary request by a user for content items';

Utility Tables

daily_digest

Stores the content (as JSON) for daily email digests. Cron jobs update this table.

CREATE TABLE daily_digest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email_sent boolean DEFAULT false,
  digest_content jsonb, -- Digest email content
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE daily_digest IS 'Tracks daily email notifications and stores digest content';

cron_logs

Logs the execution of scheduled background tasks for debugging and monitoring.

CREATE TABLE cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  status text CHECK (status IN ('success', 'failed')),
  message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE cron_logs IS 'Logs for monitoring scheduled task execution';

Additional Optimizations

Indexes

To keep queries fast even as data grows, add these indexes:
	•	content:

CREATE INDEX idx_content_unique_identifier ON content(unique_identifier);
CREATE INDEX idx_content_source_id ON content(source_id);


	•	summaries:

CREATE INDEX idx_summaries_content_id ON summaries(content_id);


	•	subscriptions:

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_type_id ON subscriptions(subscription_type, subscription_id);


	•	user_summary_history:

CREATE INDEX idx_user_summary_history_user_id ON user_summary_history(user_id);
CREATE INDEX idx_user_summary_history_content_id ON user_summary_history(content_id);


	•	user_votes:

CREATE INDEX idx_user_votes_channel_id ON user_votes(channel_id);


	•	content_questions:

CREATE INDEX idx_content_questions_content_id ON content_questions(content_id);



Search Support

For the search page (user story #11), add full-text search support to the content table:
	1.	Add a tsvector Column:

ALTER TABLE content ADD COLUMN search_vector tsvector;


	2.	Create a Trigger to Update the Column:

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


	3.	Create a GIN Index:

CREATE INDEX content_search_vector_idx ON content USING gin(search_vector);

API Endpoints

Below is an updated outline of API endpoints. The endpoints address the core user stories while keeping the design simple:
	1.	User Authentication
(Handled by Supabase Auth)
	•	POST /auth/register
	•	POST /auth/login
	2.	Content Submission & Retrieval
	•	POST /content
	•	Purpose: Submit a new video or podcast link.
	•	Flow:
	1.	Normalize the URL to a unique_identifier.
	2.	Check for an existing record.
	3.	If found, return the existing content_id and summaries; otherwise, insert a new record.
	•	Input: { url: string }
	•	Output: { content_id: string, existing: boolean }
	•	GET /content/:id
	•	Purpose: Retrieve a specific content item (including its summaries).
	•	GET /content?url=…
	•	Alternative: Retrieve content by URL.
	3.	Summary Generation & Retrieval
	•	POST /summaries
	•	Purpose: Generate and store a summary for a content item.
	•	Input: { content_id: string, summary_type: string }
	•	Note: Check for an existing summary before generating a new one (to save LLM/API costs).
	•	GET /summaries/:content_id
	•	Purpose: Fetch summaries for a given content item.
	4.	User Summary History
	•	POST /user-summary-history
	•	Purpose: Record a summary generation event.
	•	GET /user-summary-history/:user_id
	•	Purpose: Retrieve a user’s summary history (join with content and summaries for details).
	5.	Subscriptions
	•	POST /subscribe
	•	Purpose: Subscribe a user to a channel or RSS feed.
	•	GET /subscriptions/:user_id
	•	Purpose: Retrieve a user’s subscriptions.
	6.	Channel Voting (Trending Support)
	•	POST /vote
	•	Purpose: Record an upvote or downvote on a channel.
	•	Note: For simplicity, trending channels can be determined dynamically (e.g., count of upvotes).
	7.	Content Q&A
	•	POST /content-questions
	•	Purpose: Record a question (and optional response) for a content item.
	•	(Optional for future improvement: a GET endpoint to retrieve full Q&A threads.)
	8.	Channel Details & Popular Channels
	•	GET /channels/:id
	•	Purpose: Retrieve channel details (to display channel name on summary cards).
	•	GET /popular-channels
	•	Purpose: Retrieve a list of popular channels (computed dynamically by subscriber count or upvotes).
	9.	Tags
	•	GET /tags
	•	Purpose: Retrieve available tags for use in search or autocomplete features.
	10.	Search
	•	GET /search?q=…
	•	Purpose: Search for content based on keywords (utilizing the full-text search on content.search_vector).

Design Decisions
	1.	Unified Content & Source Metadata:
	•	Combining videos and podcasts into one table simplifies the “My Summaries” feed.
	•	Source metadata is separated into channels and optional RSS feeds.
	2.	Duplicate Prevention:
	•	The unique_identifier (with a UNIQUE constraint and an index) ensures duplicate submissions are avoided.
	3.	Cost Efficiency:
	•	Before generating a new summary, check for an existing one to avoid extra LLM/API calls.
	4.	User Interactions:
	•	User history, subscriptions, and votes are tracked to support personalized feeds and popular channels.
	5.	Search & Discovery:
	•	A full-text search mechanism (using tsvector and a trigger) supports efficient search without adding undue complexity.

Future Considerations
	•	Threaded Q&A:
Consider adding a self-referencing column (e.g., parent_question_id) to support conversation threads.
	•	Content Votes:
Although not required by current user stories, a dedicated table for content votes could be added later if content-level ranking is needed.
	•	Dedicated Trending Calculation:
For more advanced “Popular Channels” features, a pre-calculated table (updated via a cron job) might be considered.
	•	Rate Limiting & Security:
While Supabase Auth provides basic security, consider adding rate limiting (especially on summary generation) to manage costs and abuse.

This revised documentation reflects a balanced approach—addressing performance and search optimizations while keeping the implementation scope manageable for your weekend project.

```
