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
  const draft = await prisma.aiDraft.findFirst({
    where: { id, ticket: { is: { workspaceId: workspace.id } } },
    select: { id: true, status: true, ticketId: true, ticket: { select: { reference: true } } },
  });
  if (!draft) return Response.json({ error: "Draft not found." }, { status: 404 });
  if (draft.status !== "DRAFT") return Response.json({ error: "This draft has already been reviewed." }, { status: 409 });

  const reviewer = await prisma.user.findFirst({
    where: { email: "naol.umer@supportpilot.demo", memberships: { some: { workspaceId: workspace.id } } },
    select: { id: true, name: true },
  });
  if (!reviewer) return Response.json({ error: "The demo reviewer is not a workspace member. Rerun npm run db:seed." }, { status: 503 });

  const status = body.decision === "approve" ? "APPROVED" : "REJECTED";
  const reviewed = await prisma.$transaction(async (tx) => {
    const changed = await tx.aiDraft.updateMany({ where: { id, status: "DRAFT" }, data: { status, reviewedById: reviewer.id } });
    if (changed.count === 0) return false;
    await tx.auditEvent.create({
      data: {
        ticketId: draft.ticketId, actorName: reviewer.name,
        action: body.decision === "approve" ? "AI_DRAFT_APPROVED" : "AI_DRAFT_REJECTED",
        fromValue: "DRAFT", toValue: status,
      },
    });
    return true;
  });
  if (!reviewed) return Response.json({ error: "This draft was reviewed in another session." }, { status: 409 });
  return Response.json({ id, status, ticketReference: draft.ticket.reference });
}