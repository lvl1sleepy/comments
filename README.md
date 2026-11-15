# Nested Comments Platform

A full-stack discussion application built around **arbitrarily nested comments**, with lazy-loaded replies, cursor-based pagination, author-only mutations, and PostgreSQL-backed integrity constraints.

The main focus is the **design, correctness, and performance of a threaded comment system**—not a general-purpose social network.

**Repository:** [lvl1sleepy/comments](https://github.com/lvl1sleepy/comments)

> **Project status:** Frontend (`client-v2`) and backend (`server-v2`) source code are available on GitHub. **Not deployed yet.** To explore the application, follow the local setup instructions below; there is currently no public live demo.

## Highlights

- **Nested threads:** Reply to a comment at any depth; expand individual branches on demand.
- **Independent pagination:** Load more top-level comments or replies without fetching the entire tree.
- **Comment lifecycle:** Create, edit, and soft-delete comments; deleted parents retain their reply threads.
- **Authentication and ownership:** Register/login with JWT authentication; only authors can edit or delete their own comments.
- **Database integrity:** Foreign keys ensure replies reference comments in the same post; indexed parent/child lookups support pagination.
- **GraphQL performance:** Request-scoped DataLoader batches author lookups; query depth, alias count, and estimated complexity are limited.
- **Resilience:** Rate limiting, CORS, Helmet, request IDs, error handling, and graceful server shutdown.
- **Automated tests:** Backend security/database/authorization tests and frontend component/hook tests.

## Tech Stack

| Layer                  | Technologies                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Frontend               | React, TypeScript, Vite, React Router, TanStack Query, CSS Modules                           |
| Backend                | Node.js, Express, TypeScript, GraphQL Yoga                                                   |
| Database               | PostgreSQL, `pg`, SQL migrations via `node-pg-migrate`                                       |
| Authentication         | Argon2 password hashing, JWT (`jose`)                                                        |
| Security & performance | DataLoader, GraphQL query complexity/depth/alias limits, Express rate limiting, Helmet, CORS |
| Testing                | Node.js test runner, Supertest, Vitest, React Testing Library                                |

## Architecture

```text
React UI (client-v2)
   │
   ├── React Router                 → posts feed / post details
   ├── TanStack Query               → caching, pagination, mutations
   └── GraphQL HTTP client
          │
          ▼
Express + GraphQL Yoga (server-v2)
   ├── Middleware                   → CORS, rate limiting, Helmet, request IDs
   ├── GraphQL schema & resolvers   → queries, mutations, authorization
   ├── Services                     → validation and business rules
   ├── Repositories                 → parameterized SQL
   └── PostgreSQL                   → users, posts, comments
```

Comments use an **adjacency-list model**: each comment has a `post_id` and an optional `parent_id`. A `NULL` parent denotes a top-level comment. A composite foreign key on `(post_id, parent_id)` enforces that replies belong to the same post as their parent.

To keep reads bounded, the API fetches top-level comments and **direct replies** separately. Each level has its own cursor and page size. The frontend recursively renders `CommentItem`, but only fetches a branch when the user expands it.

## Repository Structure

```text
comments/
├── client-v2/                  # React + TypeScript frontend
│   └── src/
│       ├── api/               # Shared GraphQL transport and errors
│       ├── components/        # Shared UI states
│       ├── features/
│       │   ├── auth/
│       │   ├── comments/      # Queries, mutations, hooks, recursive UI
│       │   └── posts/
│       ├── layouts/
│       └── pages/
├── server-v2/                  # TypeScript GraphQL API
│   ├── migrations/            # Database schema and index migrations
│   └── src/
│       ├── auth/
│       ├── db/
│       ├── graphql/
│       ├── middleware/
│       ├── repositories/
│       ├── services/
│       ├── tests/
│       └── utils/
├── client/                     # Earlier iteration (retained)
└── server/                     # Earlier iteration (retained)
```

This README describes **`client-v2` and `server-v2`**. The older `client/` and `server/` directories are not needed to run the current application.

## Getting Started

### Prerequisites

- Node.js and npm compatible with the project's installed dependencies
- PostgreSQL running locally (default port `5432`)
- A PostgreSQL role with permission to create and access the application databases

### 1. Clone the repository

```bash
git clone https://github.com/lvl1sleepy/comments.git
cd comments
```

### 2. Create the databases

Create a PostgreSQL role (for example, `comments_app`) and two databases:

- `comments_dev` — local development
- `comments_test` — isolated backend integration tests

Make the application role the owner of both databases. Do **not** run integration tests against your development or production database.

### 3. Configure and start the backend

```bash
cd server-v2
npm ci
```

Create `server-v2/.env` with values appropriate for your PostgreSQL installation:

```dotenv
DATABASE_URL=postgresql://comments_app:YOUR_PASSWORD@127.0.0.1:5432/comments_dev
JWT_SECRET=REPLACE_WITH_64_HEX_CHARACTERS
PORT=4000
CORS_ORIGINS=http://localhost:5173
GRAPHQL_RATE_LIMIT=100
```

Generate a JWT secret using `openssl rand -hex 32`. Keep `.env` out of version control.

**On a fresh database**, run the SQL migrations. The migration CLI needs the database URL in its shell environment (loading `.env` into the application alone does not necessarily configure the CLI):

```bash
# From server-v2; export DATABASE_URL for your development database first
npx node-pg-migrate up -m migrations
npm run dev
```

> **Existing database?** The `001_baseline.sql` migration describes the initial schema. Do not reapply it to populated tables; reconcile migration history first. The baseline was originally adopted in development using the migration tool's `--fake` workflow.

Backend endpoints:

- GraphQL API: `http://localhost:4000/graphql`
- Health check: `http://localhost:4000/health`

### 4. Configure and start the frontend

Open a second terminal:

```bash
cd client-v2
npm ci
```

Create `client-v2/.env.local`:

```dotenv
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

Then start Vite:

```bash
npm run dev
```

Open `http://localhost:5173`.

> `VITE_` variables are visible in the browser bundle. Never place database passwords or JWT signing secrets in frontend environment variables.

### 5. Add development posts

The current GraphQL API exposes **post listing and details, but not post creation**. To test the comments UI, create a user through registration, then insert a development post using PostgreSQL:

```sql
INSERT INTO posts (author_id, title, content)
SELECT id, 'Nested comments demo', 'Try adding a comment and replies.'
FROM users
ORDER BY id
LIMIT 1
RETURNING id;
```

This inserts one post if at least one user exists. The `id` returned can be used at `/posts/:postId`.

## GraphQL API

| Operation                                  | Purpose                               | Authentication   |
| ------------------------------------------ | ------------------------------------- | ---------------- |
| `register(username, email, password)`      | Create an account                     | No               |
| `login(email, password)`                   | Receive user details and access token | No               |
| `posts(limit, afterId)`                    | Paginate posts                        | No               |
| `post(id)`                                 | Retrieve one post                     | No               |
| `topLevelComments(postId, limit, afterId)` | Paginate root comments                | No               |
| `commentReplies(parentId, limit, afterId)` | Paginate direct replies               | No               |
| `createComment(postId, parentId, content)` | Create a root comment or reply        | Yes              |
| `updateComment(commentId, content)`        | Edit an owned comment                 | Yes, author only |
| `deleteComment(commentId)`                 | Soft-delete an owned comment          | Yes, author only |

Example: fetch a page of top-level comments.

```graphql
query Comments($postId: ID!, $limit: Int!, $afterId: ID) {
  topLevelComments(postId: $postId, limit: $limit, afterId: $afterId) {
    items {
      id
      content
      isDeleted
      hasReplies
      author {
        id
        username
      }
    }
    hasNextPage
    nextCursor
  }
}
```

Example variables:

```json
{ "postId": "1", "limit": 5, "afterId": null }
```

For the next page, pass the previous response's `nextCursor`. GraphQL IDs remain strings in the frontend to avoid JavaScript precision issues with PostgreSQL `BIGINT` values.

## Testing

### Frontend

```bash
cd client-v2
npm run test
npm run lint
npm run build
```

Frontend tests cover reusable UI components, user interactions, pagination, lazy-loaded replies, and GraphQL error handling.

### Backend

Configure `server-v2/.env.test` with a valid `JWT_SECRET` and a **`TEST_DATABASE_URL` pointing to `comments_test`**. Apply migrations to that database separately before running database-backed tests.

```bash
cd server-v2
npm run typecheck
npm run build
node --env-file=.env.test --import tsx --test --test-concurrency=1 src/tests/*.test.ts
```

The backend's current `npm test` script is a placeholder; use the Node.js test runner command above until a real `test` script is added.

Backend coverage includes authentication, authorization, SQL constraints, transaction behavior, GraphQL query limits, pagination, and API rate limiting.

## Security and Reliability Notes

- Passwords are hashed with Argon2; raw passwords are not stored.
- JWTs are signed with HS256 and have a **15-minute** lifetime.
- The frontend currently keeps its access token **in memory**: a full refresh requires a new login. There is no refresh-token flow.
- Ownership restrictions are enforced by the backend, not by hidden UI controls alone.
- Deleting a comment preserves the row and descendants while displaying `[deleted]` for the removed content.
- GraphQL uses depth, alias, and query-complexity limits, plus configurable HTTP rate limiting.
- Request IDs support log correlation; the backend shuts down HTTP, Yoga, and database resources gracefully.

## Current Scope and Future Improvements

**Implemented:** recursive threads, independent pagination, lazy-loaded replies, account registration/login, author-only create/edit/delete, soft deletion, post browsing, and automated tests.

**Not yet implemented:** user-facing post creation, automatic token refresh, and persistence of the login session across page reloads. **Deployment:** not yet hosted; local development is supported using the setup above.

Potential next steps include CI checks, repeatable database seed data, browser-level end-to-end tests, a short demo video/GIF, and deployment. The project's main objective remains the **nested-comments system**.
