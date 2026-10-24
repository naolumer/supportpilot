import { getPrisma } from "@/lib/prisma";


function articleInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.title !== "string" || body.title.trim().length < 2 || body.title.trim().length > 120) return null;
  if (typeof body.summary !== "string" || body.summary.length > 240) return null;
  if (typeof body.content !== "string" || !body.content.trim() || body.content.length > 12000) return null;
  if (body.status !== "DRAFT" && body.status !== "PUBLISHED") return null;
  return { title: body.title.trim(), summary: body.summary.trim(), content: body.content.trim(), status: body.status as "DRAFT" | "PUBLISHED" };
}

function slugify(title: string) {
  return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "article";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  let value: unknown;
  try { value = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const input = articleInput(value);
  if (!input) return Response.json({ error: "Add a title (2–120 characters), summary (up to 240 characters), article content, and a valid status." }, { status: 400 });
  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });
  const current = await prisma.knowledgeArticle.findFirst({ where: { id, workspaceId: workspace.id }, select: { id: true } });
  if (!current) return Response.json({ error: "Article not found." }, { status: 404 });
  const base = slugify(input.title);
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.knowledgeArticle.findFirst({ where: { workspaceId: workspace.id, slug }, select: { id: true } });
    if (!existing || existing.id === id) break;
    slug = `${base}-${suffix++}`;
  }
  const article = await prisma.knowledgeArticle.update({ where: { id }, data: { ...input, summary: input.summary || null, slug } });
  return Response.json({ article: { ...article, summary: article.summary ?? "" } });
}
