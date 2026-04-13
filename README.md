# AI Code Reviewer

An AI-powered code review web application that provides constructive criticism on GitHub repositories and can make AI-assisted code changes directly to your repositories.

## Features

- 🔐 **GitHub OAuth Authentication** - Secure login with your GitHub account
- 🤖 **AI-Powered Reviews** - Get constructive feedback using OpenAI or Anthropic LLMs
- 🔍 **Code Review** - Submit any GitHub repository for AI analysis
- ✏️ **Code Modifications** - Request AI to make changes to your codebase
- 🔀 **PR/Commit Support** - Submit changes as PRs or direct commits
- 📊 **Review History** - Track all your past reviews and changes
- 🎨 **Modern UI** - Built with Next.js 16, Tailwind CSS 4, and Shadcn/UI

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + Lucide Icons
- **Authentication:** NextAuth.js with GitHub OAuth
- **Database:** PostgreSQL with Prisma ORM
- **AI Integration:** OpenAI GPT-4 / Anthropic Claude (configurable)
- **GitHub API:** Octokit
- **State Management:** TanStack React Query
- **Deployment:** Vercel (recommended)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or use Supabase/Neon)
- GitHub OAuth App credentials
- OpenAI or Anthropic API key

## Getting Started

### 1. Clone and Install

```bash
cd ai-code-reviewer
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your credentials:

```bash
copy .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# GitHub OAuth (create at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# GitHub Personal Access Token (https://github.com/settings/tokens)
# Scopes: repo, user
GITHUB_PAT=your_pat_token

# OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo

# OR Anthropic (https://console.anthropic.com/settings/keys)
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Set Up Database

Run Prisma migrations to create the database schema:

```bash
npm run db:migrate
```

Or push the schema directly:

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database (dev only)
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:reset     # Reset database
```

## Project Structure

```
ai-code-reviewer/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth routes (login, etc.)
│   │   ├── (dashboard)/          # Dashboard routes
│   │   └── api/                  # API routes
│   │       └── auth/             # NextAuth endpoints
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   ├── providers/            # Context providers
│   │   ├── review/               # Review-specific components
│   │   └── layout/               # Layout components
│   ├── lib/                      # Utilities and configs
│   │   ├── auth.ts               # Auth helpers
│   │   ├── prisma.ts             # Database client
│   │   └── utils.ts              # General utilities
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # Business logic services
│   └── types/                    # TypeScript types
├── prisma/
│   └── schema.prisma             # Database schema
└── .env.local                    # Environment variables (gitignored)
```

## Database Schema

The app uses three main models:

- **User** - User accounts with GitHub linkage
- **Review** - Code review records with LLM responses
- **Prompt** - Code modification requests with change history

## Authentication Flow

1. User clicks "Sign in with GitHub"
2. GitHub OAuth redirects to your app
3. NextAuth creates/updates user in database
4. User is redirected to dashboard with session

## Next Steps

### Phase 2: GitHub Integration
- Repository validation and access checking
- File structure retrieval
- Smart file selection
- Rate limiting handling

### Phase 3: LLM Integration
- OpenAI and Anthropic provider setup
- Prompt engineering for code review
- Code modification parsing
- Token management

### Phase 4-12: See implementation-plan.md

## Setting Up GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** AI Code Reviewer
   - **Homepage URL:** http://localhost:3000
   - **Authorization callback URL:** http://localhost:3000/api/auth/callback/github
4. Copy the Client ID and Client Secret to `.env.local`
5. Generate a Personal Access Token at https://github.com/settings/tokens with scopes: `repo`, `user`

## Troubleshooting

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Ensure your PostgreSQL server is running
- Check firewall/antivirus if using cloud database

### OAuth Error
- Verify callback URL matches exactly: `http://localhost:3000/api/auth/callback/github`
- Check `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Ensure OAuth app has correct permissions

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Run `npm run db:generate` to regenerate Prisma client
- Clear `.next` folder: `rm -rf .next` (or `rmdir /s .next` on Windows)

## License

MIT

## Contributing

Contributions are welcome! Please read the implementation plan in `implementation-plan.md` for the full roadmap.
