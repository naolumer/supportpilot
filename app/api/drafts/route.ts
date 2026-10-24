import { getPrisma } from "@/lib/prisma";
import { withApiErrors } from "@/lib/api-error-response";

export const GET = withApiErrors(async () => {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });

  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });

  const drafts = await prisma.aiDraft.findMany({
    where: { status: "DRAFT", ticket: { is: { workspaceId: workspace.id } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, body: true, model: true, status: true, sources: true, createdAt: true,
      ticket: {
        select: {
          reference: true, subject: true, status: true, priority: true,
          customer: { select: { name: true, email: true } },
        },
      },
    },
  });
  return Response.json({ drafts });
});
