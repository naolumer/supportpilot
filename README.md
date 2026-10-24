# SupportPilot

AI-assisted customer support workspace for organizing tickets, finding relevant support knowledge, and preparing reply drafts for human review.

## Current milestone

The app includes a responsive demo inbox, a searchable knowledge base, and source-grounded AI reply drafts for agent review. It supports ticket search, status filters, ticket selection, assignment and status changes, conversation history, and replies or internal notes. Without a database connection, changes stay in browser state and are not saved or sent to customers. With PostgreSQL configured, ticket updates and messages are stored in the database.

## Planned features

- Team workspaces, authentication, and roles
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

### Enable AI reply drafting

Set `OPENAI_API_KEY` in `.env` using your OpenAI API key. `OPENAI_MODEL` is optional and defaults to `gpt-6-astra`. The draft endpoint retrieves relevant published workspace articles, generates a reply through the OpenAI Responses API, and stores the draft with its article sources for agent review. Drafts are not sent to customers.