import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { initialTickets } from "../lib/demo-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Copy .env.example to .env and set your PostgreSQL URL.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const workspaceSlug = process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio";

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: { name: "Northstar Studio" },
    create: { name: "Northstar Studio", slug: workspaceSlug },
  });

  const users = new Map<string, string>();
  for (const name of ["Naol Umer", "Ava Patel", "Noah Kim"]) {
    const email = `${name.toLowerCase().replaceAll(" ", ".")}@supportpilot.demo`;
    const user = await prisma.user.upsert({ where: { email }, update: { name }, create: { name, email } });
    users.set(name, user.id);
    await prisma.membership.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role: name === "Naol Umer" ? "ADMIN" : "AGENT" },
      create: { workspaceId: workspace.id, userId: user.id, role: name === "Naol Umer" ? "ADMIN" : "AGENT" },
    });
  }

  for (const ticket of initialTickets) {
    const customer = await prisma.customer.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: ticket.email } },
      update: { name: ticket.name },
      create: { workspaceId: workspace.id, name: ticket.name, email: ticket.email },
    });
    const assigneeId = ticket.assignee === "Unassigned" ? null : users.get(ticket.assignee === "You" ? "Naol Umer" : ticket.assignee) ?? null;
    const messages = ticket.messages.map((message) => ({
      senderName: message.author,
      role: message.internal ? "INTERNAL" as const : message.role === "Customer" ? "CUSTOMER" as const : "AGENT" as const,
      body: message.body,
      authorId: message.author === "You" ? users.get("Naol Umer") : undefined,
    }));
    await prisma.ticket.upsert({
      where: { workspaceId_reference: { workspaceId: workspace.id, reference: ticket.id } },
      update: {
        customerId: customer.id, assigneeId, subject: ticket.subject, preview: ticket.preview,
        status: ticket.status.toUpperCase() as "OPEN" | "PENDING" | "RESOLVED",
        priority: ticket.priority.toUpperCase() as "URGENT" | "HIGH" | "NORMAL" | "LOW",
        channel: ticket.channel.toUpperCase() as "EMAIL" | "CHAT" | "WEB",
        messages: { deleteMany: {}, create: messages },
      },
      create: {
        workspaceId: workspace.id, customerId: customer.id, assigneeId, reference: ticket.id,
        subject: ticket.subject, preview: ticket.preview,
        status: ticket.status.toUpperCase() as "OPEN" | "PENDING" | "RESOLVED",
        priority: ticket.priority.toUpperCase() as "URGENT" | "HIGH" | "NORMAL" | "LOW",
        channel: ticket.channel.toUpperCase() as "EMAIL" | "CHAT" | "WEB",
        messages: { create: messages },
      },
    });
  }

  const articles = [
    { slug: "refunds-and-billing", title: "Refunds and billing", summary: "How subscription charges and refunds work.", content: "If a customer was charged twice for the same subscription period, verify both transactions in Billing before issuing a refund. Refunds are returned to the original payment method and usually appear within 5–10 business days. Contact billing support if either transaction is still pending.", status: "PUBLISHED" as const },
    { slug: "download-invoices", title: "Download your invoices", summary: "Find and export invoices from workspace settings.", content: "Workspace admins can find invoices under Settings, then Billing, then Invoice history. Choose a billing period and select Download PDF. Only workspace admins and billing contacts can access invoices.", status: "PUBLISHED" as const },
    { slug: "password-reset", title: "Reset an expired password link", summary: "Request a fresh password reset email.", content: "Password reset links expire after 30 minutes and can be used once. Request a new link from the sign-in page. If the email does not arrive, check spam and confirm the address associated with the account.", status: "PUBLISHED" as const },
  ];
  for (const article of articles) {
    await prisma.knowledgeArticle.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: article.slug } },
      update: article,
      create: { ...article, workspaceId: workspace.id },
    });
  }

  console.log(`Seeded ${initialTickets.length} tickets and ${articles.length} knowledge articles in ${workspace.name}.`);
}

main().finally(async () => prisma.$disconnect());
