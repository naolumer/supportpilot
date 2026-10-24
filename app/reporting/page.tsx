"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Report = {
  rangeDays: number;
  metrics: { received: number; open: number; pending: number; waitingForReply: number; unassigned: number; resolved: number; averageFirstResponseMinutes: number | null; responseSamples: number };
  volume: { key: string; label: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  assigneeBreakdown: { name: string; count: number }[];
  categorySampleCount: number;
  startDate: string;
};

const categoryLabels: Record<string, string> = { BILLING: "Billing", ACCOUNT_ACCESS: "Account access", TECHNICAL_ISSUE: "Technical issue", FEATURE_REQUEST: "Feature request", HOW_TO: "How-to", OTHER: "Other" };
const priorityLabels: Record<string, string> = { URGENT: "Urgent", HIGH: "High", NORMAL: "Normal", LOW: "Low" };

function responseLabel(minutes: number | null) {
  if (minutes === null) return "No replies yet";
  if (minutes < 1) return "Under 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} hrs`;
}

export default function ReportingPage() {
  const [range, setRange] = useState<7 | 30>(7);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    void fetch(`/api/reporting?range=${range}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as Report & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load workspace metrics.");
        return result;
      })
      .then((result) => { if (current) { setReport(result); setError(""); } })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Could not load workspace metrics."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [range]);

  const maxVolume = Math.max(1, ...(report?.volume.map((item) => item.count) ?? []));
  const maxPriority = Math.max(1, ...(report?.priorityBreakdown.map((item) => item.count) ?? []));
  const maxCategory = Math.max(1, ...(report?.categoryBreakdown.map((item) => item.count) ?? []));

  return <main className="reporting-page">
    <header className="reporting-header">
      <div><Link className="drafts-back" href="/">â† Back to inbox</Link><p className="drafts-kicker">WORKSPACE / REPORTING</p><h1>Support performance</h1><p className="drafts-subtitle">A live view of ticket volume, queue health, and team workload.</p></div>
      <label className="report-range">Date range<select value={range} onChange={(event) => { setLoading(true); setRange(Number(event.target.value) as 7 | 30); }}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label>
    </header>

    {error && <p className="drafts-alert error" role="alert">{error}</p>}
    {loading && <p className="report-loading" role="status">Updating reportâ€¦</p>}
    {report && <>
      <section className="report-metrics" aria-label="Support metrics">
        <article><span>Tickets received</span><strong>{report.metrics.received}</strong><small>in the last {range} days</small></article>
        <article><span>Open queue</span><strong>{report.metrics.open}</strong><small>{report.metrics.waitingForReply} waiting for a reply</small></article>
        <article><span>Resolved</span><strong>{report.metrics.resolved}</strong><small>during the selected period</small></article>
        <article><span>Avg. first response</span><strong>{responseLabel(report.metrics.averageFirstResponseMinutes)}</strong><small>{report.metrics.responseSamples} tickets with a reply</small></article>
      </section>

      <section className="report-grid">
        <article className="report-card report-volume"><header><div><h2>Ticket volume</h2><p>New tickets by day</p></div><span>{range} days</span></header><div className={`volume-chart ${range === 30 ? "monthly" : "weekly"}`} role="img" aria-label={`Daily ticket volume for the last ${range} days`}>
          {report.volume.map((day) => <div className="volume-day" key={day.key} title={`${day.label}: ${day.count} tickets`}><span className="volume-bar-track"><i style={{ height: `${day.count ? Math.max(9, (day.count / maxVolume) * 100) : 2}%` }}/></span><small>{range === 7 || new Date(day.key).getDate() === 1 ? day.label : ""}</small></div>)}
        </div></article>

        <article className="report-card"><header><div><h2>Current queue</h2><p>Tickets requiring follow-up</p></div></header><div className="report-stat-list"><div><span>Open</span><strong>{report.metrics.open}</strong></div><div><span>Pending</span><strong>{report.metrics.pending}</strong></div><div><span>Unassigned</span><strong>{report.metrics.unassigned}</strong></div></div><div className="report-breakdown">{report.assigneeBreakdown.map((person) => <div key={person.name}><span>{person.name}</span><b>{person.count}</b></div>)}</div></article>

        <article className="report-card"><header><div><h2>Priority breakdown</h2><p>Open and pending tickets</p></div></header><div className="report-bars">{report.priorityBreakdown.map((item) => <div className="report-bar-row" key={item.priority}><span>{priorityLabels[item.priority]}</span><i><b className={`bar-${item.priority.toLowerCase()}`} style={{ width: `${(item.count / maxPriority) * 100}%` }}/></i><strong>{item.count}</strong></div>)}</div></article>

        <article className="report-card"><header><div><h2>AI ticket categories</h2><p>{report.categorySampleCount} analyzed tickets in this period</p></div><Link href="/triage">Review triage â†’</Link></header><div className="report-bars">{report.categoryBreakdown.map((item) => <div className="report-bar-row" key={item.category}><span>{categoryLabels[item.category]}</span><i><b className="bar-category" style={{ width: `${(item.count / maxCategory) * 100}%` }}/></i><strong>{item.count}</strong></div>)}</div>{report.categorySampleCount === 0 && <p className="report-hint">Analyze tickets with AI and approve the suggestions to see category trends.</p>}</article>
      </section>
      <p className="report-footnote">First response uses the earliest agent reply after the first customer message. Category totals include approved AI triage only.</p>
    </>}
  </main>;
}
