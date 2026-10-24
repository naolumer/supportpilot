# SupportPilot

AI-assisted customer support workspace for organizing tickets, finding relevant support knowledge, and preparing reply drafts for human review.

## Current milestone

The app includes a responsive demo inbox with seeded tickets and a searchable knowledge base with draft and published article editing. It supports ticket search, status filters, ticket selection, assignment and status changes, conversation history, and replies or internal notes. Without a database connection, changes stay in browser state and are not saved or sent to customers. With PostgreSQL configured, ticket updates and messages are stored in the database.

## Planned features

- Team workspaces, authentication, and roles
- Retrieval-augmented reply drafts with visible knowledge sources
- AI ticket classification and a human approval workflow
- Basic support team metrics

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

The app uses the sample inbox when `DATABASE_URL` is missing. The seed data is synthetic and intended for local development.