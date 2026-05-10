# Implementation Plan: AI Code Review & Modification WebApp

## Project Overview

A web application that allows users to:
1. Submit GitHub repository links for AI-powered code review and constructive criticism
2. Prompt an AI agent to make changes to their codebase
3. Allow the AI agent to commit changes or submit PRs directly to their repositories

**Tech Stack:**
- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend:** Next.js API Routes (Serverless)
- **AI Integration:** OpenAI API / Anthropic Claude API (configurable)
- **Database:** PostgreSQL (via Supabase or Neon)
- **ORM:** Prisma
- **Authentication:** NextAuth.js (GitHub OAuth)
- **File Processing:** Octokit (GitHub REST API client)
- **State Management:** React Query (TanStack Query)
- **Deployment:** Vercel

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project Structure
- [ ] Create Next.js 14+ app with TypeScript: `npx create-next-app@latest ai-code-reviewer --typescript --tailwind --app`
- [ ] Set up project directory structure:
  ```
  ai-code-reviewer/
  ├── src/
  │   ├── app/                    # Next.js App Router
  │   │   ├── (auth)/             # Auth routes group
  │   │   ├── (dashboard)/        # Dashboard routes group
  │   │   └── api/                # API routes
  │   ├── components/             # React components
  │   │   ├── ui/                 # Shadcn UI components
  │   │   ├── review/             # Review-specific components
  │   │   └── layout/             # Layout components
  │   ├── lib/                    # Utilities
  │   │   ├── github.ts           # GitHub API helpers
  │   │   ├── llm.ts              # LLM integration helpers
  │   │   └── utils.ts            # General utilities
  │   ├── hooks/                  # Custom React hooks
  │   ├── services/               # Business logic services
  │   └── types/                  # TypeScript type definitions
  ├── prisma/                     # Database schema
  └── public/                     # Static assets
  ```
- [ ] Install core dependencies:
  ```bash
  npm install @octokit/rest @octokit/types
  npm install openai @anthropic-ai/sdk
  npm install next-auth @next-auth/prisma-adapter
  npm install @prisma/client
  npm install @tanstack/react-query
  npm install zod
  npm install clsx tailwind-merge
  ```
- [ ] Install dev dependencies:
  ```bash
  npm install -D prisma
  npm install -D @types/node @types/react
  ```

### 1.2 Configure Environment Variables
- [ ] Create `.env.local` template:
  ```env
  # GitHub OAuth
  GITHUB_CLIENT_ID=
  GITHUB_CLIENT_SECRET=
  GITHUB_PAT=                    # Personal Access Token for repo access
  
  # LLM Providers (at least one required)
  OPENAI_API_KEY=
  OPENAI_MODEL=gpt-4-turbo
  ANTHROPIC_API_KEY=
  ANTHROPIC_MODEL=claude-3-sonnet-20240229
  
  # Database
  DATABASE_URL=
  
  # NextAuth
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=http://localhost:3000
  
  # App Config
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```

### 1.3 Set Up Database Schema
- [ ] Initialize Prisma: `npx prisma init`
- [ ] Define schema in `prisma/schema.prisma`:
  ```prisma
  model User {
    id            String    @id @default(cuid())
    email         String?   @unique
    name          String?
    image         String?
    githubId      String?   @unique
    accessToken   String?   // GitHub OAuth token
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt
    reviews       Review[]
    prompts       Prompt[]
  }

  model Review {
    id            String    @id @default(cuid())
    userId        String
    user          User      @relation(fields: [userId], references: [id])
    repoUrl       String
    repoOwner     String
    repoName      String
    branch        String    @default("main")
    reviewPrompt  String?   // Custom review instructions
    llmResponse   String    @db.Text
    modelUsed     String
    createdAt     DateTime  @default(now())
    prompts       Prompt[]
  }

  model Prompt {
    id            String    @id @default(cuid())
    userId        String
    user          User      @relation(fields: [userId], references: [id])
    reviewId      String?
    review        Review?   @relation(fields: [reviewId], references: [id])
    userInput     String    @db.Text
    llmResponse   String    @db.Text
    changesMade   Json?     // Files changed, diff
    prUrl         String?
    commitSha     String?
    createdAt     DateTime  @default(now())
  }
  ```
- [ ] Run migration: `npx prisma migrate dev --name init`
- [ ] Generate Prisma Client: `npx prisma generate`

### 1.4 Configure Authentication (NextAuth.js)
- [ ] Create `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Configure GitHub OAuth provider
- [ ] Set up Prisma adapter
- [ ] Implement session management
- [ ] Create auth utilities and middleware
- [ ] Request necessary OAuth scopes: `repo`, `user`

---

## Phase 2: GitHub Integration

### 2.1 GitHub API Service Setup
- [ ] Create `src/lib/github.ts` with Octokit initialization
- [ ] Implement authentication helper:
  ```typescript
  function getOctokitInstance(accessToken: string): Octokit
  ```

### 2.2 Repository Access & Validation
- [ ] Create API route: `POST /api/github/validate-repo`
  - Accepts GitHub repo URL
  - Validates URL format
  - Extracts owner and repo name
  - Checks if repository exists and is accessible
  - Returns repo metadata (name, description, default branch, size)
- [ ] Implement repository fetching logic:
  ```typescript
  async function getRepositoryInfo(owner: string, repo: string, token: string)
  async function checkRepositoryAccess(owner: string, repo: string, token: string)
  ```

### 2.3 File Structure Retrieval
- [ ] Create API route: `POST /api/github/fetch-repo-structure`
  - Fetches repository tree/file structure
  - Limits depth to avoid rate limits (configurable, default 3 levels)
  - Returns structured JSON of file tree
- [ ] Implement file content fetching:
  ```typescript
  async function getFileContent(owner: string, repo: string, path: string, ref: string, token: string)
  async function getRepositoryTree(owner: string, repo: string, ref: string, token: string)
  ```
- [ ] Add smart file selection:
  - Prioritize important files: README, package.json, requirements.txt, etc.
  - Identify main source files
  - Avoid large binary files, lock files, node_modules

### 2.4 Rate Limiting & Error Handling
- [ ] Implement GitHub API rate limit checker
- [ ] Add retry logic with exponential backoff
- [ ] Handle common GitHub API errors:
  - 404 (repo not found / no access)
  - 403 (rate limit exceeded)
  - 401 (invalid token)
  - 422 (invalid ref/path)
- [ ] Create user-friendly error messages

---

## Phase 3: LLM Integration

### 3.1 LLM Service Architecture
- [ ] Create `src/lib/llm.ts` base configuration
- [ ] Implement provider abstraction:
  ```typescript
  interface LLMProvider {
    chatCompletion(messages: ChatMessage[], options?: LLMOptions): Promise<string>
    streamingCompletion(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void>
  }
  ```
- [ ] Create OpenAI provider implementation
- [ ] Create Anthropic provider implementation
- [ ] Add provider selection logic based on environment/config

### 3.2 Code Review Prompt Engineering
- [ ] Design system prompt for code review:
  ```
  You are an expert software engineer conducting code reviews.
  Analyze the provided codebase and provide constructive criticism.
  Focus on:
  - Code quality and best practices
  - Architecture and design patterns
  - Security vulnerabilities
  - Performance optimizations
  - Error handling
  - Testing coverage
  - Documentation
  - Potential bugs or edge cases
  
  Format your response with:
  1. Overall assessment
  2. Strengths
  3. Areas for improvement (with specific file references)
  4. Specific recommendations with code examples
  5. Priority ranking of issues (Critical, High, Medium, Low)
  ```
- [ ] Design context assembly helper:
  ```typescript
  function buildReviewContext(fileTree: FileNode[], fileContents: FileContent[], customPrompt?: string): ChatMessage[]
  ```

### 3.3 Code Modification Prompt Engineering
- [ ] Design system prompt for code changes:
  ```
  You are an expert software engineer tasked with making specific changes to a codebase.
  Only modify what is necessary. Follow best practices and maintain consistency.
  
  Return changes in the following format:
  [FILE: path/to/file.ext]
  [ACTION: create|modify|delete]
  [CONTENT]
  ... file content ...
  [/CONTENT]
  [/FILE]
  ```
- [ ] Implement response parser to extract file changes
- [ ] Add validation to ensure changes are properly formatted

### 3.4 Token Management & Context Window Handling
- [ ] Implement token counter (estimate or use tiktoken)
- [ ] Create context truncation logic:
  - Prioritize important files
  - Split large files
  - Skip irrelevant files when approaching limits
- [ ] Add streaming support for long responses
- [ ] Handle context window exceeded errors gracefully

### 3.5 API Routes for LLM Operations
- [ ] Create `POST /api/review` endpoint
  - Input: repo URL, optional custom prompt
  - Process: fetch files → build context → call LLM → return response
  - Output: structured review response
- [ ] Create `POST /api/prompt` endpoint
  - Input: repo URL, user prompt, permission flags
  - Process: fetch files → build context → call LLM → parse changes → optionally commit
  - Output: LLM response + change summary + commit/PR info

---

## Phase 4: Frontend - Core UI

### 4.1 Install & Configure UI Library
- [ ] Initialize Shadcn/UI: `npx shadcn@latest init`
- [ ] Install required components: Button, Input, Textarea, Card, Dialog, Toast, Badge, Tabs, Select, Checkbox, Alert
- [ ] Configure Tailwind theme and custom styles

### 4.2 Layout Components
- [ ] Create root layout with auth provider wrapper
- [ ] Build `Header` component:
  - App logo/name
  - Navigation links
  - User profile dropdown (login/logout)
- [ ] Build `Footer` component
- [ ] Create responsive navigation

### 4.3 Authentication UI
- [ ] Create login page with "Sign in with GitHub" button
- [ ] Build protected route wrapper/HOC
- [ ] Add loading states during auth
- [ ] Implement session display component

### 4.4 Landing Page
- [ ] Create `src/app/page.tsx` (public)
  - Hero section with app description
  - Features list
  - How it works section
  - CTA to start reviewing
  - Login prompt
- [ ] Style with modern, clean design
- [ ] Make fully responsive

### 4.5 Dashboard Layout
- [ ] Create dashboard layout wrapper for authenticated users
- [ ] Build sidebar or top navigation
- [ ] Add review history navigation
- [ ] Create main dashboard view with:
  - Recent reviews list
  - Quick repo input form
  - Stats (total reviews, prompts made, etc.)

---

## Phase 5: Review Feature Implementation

### 5.1 Repository Input Component
- [ ] Create `RepoInputForm` component:
  - Text input for GitHub URL
  - URL validation (format check)
  - "Validate" button with loading state
  - Repo preview card after validation (name, description, stars, default branch)
  - Error display
- [ ] Add real-time URL validation feedback
- [ ] Handle invalid/unaccessible repos gracefully

### 5.2 Review Request Form
- [ ] Create `ReviewForm` component:
  - Validated repo URL (pre-filled)
  - Branch selector (dropdown, defaults to main)
  - Custom review prompt (optional textarea)
  - Pre-filled context suggestions:
    - "General code review"
    - "Security audit"
    - "Performance review"
    - "Architecture review"
    - "Best practices check"
  - Submit button
- [ ] Add form validation
- [ ] Implement loading/progress states

### 5.3 Review Results Display
- [ ] Create `ReviewResults` component:
  - Repo info header
  - Review summary section
  - Markdown rendering of LLM response (use `react-markdown`)
  - Code syntax highlighting (use `react-syntax-highlighter` or `shiki`)
  - Issue severity badges
  - File reference links
- [ ] Add copy-to-clipboard functionality
- [ ] Implement export options (Markdown, PDF)

### 5.4 Review API Integration
- [ ] Create `useReview` hook using React Query
- [ ] Implement optimistic UI updates
- [ ] Add error boundaries and retry logic
- [ ] Handle long-running requests with:
  - Progress indicators
  - Timeout handling
  - "This may take a while" messaging

### 5.5 Review History
- [ ] Create `ReviewHistory` component
- [ ] List past reviews with:
  - Repo name
  - Date
  - Brief summary
  - Link to full review
- [ ] Add pagination or infinite scroll
- [ ] Implement search/filter functionality

---

## Phase 6: Code Modification Feature

### 6.1 Prompt Interface
- [ ] Create `CodePromptForm` component:
  - Repo URL display (read-only, from selected review)
  - Branch selector
  - Textarea for modification instructions
  - Permission checkboxes:
    - ☐ Allow commits to main branch
    - ☐ Create pull request instead
    - ☐ Show diff before committing
  - Warning banner for destructive operations
  - Submit button
- [ ] Add clear warnings about permissions:
  - "Allowing direct commits will modify your repository without further approval"
  - "Pull requests allow you to review changes before merging"
- [ ] Implement instruction templates:
  - "Fix bug in [file/function]"
  - "Add feature: [description]"
  - "Refactor [specific part]"
  - "Update dependencies"

### 6.2 Change Preview & Diff Viewer
- [ ] Create `DiffViewer` component:
  - Side-by-side diff display
  - Syntax highlighting
  - File-by-file navigation
  - Summary of changes (files added/modified/deleted)
- [ ] Use `diff` library or parse unified diff format
- [ ] Implement approve/reject workflow (if diff preview enabled)

### 6.3 Commit & PR Creation Service
- [ ] Create `src/services/github-commits.ts`:
  ```typescript
  async function commitChanges(
    owner: string,
    repo: string,
    branch: string,
    changes: FileChange[],
    commitMessage: string,
    token: string
  ): Promise<{ commitSha: string; commitUrl: string }>
  ```
- [ ] Implement branch creation if needed:
  ```typescript
  async function createBranch(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string,
    token: string
  ): Promise<void>
  ```
- [ ] Create PR creation service:
  ```typescript
  async function createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    headBranch: string,
    baseBranch: string,
    token: string
  ): Promise<{ prUrl: string; prNumber: number }>
  ```
- [ ] Handle multiple file changes in single commit
- [ ] Implement proper Git tree manipulation for complex changes

### 6.4 Action Confirmation Flow
- [ ] Create `ConfirmAction` dialog:
  - Summary of proposed changes
  - List of files to be modified
  - Commit message preview
  - Permission reminder
  - Explicit "Confirm" button
  - "Cancel" option
- [ ] Double-confirm for direct main branch commits
- [ ] Store confirmation in database

### 6.5 Modification API Integration
- [ ] Create `useCodePrompt` hook
- [ ] Implement multi-step flow:
  1. Submit prompt → Get LLM response with changes
  2. Show diff preview (if enabled)
  3. Confirm action
  4. Execute commit/PR
  5. Display result with links
- [ ] Add progress indicators for each step
- [ ] Handle partial failures (some files fail)
- [ ] Rollback information if applicable

---

## Phase 7: Advanced Features

### 7.1 Streaming Responses
- [ ] Implement Server-Sent Events (SSE) or streaming API responses
- [ ] Create `StreamingText` component with typewriter effect
- [ ] Add loading cursor animation
- [ ] Handle connection drops and retries

### 7.2 Conversation History
- [ ] Implement follow-up prompts on existing reviews
- [ ] Create chat-like interface for iterative refinement
- [ ] Store conversation thread in database
- [ ] Add context from previous exchanges to LLM prompts

### 7.3 File Selection & Scope Control
- [ ] Create file tree browser component
- [ ] Allow users to select specific files/folders for review
- [ ] Add file type filters
- [ ] Implement "smart select" recommendations

### 7.4 Custom Review Templates
- [ ] Allow users to save custom review prompts
- [ ] Create template library:
  - Security-focused review
  - Performance review
  - Accessibility review
  - Documentation review
- [ ] Template management UI (create, edit, delete)

### 7.5 Notifications & Webhooks
- [ ] Email notifications for completed reviews
- [ ] Webhook integration for PR status updates
- [ ] In-app notification system

---

## Phase 8: Security & Permissions

### 8.1 GitHub Token Security
- [ ] Implement secure token storage (encrypted at rest)
- [ ] Token refresh logic for OAuth tokens
- [ ] Minimum required OAuth scopes
- [ ] Clear documentation on permissions needed
- [ ] Token revocation handling

### 8.2 Permission Management
- [ ] Explicit permission gates for destructive actions:
  - Direct commits
  - Branch creation
  - PR creation
- [ ] Permission audit log
- [ ] User confirmation records in database
- [ ] "Dry run" mode to preview without executing

### 8.3 Input Validation & Sanitization
- [ ] Validate all user inputs with Zod schemas
- [ ] Sanitize LLM responses before execution
- [ ] Rate limiting on API endpoints
- [ ] Prevent injection attacks in prompts
- [ ] Validate file paths to prevent directory traversal

### 8.4 Data Privacy
- [ ] Encrypt sensitive data in database
- [ ] Clear data retention policies
- [ ] User data deletion endpoints (GDPR compliance)
- [ ] Don't log API keys or tokens
- [ ] Secure environment variable handling

---

## Phase 9: Testing

### 9.1 Unit Tests
- [ ] Set up Vitest or Jest
- [ ] Test GitHub API service functions
- [ ] Test LLM provider implementations
- [ ] Test utility functions (URL parsing, token counting)
- [ ] Test validation schemas

### 9.2 Integration Tests
- [ ] Test API routes with mocked LLM responses
- [ ] Test GitHub API integration (use mock server or test repos)
- [ ] Test database operations
- [ ] Test authentication flow

### 9.3 Component Tests
- [ ] Set up React Testing Library
- [ ] Test form submissions
- [ ] Test error states
- [ ] Test loading states
- [ ] Test diff viewer rendering

### 9.4 E2E Tests
- [ ] Set up Playwright
- [ ] Test full review flow
- [ ] Test code modification flow
- [ ] Test authentication
- [ ] Test permission flows

---

## Phase 10: Deployment & DevOps

### 10.1 Development Environment
- [ ] Set up local development with environment variables
- [ ] Configure Docker for database (optional)
- [ ] Create seed scripts for test data
- [ ] Document local setup process

### 10.2 Production Setup
- [ ] Configure Vercel project
- [ ] Set up production environment variables
- [ ] Configure production database
- [ ] Set up custom domain
- [ ] Enable analytics (Vercel Analytics, etc.)

### 10.3 CI/CD Pipeline
- [ ] GitHub Actions workflow:
  - Run tests on PR
  - Run linting and type checking
  - Auto-deploy on merge to main
- [ ] Preview deployments for PRs
- [ ] Database migration automation

### 10.4 Monitoring & Logging
- [ ] Set up error tracking (Sentry)
- [ ] Implement structured logging
- [ ] Monitor API rate limits
- [ ] Track LLM API usage and costs
- [ ] Performance monitoring

---

## Phase 11: Documentation & Polish

### 11.1 User Documentation
- [ ] Create comprehensive README
- [ ] How-to guides:
  - Getting started
  - Running your first review
  - Making code changes safely
  - Understanding permissions
- [ ] FAQ section
- [ ] Troubleshooting guide

### 11.2 Developer Documentation
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Contribution guidelines
- [ ] Code style guide

### 11.3 UI Polish
- [ ] Add micro-interactions and animations
- [ ] Implement skeleton loading states
- [ ] Add empty states for all views
- [ ] Ensure accessibility (WCAG AA)
- [ ] Test on multiple browsers and devices
- [ ] Dark mode support

### 11.4 Onboarding Flow
- [ ] First-time user tutorial
- [ ] Connect GitHub account walkthrough
- [ ] Sample review demonstration
- [ ] Permission explanation modals
- [ ] Quick start guide

---

## Phase 12: Future Enhancements (Post-MVP)

### 12.1 Advanced Features
- [ ] Support for GitLab, Bitbucket
- [ ] Multi-file conversation threads
- [ ] Automated testing integration
- [ ] Code complexity metrics
- [ ] Historical review comparison
- [ ] Team collaboration features

### 12.2 AI Improvements
- [ ] Multi-model comparison
- [ ] Fine-tuned models for specific review types
- [ ] RAG (Retrieval Augmented Generation) for large codebases
- [ ] Agentic behavior for complex multi-step changes
- [ ] Cost optimization with model selection

### 12.3 Platform Features
- [ ] Subscription/billing system
- [ ] Usage quotas and pricing tiers
- [ ] Organization/team accounts
- [ ] Public review sharing
- [ ] API for third-party integrations

---

## Implementation Order & Dependencies

```
Phase 1: Project Setup & Infrastructure (Week 1)
  └─ Phase 2: GitHub Integration (Week 1-2)
      └─ Phase 3: LLM Integration (Week 2-3)
          ├─ Phase 4: Frontend - Core UI (Week 2-3)
          ├─ Phase 5: Review Feature (Week 3-4)
          └─ Phase 6: Code Modification (Week 4-5)
              ├─ Phase 7: Advanced Features (Week 5-6)
              ├─ Phase 8: Security & Permissions (Ongoing)
              ├─ Phase 9: Testing (Week 6)
              └─ Phase 10: Deployment (Week 6-7)
                  └─ Phase 11: Documentation & Polish (Week 7)
                      └─ Phase 12: Future Enhancements (Post-MVP)
```

**Total Estimated Time: 6-8 weeks for MVP**

---

## Key Technical Decisions

1. **Why Next.js App Router?** - Server components reduce client bundle, better SEO, native API routes
2. **Why Prisma?** - Type-safe database queries, easy migrations, excellent DX
3. **Why Multiple LLM Providers?** - Flexibility, cost optimization, fallback options
4. **Why GitHub OAuth?** - Secure, familiar auth flow, proper permission scoping
5. **Why Vercel?** - Zero-config Next.js deployment, edge functions, easy env management

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| GitHub API rate limits | Implement caching, request optimization, user token usage |
| Large repo context windows | Smart file selection, RAG, chunking strategies |
| LLM hallucination in code changes | Validation, dry-run mode, diff preview, user confirmation |
| Token/cost management | Usage tracking, model selection, context optimization |
| Security concerns with auto-commits | Explicit permissions, audit logs, confirmation gates |
| Complex Git operations | Use Octokit's high-level APIs, limit scope initially |

---

## Quick Start Commands

```bash
# 1. Create project
npx create-next-app@latest ai-code-reviewer --typescript --tailwind --app
cd ai-code-reviewer

# 2. Install dependencies
npm install @octokit/rest openai @anthropic-ai/sdk next-auth @prisma/client @tanstack/react-query zod
npm install -D prisma

# 3. Setup database
npx prisma init
# (edit schema.prisma)
npx prisma migrate dev --name init

# 4. Setup Shadcn UI
npx shadcn@latest init

# 5. Start development
npm run dev
```

---

## Success Metrics

- [ ] User can authenticate with GitHub
- [ ] User can submit a repo URL and receive code review
- [ ] User can prompt for specific changes
- [ ] User can preview changes as diffs
- [ ] User can authorize commits to main branch
- [ ] User can authorize PR creation
- [ ] All actions are logged and auditable
- [ ] App handles errors gracefully
- [ ] UI is responsive and accessible
- [ ] Documentation is comprehensive

---

*Last Updated: April 13, 2026*
