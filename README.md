# YouTube/Podcast Summary Platform

A modern web application that enables users to obtain AI-generated summaries of YouTube videos and podcasts. Built with Next.js 14, TypeScript, and AI integration.

## Features

- 🎥 **Video/Podcast Processing**: Submit YouTube videos or podcast links for automatic summarization
- 🤖 **AI-Powered Summaries**: Generate concise and detailed summaries using advanced AI models
- 🏷️ **Smart Tagging**: Automatic tag generation for better content organization
- 💬 **Interactive Q&A**: Ask specific questions about the content
- 📱 **Responsive Design**: Modern UI built with Tailwind CSS
- 🔄 **Real-time Updates**: Live processing status and notifications

## Tech Stack

- **Frontend**: React with Next.js 14 App Router
- **Styling**: TailwindCSS
- **Database**: Supabase
- **Authentication**: Supabase Auth (configurable)
- **AI Services**:
  - OpenAI (GPT models, Whisper)
  - Anthropic
  - Replicate
  - Deepgram
- **Development**: TypeScript, ESLint, Prettier

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API route handlers
│   ├── summaries/        # Summaries page
│   ├── components/       # Page-specific components
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # Shared UI components
│   └── ui/               # UI components
└── lib/                  # Core libraries and utilities
    ├── contexts/         # React contexts
    ├── services/         # Service layer
    ├── types/           # TypeScript types
    └── utils/           # Utility functions
```

## Getting Started

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd [project-name]
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with the following variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   REPLICATE_API_KEY=your_replicate_key
   DEEPGRAM_API_KEY=your_deepgram_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Routes

The application exposes several API endpoints:

- `/api/videos/process`: Process new video/podcast URLs
- `/api/videos/summaries`: Retrieve and manage summaries
- `/api/openai/chat`: Handle chat completions
- `/api/openai/summarize`: Generate detailed summaries
- `/api/youtube/transcript`: Fetch YouTube transcripts

## Database Schema

The application uses a comprehensive database schema including:

- `profiles`: User profiles and preferences
- `channels`: Channel information for YouTube and podcasts
- `content`: Unified storage for videos and podcast episodes
- `summaries`: AI-generated content summaries
- `tags`: Content categorization and organization
- `subscriptions`: User channel subscriptions
- `user_votes`: Channel rating system

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI services powered by OpenAI, Anthropic, and Replicate
- Database and authentication by Supabase
- UI components styled with Tailwind CSS
