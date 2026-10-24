import { getPrisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  let body: { decision?: unknown };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (body.decision !== "approve" && body.decision !== "reject") {
    return Response.json({ error: "Decision must be approve or reject." }, { status: 400 });
  }

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });
  const triage = await prisma.aiTriage.findFirst({
    where: { id, ticket: { is: { workspaceId: workspace.id } } },
    select: {
      id: true, status: true, ticketId: true, suggestedPriority: true,
      ticket: { select: { reference: true, priority: true } },
    },
  });
  if (!triage) return Response.json({ error: "Triage suggestion not found." }, { status: 404 });
  if (triage.status !== "DRAFT") return Response.json({ error: "This suggestion has already been reviewed." }, { status: 409 });

  const reviewer = await prisma.user.findFirst({
    where: { email: "naol.umer@supportpilot.demo", memberships: { some: { workspaceId: workspace.id } } },
    select: { id: true, name: true },
  });
  if (!reviewer) return Response.json({ error: "The demo reviewer is not a workspace member. Rerun npm run db:seed." }, { status: 503 });

  const status = body.decision === "approve" ? "APPROVED" : "REJECTED";
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.aiTriage.updateMany({ where: { id, status: "DRAFT" }, data: { status, reviewedById: reviewer.id } });
    if (changed.count === 0) return null;

    if (body.decision === "approve") {
      await tx.ticket.update({ where: { id: triage.ticketId }, data: { priority: triage.suggestedPriority } });
      if (triage.ticket.priority !== triage.suggestedPriority) {
        await tx.auditEvent.create({
          data: {
            ticketId: triage.ticketId, actorName: reviewer.name, action: "AI_PRIORITY_APPLIED",
            fromValue: triage.ticket.priority, toValue: triage.suggestedPriority,
          },
        });
      }
    }
    await tx.auditEvent.create({
      data: {
        ticketId: triage.ticketId, actorName: reviewer.name,
        action: body.decision === "approve" ? "AI_TRIAGE_APPROVED" : "AI_TRIAGE_REJECTED",
        fromValue: "DRAFT", toValue: status,
      },
    });
    return true;
  });
  if (!result) return Response.json({ error: "This suggestion was reviewed in another session." }, { status: 409 });
  return Response.json({ id, status, priority: body.decision === "approve" ? triage.suggestedPriority : triage.ticket.priority, ticketReference: triage.ticket.reference });
}