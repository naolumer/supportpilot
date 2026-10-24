"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/read-api-response";

type Triage = {
  id: string; category: string; sentiment: string; suggestedPriority: string; confidence: number;
  summary: string; recommendation: string; model: string | null; createdAt: string;
  ticket: { id: string; reference: string; subject: string; status: string; priority: string; customer: { name: string; email: string } };
};

const labels: Record<string, string> = {
  BILLING: "Billing", ACCOUNT_ACCESS: "Account access", TECHNICAL_ISSUE: "Technical issue",
  FEATURE_REQUEST: "Feature request", HOW_TO: "How-to question", OTHER: "Other",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function TriagePage() {
  const [items, setItems] = useState<Triage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let current = true;
    void fetch("/api/triage", { cache: "no-store" })
      .then(async (response) => {
        const result = await readApiResponse<{ triages?: Triage[]; error?: string }>(response);
        if (!response.ok) throw new Error(result.error ?? "Could not load AI triage.");
        return result;
      })
      .then((result) => { if (current) setItems(result.triages ?? []); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Could not load AI triage."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  async function review(item: Triage, decision: "approve" | "reject") {
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/triage/${encodeURIComponent(item.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const result = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error ?? "Could not review this triage suggestion.");
      setItems((rows) => rows.filter((row) => row.id !== item.id));
      setNotice(decision === "approve"
        ? `${item.ticket.reference} updated to ${item.suggestedPriority.toLowerCase()} priority. The review was recorded.`
        : `Triage suggestion for ${item.ticket.reference} rejected. The ticket was not changed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review this triage suggestion.");
    } finally { setBusyId(""); }
  }

  return <main className="triage-page">
    <header className="triage-header">
      <div>
        <Link className="drafts-back" href="/">← Back to inbox</Link>
        <p className="drafts-kicker">WORKSPACE / AI REVIEW</p>
        <h1>Ticket triage</h1>
        <p className="drafts-subtitle">Review Gemini’s category, sentiment, and priority suggestions before applying them.</p>
      </div>
      <span className="drafts-count">{items.length} awaiting review</span>
    </header>

    {error && <p className="drafts-alert error" role="alert">{error}</p>}
    {notice && <p className="drafts-alert success" role="status">{notice}</p>}

    {loading ? <div className="drafts-empty">Loading triage suggestions…</div> : items.length === 0 ?
      <div className="drafts-empty"><strong>No tickets waiting for triage review</strong><span>Open a ticket and choose Analyze with AI to create a suggestion.</span><Link href="/">Go to inbox</Link></div> :
      <section className="triage-list" aria-label="Triage suggestions awaiting review">
        {items.map((item) => <article className="triage-card" key={item.id}>
          <header className="triage-card-head">
            <span className="triage-label">AI SUGGESTION</span>
            <Link href={`/?ticket=${encodeURIComponent(item.ticket.reference)}`}>{item.ticket.reference} ↗</Link>
          </header>
          <div className="triage-ticket">
            <h2>{item.ticket.subject}</h2>
            <p><strong>{item.ticket.customer.name}</strong><span>{item.ticket.customer.email}</span></p>
          </div>
          <div className="triage-signals">
            <div><span>CATEGORY</span><strong>{labels[item.category] ?? labels.OTHER}</strong></div>
            <div><span>SENTIMENT</span><strong className={`sentiment ${item.sentiment.toLowerCase()}`}>{item.sentiment.toLowerCase()}</strong></div>
            <div><span>PRIORITY</span><strong className={`draft-priority ${item.suggestedPriority.toLowerCase()}`}>{item.suggestedPriority}</strong><small>Current: {item.ticket.priority}</small></div>
            <div><span>CONFIDENCE</span><strong>{Math.round(item.confidence * 100)}%</strong></div>
          </div>
          <div className="triage-explanation">
            <div><strong>Summary</strong><p>{item.summary}</p></div>
            <div><strong>Suggested next step</strong><p>{item.recommendation}</p></div>
          </div>
          <footer className="triage-card-foot">
            <span>{item.model ?? "Gemini"} · {formatDate(item.createdAt)}</span>
            <div><button className="draft-reject" disabled={busyId === item.id} onClick={() => void review(item, "reject")}>{busyId === item.id ? "Saving…" : "Reject"}</button><button className="draft-approve" disabled={busyId === item.id} onClick={() => void review(item, "approve")}>{busyId === item.id ? "Saving…" : "Approve & apply priority"}</button></div>
          </footer>
        </article>)}
      </section>
    }
  </main>;
}
