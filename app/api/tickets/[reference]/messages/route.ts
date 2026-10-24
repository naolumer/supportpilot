import { getPrisma } from "@/lib/prisma";
import { toInboxTicket } from "@/lib/ticket-serializer";

const ticketInclude = {
  customer: true,
  assignee: true,
  messages: { orderBy: { createdAt: "asc" as const } },
};

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  let body: { body?: unknown; internal?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.body !== "string" || !body.body.trim() || body.body.length > 5000) {
    return Response.json({ error: "Message must contain between 1 and 5000 characters." }, { status: 400 });
  }
  if (body.internal !== undefined && typeof body.internal !== "boolean") {
    return Response.json({ error: "Internal must be a boolean." }, { status: 400 });
  }

  const { reference } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });
  const current = await prisma.ticket.findUnique({
    where: { workspaceId_reference: { workspaceId: workspace.id, reference } },
    select: { id: true },
  });
  if (!current) return Response.json({ error: "Ticket not found." }, { status: 404 });

  const text = body.body.trim();
  const internal = body.internal === true;
  const ticket = await prisma.ticket.update({
    where: { id: current.id },
    data: {
      preview: text.length > 72 ? `${text.slice(0, 69)}...` : text,
      messages: { create: { senderName: "You", role: internal ? "INTERNAL" : "AGENT", body: text } },
      auditEvents: { create: { actorName: "Naol Umer", action: internal ? "INTERNAL_NOTE_ADDED" : "REPLY_DRAFT_ADDED" } },
    },
    include: ticketInclude,
  });
  return Response.json({ ticket: toInboxTicket(ticket) });
}
