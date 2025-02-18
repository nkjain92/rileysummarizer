Below is an example of documentation in the requested style. It not only outlines the schema but also describes the API endpoints you’ll need and indicates which tables/columns each API interacts with.

Database Schema Documentation

This document serves as the primary reference for the database schema and backend architecture of the Riley Video Summarizer project. As the project evolves, this document should be continuously updated to reflect any changes in the database structure, API endpoints, or backend functionality.

Table of Contents 1. Schema Overview 2. Authentication 3. Core Tables 4. Relationship Tables 5. Utility Tables 6. API Endpoints 7. Design Decisions 8. Future Considerations

Schema Overview

The database is structured around several core concepts:
• User Management: Managed via Supabase Auth (with extended user metadata stored in profiles).
• Content Tracking: Storing YouTube videos and podcasts, including transcripts and AI-generated summaries.
• Content Organization: Tagging content and managing feeds.
• User Interactions: Subscriptions, upvote/downvote voting, and Q&A (content questions).
• System Operations: Email digests and cron job logs for background tasks.

Authentication

Authentication is handled by Supabase Auth, which provides:
• Email/password authentication
• OAuth providers (can be added later)
• Session management
• Email verification
• Password reset functionality

Additional user metadata is stored in the profiles table (linked to Supabase Auth via the user’s UUID).

Core Tables

profiles

Extends Supabase Auth with additional user metadata.

CREATE TABLE profiles (
id uuid REFERENCES auth.users ON DELETE CASCADE,
name text,
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
PRIMARY KEY (id)
);

COMMENT ON TABLE profiles IS 'Holds additional user metadata extending Supabase Auth';

channels

Stores YouTube channel information.

CREATE TABLE channels (
id text PRIMARY KEY, -- YouTube Channel ID
name text NOT NULL,
url text NOT NULL,
subscriber_count integer DEFAULT 0,
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE channels IS 'YouTube channels that users can subscribe to';

rss_feeds

Tracks RSS feeds for both YouTube channels and podcasts.

CREATE TYPE feed_type AS ENUM ('youtube', 'podcast');

CREATE TABLE rss_feeds (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
feed_url text UNIQUE NOT NULL,
feed_type feed_type NOT NULL,
name text NOT NULL,
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE rss_feeds IS 'RSS feeds for both YouTube channels and podcasts';

videos

Stores YouTube video information and transcripts.

CREATE TABLE videos (
id text PRIMARY KEY, -- YouTube Video ID
unique_identifier text UNIQUE NOT NULL, -- Normalized URL/identifier to prevent duplicates
channel_id text REFERENCES channels(id) ON DELETE CASCADE,
title text NOT NULL,
url text NOT NULL,
transcript text NOT NULL,
published_at timestamp with time zone NOT NULL,
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE videos IS 'YouTube videos with their transcripts';
COMMENT ON COLUMN videos.unique_identifier IS 'Normalized identifier to handle different URL formats';

podcasts

Stores podcast episode information.

CREATE TABLE podcasts (
id text PRIMARY KEY, -- Podcast Episode ID
feed_id uuid REFERENCES rss_feeds(id) ON DELETE CASCADE,
title text NOT NULL,
url text NOT NULL,
transcript text, -- Optional transcript
published_at timestamp with time zone NOT NULL,
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE podcasts IS 'Podcast episodes and their optional transcripts';

summaries

Stores AI-generated content summaries.
Note: Only one summary per video is stored so that any user using the same video link will retrieve the same summary (avoiding redundant API calls).

CREATE TABLE summaries (
video_id text PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
summary text NOT NULL,
detailed_summary text -- Optional detailed version
);

COMMENT ON TABLE summaries IS 'AI-generated summaries of videos (and podcasts if extended later)';

Relationship Tables

subscriptions

Tracks user subscriptions using a polymorphic association (subscribing to channels or feeds).

CREATE TYPE subscription_type AS ENUM ('channel', 'feed');

CREATE TABLE subscriptions (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
subscription_type subscription_type NOT NULL,
subscription_id text NOT NULL, -- Can be channel_id or feed_id
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
UNIQUE (user_id, subscription_type, subscription_id)
);

COMMENT ON TABLE subscriptions IS 'Polymorphic table tracking user subscriptions to channels or feeds';

tags

Manages the master list of reusable tags for content categorization.

CREATE TABLE tags (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
name text UNIQUE NOT NULL
);

content_tags

Associates tags with videos or podcasts. The content_type column distinguishes the type of content.

CREATE TABLE content_tags (
content_id text NOT NULL, -- References videos.id or podcasts.id
tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
content_type text NOT NULL CHECK (content_type IN ('video', 'podcast')),
PRIMARY KEY (content_id, tag_id)
);

COMMENT ON TABLE content_tags IS 'Associates tags with videos or podcasts';

user_votes

Tracks user upvotes/downvotes on channels. Votes include a timestamp to enable trending analysis (e.g., votes in the last day or week).

CREATE TABLE user_votes (
user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
channel_id text REFERENCES channels(id) ON DELETE CASCADE,
vote_type integer CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
vote_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
PRIMARY KEY (user_id, channel_id)
);

COMMENT ON TABLE user_votes IS 'User voting history for channel ranking and trending analysis';

content_questions

Stores Q&A interactions related to a video or podcast. This captures every question/response along with the requesting user.

CREATE TABLE content_questions (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
content_id text NOT NULL, -- video id or podcast id
content_type text NOT NULL CHECK (content_type IN ('video', 'podcast')),
question text NOT NULL,
response text, -- AI or moderator response
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

Utility Tables

daily_digest

Tracks daily email notifications and optionally stores the email content (as JSON) for auditing purposes.

CREATE TABLE daily_digest (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
email_sent boolean DEFAULT false,
digest_content jsonb, -- Stores the content of the digest email
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE daily_digest IS 'Tracks daily email notifications and stores digest content';

cron_logs

Logs scheduled task (cron job) executions to monitor and debug background processes.

CREATE TABLE cron_logs (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
task_name text NOT NULL,
status text CHECK (status IN ('success', 'failed')),
message text,
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE cron_logs IS 'Logs for monitoring scheduled task execution';

API Endpoints

Below is a list of the primary API endpoints required, along with the tables and columns they use.

1. POST /videos
   • Purpose: Add a new YouTube video.
   • Used Tables/Columns:
   • videos: id, unique_identifier, channel_id, title, url, transcript, published_at
   • summaries: Later, after generating the summary, a record is inserted/updated with video_id, summary, and optionally detailed_summary.
   • Edge Cases:
   • Duplicate video check using unique_identifier.

2. POST /podcasts
   • Purpose: Add a new podcast episode.
   • Used Tables/Columns:
   • podcasts: id, feed_id, title, url, transcript, published_at
   • Edge Cases:
   • Handle missing transcript gracefully.

3. GET /videos/:id
   • Purpose: Fetch a video’s summary along with channel details.
   • Used Tables/Columns:
   • videos: For basic video info and transcript.
   • channels: To fetch channel details (name, id, url).
   • summaries: To retrieve summary and detailed_summary.
   • Edge Cases:
   • Return error if transcript is missing.

4. GET /podcasts/:id
   • Purpose: Fetch a podcast’s transcript.
   • Used Tables/Columns:
   • podcasts: To retrieve transcript and basic info.
   • Edge Cases:
   • Handle missing transcripts.

5. GET /search?q=query
   • Purpose: Search for videos/podcasts by title or tag.
   • Used Tables/Columns:
   • videos and podcasts: Query against title.
   • content_tags & tags: Join to filter by tag names.
   • Edge Cases:
   • Partial matches and multiple keywords.

6. POST /subscribe
   • Purpose: Subscribe a user to a channel or feed.
   • Used Tables/Columns:
   • subscriptions: user_id, subscription_type, subscription_id
   • Edge Cases:
   • Prevent duplicate subscriptions.

7. GET /subscriptions/:user_id
   • Purpose: Retrieve all subscriptions for a user.
   • Used Tables/Columns:
   • subscriptions: Filter by user_id
   • Joined with channels or rss_feeds based on subscription_type.
   • Edge Cases:
   • Clean up invalid or orphaned subscriptions.

8. POST /vote
   • Purpose: Record an upvote or downvote for a channel.
   • Used Tables/Columns:
   • user_votes: user_id, channel_id, vote_type, vote_time
   • Edge Cases:
   • Allow vote updates and track vote time for trending analysis.

9. POST /digest
   • Purpose: Send daily email digest.
   • Used Tables/Columns:
   • daily_digest: Insert or update with user_id, email_sent, and digest_content
   • Additionally, queries may be made on videos, podcasts, and subscriptions to generate content.
   • Edge Cases:
   • Only send email if new content is available.

10. POST /content-questions
    • Purpose: Record a user’s question (and later, the response) regarding a video or podcast.
    • Used Tables/Columns:
    • content_questions: user_id, content_id, content_type, question, and response
    • Edge Cases:
    • No deduplication is needed; record all interactions.

11. GET /summaries/:video_id (optional)
    • Purpose: Retrieve the summary for a given video.
    • Used Tables/Columns:
    • summaries: Retrieve the corresponding summary and detailed_summary.

Design Decisions 1. Polymorphic Subscriptions:
A single subscriptions table with a subscription_type field is used to support both channels and feeds. This design simplifies queries and future extensions. 2. Shared Summaries:
The summaries table uses video_id as a primary key so that the same summary is reused across all users for a particular video, reducing redundant API calls and cost. 3. Content Questions Table:
A dedicated table captures every question and response interaction for both videos and podcasts. This aids in later analysis and potential feature enhancements (e.g., FAQs, improved AI training). 4. Time Tracking:
Timestamps (e.g., published_at, created_at, and vote_time) ensure that we can track when content was published, when records were added, and when votes occurred. This is essential for features like trending content analysis. 5. Data Integrity:
Foreign keys and unique constraints ensure referential integrity and prevent duplicate data (e.g., duplicate video entries through unique_identifier). 6. Extensibility:
The schema is designed to be modular. For example, digest content is stored in JSON format for future audit and analytical needs, and content tagging uses a join table that can easily extend to other content types.

Future Considerations 1. API Documentation:
As you implement each API, document request/response formats, authentication requirements, and error handling. 2. Performance Optimizations:
Add indexes on frequently queried columns (e.g., unique_identifier, user_id, subscription_id) to ensure efficient joins and searches. 3. Data Migration:
Document procedures for migrating data when schema changes occur, ensuring backward compatibility and data integrity. 4. Audit Logging:
Consider implementing audit logs for key operations (e.g., content creation, user votes) to assist with debugging and security. 5. Further Analytics:
With vote timestamps and digest content stored, you can extend analytics features (e.g., trending channels based on recent votes, engagement metrics on Q&A).

This comprehensive documentation should serve as a solid foundation for both your database schema and your API design. It explains how each table supports the user journeys, which APIs will interact with which tables/columns, and what edge cases to consider as you build the system.
