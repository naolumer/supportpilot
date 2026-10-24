import { initialTickets } from "@/lib/demo-data";
import { getPrisma } from "@/lib/prisma";
import { toInboxTicket } from "@/lib/ticket-serializer";

export const dynamic = "force-dynamic";

const ticketInclude = {
  customer: true,
  assignee: true,
  messages: { orderBy: { createdAt: "asc" as const } },
};

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ mode: "demo", tickets: initialTickets });

  const workspace = await prisma.workspace.findUnique({
    where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" },
  });
  if (!workspace) {
    return Response.json({ error: "Database is connected. Run the migration and seed commands first." }, { status: 503 });
  }

  const tickets = await prisma.ticket.findMany({
    where: { workspaceId: workspace.id },
    include: ticketInclude,
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ mode: "database", tickets: tickets.map(toInboxTicket) });
}
