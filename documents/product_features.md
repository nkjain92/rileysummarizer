# YouTube/Podcast Summary Platform

## 1. Create Account & Persistent Login

- Users should be able to create an account and log in.
- Once logged in, users shouldn’t have to log in multiple times on the same browser.

## 2. Submit YouTube/Podcast Link & Generate Summary

- After creating an account, users should be able to submit a YouTube link (or podcast link, which may be of various types).
- The system should generate a summary for that particular video or podcast.
- On the summary card, the user should see:
  - The name/title of the video or podcast.
  - The channel name and channel ID.
  - The creation date of the video or podcast.
  - A subscribe button next to the channel for notifications on the latest content.
- If the summary for a video has already been generated, display the existing summary to save on API/LLM costs.

## 3. View and Customize Summary

- Users should be able to view the default generated summary.
- Users should also have the option to see a more detailed summary or a shorter summary on the same summary card.

## 4. Interactive Q&A with Summary

- After reading a summary, users should be able to ask specific questions related to that video or podcast.
- An integrated LLM should provide answers based on the content.

## 5. Dashboard & Feed

- When users log in, the top screen should provide an input field to submit a YouTube or podcast link for summary generation.
- Below the input, users should see a feed of all their previously generated summaries and summaries from channels they’ve subscribed to.

## 6. Channel Discovery & Ranking

- There should be a page listing all popular channels (both YouTube and podcasts) where users can:
  - Subscribe to channels to see only summaries from those channels.
  - Upvote or downvote channels, establishing a ranking.
  - Click on a channel to view any existing summaries for that channel.

## 7. Tags & Search Functionality

- Each summary card should display tags extracted from the video or podcast.
- Clicking on a tag should open a search page displaying other videos/podcasts with the same tag.
- There should be a dedicated search page where users can search for videos or podcasts using terms from the summaries or tags, with tag suggestions from the database to facilitate search.

## 8. Automated Content Updates & Notifications

- A cron job should periodically check for new videos or podcasts in all channels on the platform.
- Users should receive a daily email listing new content summaries from their subscribed channels.
- If there is no new content for a user on a given day, no email should be sent.
