# SupportPilot

AI-assisted customer support workspace for organizing tickets, finding relevant support knowledge, and preparing reply drafts for human review.

## Current milestone

The app includes a responsive demo inbox, a searchable knowledge base, source-grounded AI reply drafts, an AI drafts review queue, a human-reviewed ticket triage workflow, and a live support reporting dashboard. Agents can inspect article evidence, approve or reject reply drafts, and review Gemini category, sentiment, and priority suggestions before applying them. Approving a reply draft does not send it. Approving triage applies the suggested priority and records the decision. Reporting summarizes ticket volume, queue health, response times, priority, approved AI categories, and assignee workload. It supports ticket search, status filters, ticket selection, assignment and status changes, conversation history, and replies or internal notes. Without a database connection, inbox changes stay in browser state. With PostgreSQL configured, ticket updates, messages, reply drafts, triage suggestions, and review decisions are stored in the database.

## Planned features

- Team workspaces, authentication, and roles

Live inbox connections and sending customer replies are outside the initial scope.

## Development

Install dependencies and start the app in demo mode:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Enable PostgreSQL persistence

1. Create a PostgreSQL database and copy `.env.example` to `.env`.
2. Set `DATABASE_URL` in `.env` to your database connection string.
3. Apply the initial schema and load the sample workspace, tickets, messages, and knowledge articles:

```bash
npm run db:migrate
npm run db:seed
```

4. Start or restart the app with `npm run dev`.

Apply new schema migrations after pulling updates with `npm run db:migrate`.

The app uses the sample inbox when `DATABASE_URL` is missing. The seed data is synthetic and intended for local development.

### Enable AI reply drafting

Create a Gemini API key in Google AI Studio, then set `GEMINI_API_KEY` in `.env`. `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`. The draft endpoint retrieves relevant published workspace articles, sends the ticket conversation and excerpts to Gemini, and stores the generated draft with its article sources for agent review. Drafts are not sent to customers. Triage uses the same Gemini API key. Review suggestions at `/triage`; priority changes only after an agent approves them. The Gemini free tier has model-specific limits; review current [pricing and free-tier details](https://ai.google.dev/gemini-api/docs/pricing). Avoid sending real customer data when using the free tier, as Google may use free-tier content to improve its products.
