# Database Schema Documentation

This document serves as the primary reference for the database schema and backend architecture of the Riley Video Summarizer project. As the project evolves, this document should be continuously updated to reflect any changes in the database structure, API endpoints, or backend functionality.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Authentication](#authentication)
3. [Core Tables](#core-tables)
4. [Relationship Tables](#relationship-tables)
5. [Utility Tables](#utility-tables)
6. [Design Decisions](#design-decisions)

## Schema Overview

The database is structured around several core concepts:

- User management (via Supabase Auth)
- Content tracking (videos and podcasts)
- Content organization (tags and feeds)
- User interactions (subscriptions and votes)
- System operations (digests and cron jobs)

## Authentication

Authentication is handled by Supabase Auth, which provides:

- Email/password authentication
- OAuth providers (can be added later)
- Session management
- Email verification
- Password reset functionality

## Core Tables

### profiles

Extends Supabase Auth with additional user metadata

```sql
create table profiles (
  id uuid references auth.users on delete cascade,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

comment on table profiles is 'Holds additional user metadata extending Supabase Auth';
```

### channels

Stores YouTube channel information

```sql
create table channels (
  id text primary key, -- YouTube Channel ID
  name text not null,
  url text not null,
  subscriber_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table channels is 'YouTube channels that users can subscribe to';
```

### rss_feeds

Tracks YouTube RSS feeds and podcasts

```sql
create type feed_type as enum ('youtube', 'podcast');

create table rss_feeds (
  id uuid primary key default gen_random_uuid(),
  feed_url text unique not null,
  feed_type feed_type not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table rss_feeds is 'RSS feeds for both YouTube channels and podcasts';
```

### videos

Stores YouTube video information and transcripts

```sql
create table videos (
  id text primary key, -- YouTube Video ID
  unique_identifier text unique not null, -- Normalized URL/identifier
  channel_id text references channels(id) on delete cascade,
  title text not null,
  url text not null,
  transcript text not null,
  published_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table videos is 'YouTube videos with their transcripts';
comment on column videos.unique_identifier is 'Normalized identifier to handle different URL formats';
```

### podcasts

Stores podcast episode information

```sql
create table podcasts (
  id text primary key, -- Podcast Episode ID
  feed_id uuid references rss_feeds(id) on delete cascade,
  title text not null,
  url text not null,
  transcript text, -- Optional, as not all podcasts might have transcripts
  published_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table podcasts is 'Podcast episodes and their optional transcripts';
```

### summaries

Stores AI-generated content summaries

```sql
create table summaries (
  id uuid primary key default gen_random_uuid(),
  video_id text references videos(id) on delete cascade,
  summary text not null,
  detailed_summary text, -- Optional detailed version
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table summaries is 'AI-generated summaries of videos and podcasts';
```

## Relationship Tables

### subscriptions

Tracks user subscriptions using polymorphic association

```sql
create type subscription_type as enum ('channel', 'feed');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subscription_type subscription_type not null,
  subscription_id text not null, -- Can be channel_id or feed_id
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, subscription_type, subscription_id)
);

comment on table subscriptions is 'Polymorphic table tracking user subscriptions to channels or feeds';
```

### tags

Manages content categorization

```sql
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table content_tags (
  content_id text not null,
  tag_id uuid references tags(id) on delete cascade,
  content_type text not null check (content_type in ('video', 'podcast')),
  primary key (content_id, tag_id)
);

comment on table tags is 'Reusable tags for categorizing content';
comment on table content_tags is 'Associates tags with videos or podcasts';
```

### user_votes

Tracks user voting on channels

```sql
create table user_votes (
  user_id uuid references profiles(id) on delete cascade,
  channel_id text references channels(id) on delete cascade,
  vote_type integer check (vote_type in (-1, 1)), -- -1 for downvote, 1 for upvote
  primary key (user_id, channel_id)
);

comment on table user_votes is 'User voting history for channel ranking';
```

## Utility Tables

### daily_digest

Tracks email notification status

```sql
create table daily_digest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  email_sent boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table daily_digest is 'Tracks daily email notification status';
```

### cron_logs

Monitors scheduled task execution

```sql
create table cron_logs (
  id uuid primary key default gen_random_uuid(),
  task_name text not null,
  status text check (status in ('success', 'failed')),
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table cron_logs is 'Logs for monitoring scheduled task execution';
```

## Design Decisions

1. **Polymorphic Subscriptions**:

   - Uses a single table with subscription_type to handle both channel and feed subscriptions
   - Provides flexibility for adding new subscription types in the future
   - Simplifies queries for user subscriptions

2. **Content Tagging**:

   - Uses a unified content_tags table with content_type
   - Allows for consistent tag management across different content types
   - Simplifies tag-based searches and content discovery

3. **Transcript Storage**:

   - Stored directly in the videos/podcasts tables for simplicity
   - Could be moved to a separate table if transcript versioning is needed

4. **Daily Digest**:
   - Currently tracks basic email status
   - Can be extended with JSON fields or related tables to store digest content details

## Future Considerations

1. **API Documentation**:

   - Document all API endpoints here as they are created
   - Include request/response formats
   - Add authentication requirements

2. **Performance Optimizations**:

   - Document any indexes added for query optimization
   - Track any materialized views created

3. **Migrations**:
   - Keep track of significant schema changes
   - Document migration procedures

---

Note: This document should be updated whenever:

- New tables or columns are added
- Existing schema is modified
- New API endpoints are created
- Significant backend functionality is implemented
- Performance optimizations are made
