import { getPrisma } from "@/lib/prisma";
import { withApiErrors } from "@/lib/api-error-response";

const priorityNames = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
const categoryNames = ["BILLING", "ACCOUNT_ACCESS", "TECHNICAL_ISSUE", "FEATURE_REQUEST", "HOW_TO", "OTHER"] as const;

export const GET = withApiErrors(async (request: Request) => {
  const prisma = getPrisma();
  if (!prisma) return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  const workspace = await prisma.workspace.findUnique({ where: { slug: process.env.DEMO_WORKSPACE_SLUG ?? "northstar-studio" } });
  if (!workspace) return Response.json({ error: "Workspace is not seeded. Run npm run db:seed." }, { status: 503 });

  const url = new URL(request.url);
  const days = url.searchParams.get("range") === "30" ? 30 : 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  const startKey = start.toISOString().slice(0, 10);

  const [tickets, resolutions] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [{ createdAt: { gte: start } }, { status: { in: ["OPEN", "PENDING"] } }],
      },
      select: {
        reference: true, createdAt: true, updatedAt: true, status: true, priority: true,
        assignee: { select: { name: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { role: true, createdAt: true } },
        triages: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 1, select: { category: true } },
      },
    }),
    prisma.auditEvent.count({
      where: {
        action: "STATUS_CHANGED", toValue: "RESOLVED", createdAt: { gte: start },
        ticket: { workspaceId: workspace.id },
      },
    }),
  ]);

  const created = tickets.filter((ticket) => ticket.createdAt >= start);
  const open = tickets.filter((ticket) => ticket.status === "OPEN");
  const pending = tickets.filter((ticket) => ticket.status === "PENDING");
  const waitingForReply = open.length;
  const unassigned = tickets.filter((ticket) => ticket.status !== "RESOLVED" && !ticket.assignee).length;

  const responseTimes: number[] = [];
  for (const ticket of created) {
    const firstCustomer = ticket.messages.find((message) => message.role === "CUSTOMER");
    if (!firstCustomer) continue;
    const firstAgent = ticket.messages.find((message) => message.role === "AGENT" && message.createdAt >= firstCustomer.createdAt);
    if (firstAgent) responseTimes.push(Math.max(0, (firstAgent.createdAt.getTime() - firstCustomer.createdAt.getTime()) / 60_000));
  }

  const daysList = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("en", { ...(days === 7 ? { weekday: "short" as const } : {}), month: "short", day: "numeric" }).format(date), count: 0 };
  });
  const dayCounts = new Map(daysList.map((day) => [day.key, day]));
  for (const ticket of created) {
    const day = dayCounts.get(ticket.createdAt.toISOString().slice(0, 10));
    if (day) day.count++;
  }

  const priorityBreakdown = priorityNames.map((priority) => ({ priority, count: tickets.filter((ticket) => ticket.status !== "RESOLVED" && ticket.priority === priority).length }));
  const categoryBreakdown = categoryNames.map((category) => ({ category, count: created.filter((ticket) => ticket.triages[0]?.category === category).length }));
  const assigneeCounts = new Map<string, number>();
  for (const ticket of tickets.filter((item) => item.status !== "RESOLVED")) {
    const name = ticket.assignee?.name ?? "Unassigned";
    assigneeCounts.set(name, (assigneeCounts.get(name) ?? 0) + 1);
  }

  return Response.json({
    rangeDays: days,
    metrics: {
      received: created.length,
      open: open.length,
      pending: pending.length,
      waitingForReply,
      unassigned,
      resolved: resolutions,
      averageFirstResponseMinutes: responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : null,
      responseSamples: responseTimes.length,
    },
    volume: daysList,
    priorityBreakdown,
    categoryBreakdown,
    assigneeBreakdown: [...assigneeCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    categorySampleCount: created.filter((ticket) => ticket.triages.length > 0).length,
    startDate: startKey,
  });
});
