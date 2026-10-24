import { getPrisma } from "@/lib/prisma";
import { toInboxTicket } from "@/lib/ticket-serializer";

const ticketInclude = {
  customer: true,
  assignee: true,
  messages: { orderBy: { createdAt: "asc" as const } },
};
const statuses = { OPEN: "OPEN", PENDING: "PENDING", RESOLVED: "RESOLVED" } as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  let body: { status?: unknown; assignee?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { reference } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });
  const current = await prisma.ticket.findUnique({
    where: { workspaceId_reference: { workspaceId: workspace.id, reference } },
    include: ticketInclude,
  });
  if (!current) return Response.json({ error: "Ticket not found." }, { status: 404 });

  const rawStatus = typeof body.status === "string" ? body.status.toUpperCase() as keyof typeof statuses : undefined;
  if (body.status !== undefined && (!rawStatus || !(rawStatus in statuses))) {
    return Response.json({ error: "Status must be Open, Pending, or Resolved." }, { status: 400 });
  }
  if (body.assignee !== undefined && (typeof body.assignee !== "string" || body.assignee.length > 100)) {
    return Response.json({ error: "Assignee must be a valid team member name." }, { status: 400 });
  }

  let assigneeId: string | null | undefined;
  if (typeof body.assignee === "string") {
    if (body.assignee === "Unassigned") assigneeId = null;
    else if (body.assignee === "You") {
      const member = await prisma.user.findFirst({ where: { email: "naol.umer@supportpilot.demo", memberships: { some: { workspaceId: workspace.id } } }, select: { id: true } });
      if (!member) return Response.json({ error: "The demo agent is not a member of this workspace. Rerun npm run db:seed." }, { status: 503 });
      assigneeId = member.id;
    }
    else {
      const member = await prisma.user.findFirst({
        where: { name: body.assignee, memberships: { some: { workspaceId: workspace.id } } },
        select: { id: true },
      });
      if (!member) return Response.json({ error: "Assignee is not a member of this workspace." }, { status: 400 });
      assigneeId = member.id;
    }
  }
  if (body.status === undefined && body.assignee === undefined) {
    return Response.json({ error: "Provide a status or assignee to update." }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id: current.id },
      data: {
        ...(rawStatus ? { status: statuses[rawStatus] } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
      },
      include: ticketInclude,
    });
    const events = [];
    if (rawStatus && current.status !== statuses[rawStatus]) {
      events.push({ ticketId: current.id, actorName: "Naol Umer", action: "STATUS_CHANGED", fromValue: current.status, toValue: statuses[rawStatus] });
    }
    if (assigneeId !== undefined && current.assigneeId !== assigneeId) {
      events.push({ ticketId: current.id, actorName: "Naol Umer", action: "ASSIGNEE_CHANGED", fromValue: current.assignee?.name ?? "Unassigned", toValue: ticket.assignee?.name ?? "Unassigned" });
    }
    if (events.length) await tx.auditEvent.createMany({ data: events });
    return ticket;
  });
  return Response.json({ ticket: toInboxTicket(updated) });
}
