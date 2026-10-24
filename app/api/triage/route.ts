import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });

  const triages = await prisma.aiTriage.findMany({
    where: { status: "DRAFT", ticket: { is: { workspaceId: workspace.id } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, category: true, sentiment: true, suggestedPriority: true, confidence: true,
      summary: true, recommendation: true, model: true, createdAt: true,
      ticket: {
        select: {
          id: true, reference: true, subject: true, status: true, priority: true,
          customer: { select: { name: true, email: true } },
        },
      },
    },
  });
  return Response.json({ triages });
}