# Overall Strategy

1. **Database-First Integration**

   - Fully integrate Supabase as the persistent backend before building features
   - Create a dedicated Supabase client, write a new migration (with up-to-date schema and RLS policies), and update the DatabaseService to use Supabase

2. **Vertical Slices for Each Feature**

   - Build each feature end-to-end (API route, service layer, UI component) so that every change is fully testable

3. **Consistent Error Handling & Testing**

   - Use try/catch blocks, the AppError class, and logger consistently in API routes and service methods
   - Write unit tests where possible (e.g., for URL parsing) and perform manual testing after each subtask

4. **Version Control & Code Reviews**
   - Work on small feature branches, commit frequently with clear messages, and review code often to avoid regressions

# Phase 1: Supabase Integration & Database Setup

## Step 1: Supabase Client & Environment Setup

### Tasks

1. Create a new Supabase project (if not already done)
2. In the project root, create or update the `.env.local` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Create a dedicated Supabase client file:

   ```typescript
   // src/lib/utils/supabaseClient.ts
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

4. Import this client into `DatabaseService.ts` and any other file that interacts with Supabase

### Testing

- Log the client instance in a temporary component to verify that the environment variables are loaded
- Confirm in the Supabase dashboard that the project is active

## Step 2: New Database Migration

### Tasks

Create a new migration file (using the Supabase CLI or Studio) that creates all required tables and RLS policies.

#### Required Tables

1. **profiles**

   ```sql
   CREATE TABLE profiles (
     id uuid PRIMARY KEY,
     name text,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   );

   CREATE POLICY "Profiles can be viewed/updated only by owner" ON profiles
     FOR SELECT, UPDATE USING (auth.uid() = id);
   ```

2. **channels**

   ```sql
   CREATE TABLE channels (
     id text PRIMARY KEY,
     name text NOT NULL,
     url text NOT NULL,
     subscriber_count integer DEFAULT 0,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   );

   CREATE POLICY "Channels are public" ON channels FOR SELECT USING (true);
   CREATE POLICY "Channels are insertable by authenticated users" ON channels
     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

3. **videos**

   ```sql
   CREATE TABLE videos (
     id text PRIMARY KEY,
     channel_id text REFERENCES channels(id) ON DELETE CASCADE,
     unique_identifier text UNIQUE NOT NULL,
     title text NOT NULL,
     url text NOT NULL,
     transcript_path text NOT NULL,
     language text NOT NULL DEFAULT 'en',
     metadata jsonb,
     published_at timestamp with time zone NOT NULL,
     last_updated timestamp with time zone DEFAULT now() NOT NULL,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   );

   CREATE POLICY "Videos are public" ON videos FOR SELECT USING (true);
   CREATE POLICY "Videos are insertable by authenticated users" ON videos
     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

4. **user_summaries**

   ```sql
   CREATE TABLE user_summaries (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
     video_id text REFERENCES videos(id) ON DELETE CASCADE,
     summary text NOT NULL,
     detailed_summary text,
     tags text[] NOT NULL DEFAULT '{}',
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     updated_at timestamp with time zone DEFAULT now() NOT NULL
   );

   CREATE POLICY "Users can view/create/update their summaries" ON user_summaries
     FOR SELECT, INSERT, UPDATE USING (auth.uid() = user_id);
   ```

5. **tags & content_tags**

   ```sql
   CREATE TABLE tags (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text UNIQUE NOT NULL
   );

   CREATE TABLE content_tags (
     content_id text NOT NULL,
     tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
     content_type text NOT NULL CHECK (content_type IN ('video', 'summary')),
     PRIMARY KEY (content_id, tag_id)
   );

   CREATE POLICY "Tags are public" ON tags FOR SELECT USING (true);
   CREATE POLICY "Tags are insertable by authenticated users" ON tags
     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   CREATE POLICY "Content tags are public" ON content_tags FOR SELECT USING (true);
   CREATE POLICY "Content tags are insertable by authenticated users" ON content_tags
     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

6. **subscriptions**

   ```sql
   CREATE TYPE subscription_type AS ENUM ('channel');

   CREATE TABLE subscriptions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
     subscription_type subscription_type NOT NULL,
     subscription_id text NOT NULL,
     created_at timestamp with time zone DEFAULT now() NOT NULL,
     UNIQUE (user_id, subscription_type, subscription_id)
   );

   CREATE POLICY "Users can manage their subscriptions" ON subscriptions
     FOR SELECT, INSERT, DELETE USING (auth.uid() = user_id);
   ```

7. **user_votes**

   ```sql
   CREATE TABLE user_votes (
     user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
     channel_id text REFERENCES channels(id) ON DELETE CASCADE,
     vote_type integer CHECK (vote_type IN (-1, 1)),
     vote_time timestamp with time zone DEFAULT now() NOT NULL,
     PRIMARY KEY (user_id, channel_id)
   );

   CREATE POLICY "Users can vote on channels" ON user_votes
     FOR SELECT, INSERT, UPDATE USING (auth.uid() = user_id);
   ```

8. **content_questions**

   ```sql
   CREATE TABLE content_questions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
     content_id text NOT NULL,
     question text NOT NULL,
     response text,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   );

   CREATE POLICY "Users can view and create questions for content" ON content_questions
     FOR SELECT, INSERT USING (auth.uid() = user_id);
   ```

Run the migration with the Supabase CLI:

```bash
supabase migration new create_current_schema
supabase db push
```

### Testing

- Use the Supabase dashboard to inspect tables and policies
- (Optional) Manually insert and delete records in each table via the dashboard

## Step 3: Update DatabaseService.ts to Use Supabase

Since we now have a Supabase project set up (and a migration file for the current schema), we need to replace any remaining in-memory logic with Supabase queries in our service layer. At this point, the primary features that have been built are:

- Generating summaries (via OpenAI)
- Tag management (finding/creating tags)
- Viewing past summaries (user summaries)

> **Note:** If a method already uses Supabase (for example, if it's already querying the database for tags or summaries), no changes are needed. For any method that still uses an in-memory store (or if you find old code that is no longer relevant), update or remove it.

### 3.1 – Verify the Supabase Client Is Set Up

1. **Confirm that you have a dedicated client file:**

   - **File:** `src/lib/utils/supabaseClient.ts`
   - **Code:**

     ```typescript
     import { createClient } from '@supabase/supabase-js';

     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
     const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
     export const supabase = createClient(supabaseUrl, supabaseKey);
     ```

2. **Ensure that any file needing to interact with the database imports this client** (do not create a new instance of the client in each file).

### 3.2 – Update Each Database Method

Review the methods in `DatabaseService.ts` and ensure that they use Supabase queries with proper error handling. For example, update methods that previously used in-memory logic (if any) to use Supabase.

#### Example: Updating `findChannelById`

1. **Open File:** `src/lib/services/DatabaseService.ts`
2. **Locate the method** `findChannelById`. Replace its contents (or verify that it looks like the example below):

```typescript
async findChannelById(id: string): Promise<ChannelRecord | null> {
  try {
    // Query the "channels" table for the record with the given ID.
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Expect either one record or null.

    if (error) {
      logger.error("Supabase error in findChannelById:", error, { channelId: id });
      throw new AppError(
        `Channel not found: ${error.message}`,
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        HttpStatus.NOT_FOUND
      );
    }
    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("Unexpected error in findChannelById:", err, { channelId: id });
    throw new AppError(
      "An unexpected error occurred while fetching the channel.",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR
    );
  }
}
```

### Key Points:

- Use `.select('*')` and filter with `.eq('id', id)`
- Use `.maybeSingle()` to get either one result or null
- Wrap the query in a try/catch block
- Log any errors using the provided logger
- Re-throw errors as an AppError with the appropriate ErrorCode and HttpStatus

### Other Methods to Check or Update

Review and update the following methods (if needed):

1. **Profiles:**

   - `getProfile(userId: string)`
   - `upsertProfile(profile: …)`

2. **Videos:**

   - `findVideoById(id: string)`
   - `createVideo(video: …)`
   - `updateVideo(id: string, video: Partial<VideoRecord>)`

3. **User Summaries:**

   - `getUserSummaries(userId: string)`
   - `createUserSummary(summary: …)`
   - `updateUserSummary(id: string, summary: Partial<UserSummaryRecord>)`
   - `findSummaryByVideoId(videoId: string, userId: string)`

4. **Tags and Content Tags:**

   - `findOrCreateTag(name: string)`
   - `addContentTag(contentTag: ContentTagRecord)`
   - `getContentTags(contentId: string)`

5. **Subscriptions:**
   - `getSubscriptions(userId: string)`
   - `addSubscription(subscription: …)`
   - `removeSubscription(userId: string, subscriptionId: string)`

For each method, ensure that you:

- Remove any in-memory fallback or outdated logic
- Use the imported supabase client for all queries
- Wrap the call in a try/catch block as shown above
- Log errors using the provided logger
- Re-throw errors as an AppError with the correct ErrorCode and HttpStatus

### 3.3 – Testing Your Changes

Before moving on, create a temporary test function (or use your favorite testing framework) to call each updated method and verify the following:

- Expected Data is Returned: Check the Supabase dashboard to confirm that records are correctly created, updated, or retrieved
- Errors are Handled Correctly: You can simulate an error by providing an invalid ID, for example

#### Example Temporary Test Function

```typescript
// Add this temporarily at the bottom of DatabaseService.ts (or in a separate test file)
async function testDatabaseService() {
  const db = new DatabaseService('Test');

  // Test upserting a channel
  const testChannel = {
    id: 'test-channel',
    name: 'Test Channel',
    url: 'https://example.com/test-channel',
    subscriber_count: 0,
  };
  const upsertedChannel = await db.upsertChannel(testChannel);
  console.log('Upserted Channel:', upsertedChannel);

  // Test fetching a channel
  const foundChannel = await db.findChannelById('test-channel');
  console.log('Found Channel:', foundChannel);

  // Test getting user summaries
  const summaries = await db.getUserSummaries('anonymous');
  console.log('User Summaries:', summaries);
}

testDatabaseService().catch(console.error);
```

Once you confirm that each method works as expected:

- Remove the temporary test code
- Commit your changes with a commit message like:
  "Step 3: Update DatabaseService to use Supabase queries and remove in-memory logic"

## Step 4: Remove In-Memory Store Code and Unused Files

After verifying that all database operations now work reliably with Supabase, search the codebase for any remnants of the in-memory storage logic. This might include:

### 4.1 – In-Memory Store Files

- **Identify Files:**
  - Check files such as `src/lib/types/storage.ts` that define an in-memory transcriptStore or similar functions (e.g., storeTranscript, getTranscript, deleteTranscript, transcriptExists)
- **Action:**
  - Delete or refactor these functions so that only the Supabase-based implementations remain
  - For example, if a function is now replaced by a Supabase call in `src/lib/utils/storage.ts`, remove the old in-memory version

### 4.2 – Old Service Files

- Identify any unused files that pertain solely to the in-memory store
- **Action:**
  - Remove these files if they are no longer referenced anywhere in the project

### 4.3 – Cleanup References

- **Search the Codebase:**
  - Ensure that all references to the in-memory store (or related tests) are removed
- **Testing:**
  - Run the application and verify that there are no errors related to missing in-memory modules

### 4.4 – Final End-to-End Testing

- **Run the Application End-to-End:**
  - Confirm that all database operations (creating profiles, channels, videos, summaries, etc.) work correctly using Supabase
- **Check the Supabase Dashboard:**
  - Verify that data is being properly written and read from the database

By following these detailed steps, you ensure that:

1. All relevant database operations in DatabaseService.ts are updated to use Supabase
2. Any outdated or in-memory fallback code is removed
3. Each method is thoroughly tested
4. The codebase is cleaned up for a maintainable and robust implementation

# Phase 2: Feature-by-Feature Implementation

For every feature, build a vertical slice (API route → service layer → UI) with detailed API and error handling. Each feature is described below with concrete subtasks.

## Feature 1: Create Account & Persistent Login

### Goal

Allow users to register, log in, and maintain session persistence.

### Tasks

1. **Integrate Supabase Auth UI**

   ```bash
   npm install @supabase/auth-ui-react @supabase/auth-ui-shared
   ```

   Create an authentication page:

   ```typescript
   // src/app/auth/page.tsx
   'use client';
   import { Auth } from '@supabase/auth-ui-react';
   import { ThemeSupa } from '@supabase/auth-ui-shared';
   import { supabase } from '@/lib/utils/supabaseClient';

   export default function AuthPage() {
     return (
       <div className='flex items-center justify-center min-h-screen bg-gray-100'>
         <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
       </div>
     );
   }
   ```

2. **Create an AuthContext**

   - Build `src/lib/contexts/AuthContext.tsx` to store user state
   - Use Supabase's `auth.onAuthStateChange` to update the user
   - Provide helper functions for login, logout, and accessing the current user

3. **Secure API Routes**

   - Extract and verify JWT from request headers:
     ```typescript
     const token = req.headers.get('authorization');
     const {
       data: { user },
     } = await supabase.auth.getUser(token);
     ```
   - Pass the authenticated user ID to DatabaseService calls

4. **Create a Profile on Signup**

   - After user signs up, check if their profile exists
   - If not, insert one into the profiles table using DatabaseService

5. **Update RLS Policies**

   - Ensure the migration file includes policies that restrict data access based on `auth.uid()`

6. **UI Adjustments**
   - Update the Navigation component to show "Login/Signup" when logged out
   - Show "Logout" and user info when logged in
   - Add a logout button that calls the AuthContext's logout method

### Testing

- Register a new user, log in, and verify session persistence
- Confirm the user's profile is created in the Supabase dashboard
- Ensure API routes only operate on the logged-in user's data

## Feature 2: Submit YouTube/Podcast Link & Generate Summary

### Goal

Allow users to submit a link, generate (or retrieve an existing) summary, and display video metadata.

### Tasks

1. **API Route: /api/videos/process**

   - Validate input using Zod
   - Use the extractVideoInfo utility to get the video ID
   - Call the VideoProcessingService to:
     - Check if the video exists
     - Fetch metadata from the YouTube oEmbed endpoint
     - Generate a summary via the OpenAI service
     - Save or update records in the videos and user_summaries tables
   - Return a JSON response:
     ```typescript
     {
       "data": {
         "videoId": "...",
         "summary": "...",
         "videoData": { ... }
       }
     }
     ```
   - Use try…catch and proper error handling

2. **VideoProcessingService**

   - Remove any in-memory logic
   - Use DatabaseService methods (`findVideoRecord`, `createVideoRecord`, etc.)
   - Integrate with the oEmbed endpoint to populate title, channel name, etc.

3. **UI (LinkInput & SummaryCard)**
   - On the home page, the LinkInput component should send the URL to `/api/videos/process`
   - Upon successful submission, display a new SummaryCard with:
     - Title, channel name, creation date, subscribe button, and tags
   - If the video already has a summary, re-use it

### Testing

- Submit valid and invalid YouTube URLs
- Test various formats (youtu.be, /watch, /shorts, etc.)
- Verify new records in Supabase
- Verify that duplicate submissions reuse existing summaries

## Feature 3: View and Customize Summary

### Goal

Allow users to toggle between the default summary and a detailed (or shorter) version.

### Tasks

1. **API Endpoints**

   - `/api/openai/summarize`:
     - Validate input and call OpenAI to generate a detailed summary
   - `/api/videos/summaries/update`:
     - Update the `detailed_summary` field in the user_summaries table

2. **SummaryCard Component**
   - Add a toggle button ("Show Detailed Summary" / "Show Brief Summary")
   - When clicked:
     - If `detailed_summary` exists in the database, display it
     - Otherwise, call `/api/openai/summarize` to generate one
     - Then call `/api/videos/summaries/update` to persist it
   - Use a loading state during API calls

### Testing

- Generate a summary, click the toggle, verify detailed summary appears
- Refresh the page to ensure the detailed summary is loaded from Supabase

## Feature 4: Interactive Q&A with Summary

### Goal

Allow users to ask questions directly on the summary card and receive answers from an integrated LLM.

### Tasks

1. **API Endpoint: /api/content-questions**

   - Validate the incoming request with Zod
   - Use the integrated `/api/openai/chat` route
   - Send the summary plus question as context
   - Save the question and response in the content_questions table
   - Return the response to the client

2. **SummaryCard Component**
   - Add an input field below the summary for entering a question
   - Show a loading indicator during API call
   - Display the AI's response inline once received

### Testing

- Ask a relevant question on a summary card
- Verify the answer is displayed
- Verify question/response pair is saved in the database

## Feature 5: Dashboard & Feed

### Goal

Provide a top-level page where users can submit new links and view a feed of their summaries and those from subscribed channels.

### Tasks

1. **Home Page Update (src/app/page.tsx)**

   - Ensure the top section contains the LinkInput component
   - Fetch a feed of summaries from `/api/videos/summaries`

2. **API Endpoint: /api/videos/summaries (GET)**

   - Query the user_summaries table, joining with videos for metadata
   - Return a list of summaries as `{ data: [...] }`

3. **Client Data Fetching**
   - For server components, use Next.js server-side data fetching
   - For client-side, use SWR or React Query
   - Display a loading component while fetching

### Testing

- Generate several summaries
- Navigate to `/summaries` and verify feed displays correctly
- Test refresh and error states

## Feature 6: Channel Discovery & Ranking

### Goal

Allow users to view popular channels, subscribe to them, and vote to affect ranking.

### Tasks

1. **API Endpoints**

   - `/api/channels/:id`: Retrieve channel details
   - `/api/channels/popular`: Query channels ordered by popularity metrics
   - `/api/vote`: Record upvotes/downvotes in the user_votes table
   - `/api/subscriptions`: Handle subscribing and unsubscribing

2. **UI Updates**

   - Add "Subscribe" button to SummaryCard next to channel name
   - Create channels page (`src/app/channels/page.tsx`)
   - Add voting controls (thumbs up/down icons)

3. **DatabaseService Updates**
   - Add methods for recording votes and computing channel popularity

### Testing

- Vote on channels and verify changes in user_votes table
- Confirm popular channels page shows correct ordering
- Test subscription add/remove flows

## Feature 7: Tags & Search Functionality

### Goal

Enable users to see tags on summary cards, click them to view related content, and perform dedicated searches.

### Tasks

1. **Tag Handling during Summary Creation**

   - Extract and generate tags during summary creation
   - Check/create tags in the tags table
   - Insert associations into the content_tags table

2. **SummaryCard UI**

   - Display tags prominently
   - Make tags clickable for filtered search

3. **Search Page (src/app/search/page.tsx)**
   - Create search input for keywords
   - Query database for matching summaries/videos
   - Display search suggestions from existing tags
   - Show results using SummaryCard component

### Testing

- Verify tag navigation works
- Test keyword searches
- Validate search result relevance

## Feature 8: Automated Content Updates & Notifications

### Goal

Periodically check for new content and send daily email digests.

### Tasks

1. **Automated Content Update Script**

   ```typescript
   // scripts/update-content.ts
   ```

   - Iterate over channels in database
   - Check for new content using YouTube APIs/RSS feeds
   - Trigger summary generation for new content
   - Schedule using cron jobs or serverless functions

2. **Email Notifications**
   - Integrate email provider (e.g., SendGrid)
   - Create `/api/notifications/daily` endpoint
   - Generate and send digest emails
   - Track sent emails in daily_digest table

### Testing

- Run update script manually
- Verify new video detection
- Test email generation and sending
- Verify cron job execution

# Best Practices & Reminders

1. **Supabase Client**

   - Always import from `src/lib/utils/supabaseClient.ts`

2. **Error Handling**

   - Use try/catch in API routes and DatabaseService
   - Log errors with logger
   - Re-throw as AppError with appropriate codes

3. **API Route Structure**

   - Validate input using Zod
   - Call service functions
   - Return `{ data: ... }` or `{ error: ... }`

4. **Data Fetching**

   - Prefer server components when possible
   - Benefit from SSR and caching

5. **Authentication**

   - Use `@supabase/auth-ui-react` for UI
   - Build AuthContext
   - Verify JWT in API routes

6. **RLS Policies**

   - Define policies for all tables in migration file

7. **Testing**

   - Write unit tests (Jest)
   - Test features manually
   - Check Supabase dashboard

8. **Version Control**
   - Use small, incremental commits
   - Write clear commit messages
   - Work on feature branches

By following this comprehensive plan—with concrete API examples, detailed sub-tasks for each feature, and explicit testing checkpoints—you ensure that every piece of the project is built in a maintainable, consistent, and testable manner. This plan now covers all eight features (including channel discovery, tag-based search, and automated updates/notifications) in full detail so that even a junior developer can follow along without missing critical elements.
