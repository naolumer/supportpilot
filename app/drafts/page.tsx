"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Source = { articleId: string; slug: string; title: string; excerpt: string };
type Draft = {
  id: string; body: string; model: string | null; status: string; sources: unknown; createdAt: string;
  ticket: { reference: string; subject: string; status: string; priority: string; customer: { name: string; email: string } };
};

function getSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Source =>
    typeof item === "object" && item !== null &&
    "articleId" in item && typeof item.articleId === "string" &&
    "slug" in item && typeof item.slug === "string" &&
    "title" in item && typeof item.title === "string" &&
    "excerpt" in item && typeof item.excerpt === "string",
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let current = true;
    void fetch("/api/drafts", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { drafts?: Draft[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load AI drafts.");
        return result;
      })
      .then((result) => { if (current) setDrafts(result.drafts ?? []); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Could not load AI drafts."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  async function review(draft: Draft, decision: "approve" | "reject") {
    setBusyId(draft.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update this draft.");
      setDrafts((rows) => rows.filter((row) => row.id !== draft.id));
      setNotice(decision === "approve" ? `Draft for ${draft.ticket.reference} approved. It has not been sent.` : `Draft for ${draft.ticket.reference} rejected.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this draft.");
    } finally { setBusyId(""); }
  }

  return <main className="drafts-page">
    <header className="drafts-header">
      <div>
        <Link className="drafts-back" href="/">← Back to inbox</Link>
        <p className="drafts-kicker">WORKSPACE / AI REVIEW</p>
        <h1>AI drafts</h1>
        <p className="drafts-subtitle">Review suggested replies and their knowledge sources before they are used.</p>
      </div>
      <span className="drafts-count">{drafts.length} awaiting review</span>
    </header>

    {error && <p className="drafts-alert error" role="alert">{error}</p>}
    {notice && <p className="drafts-alert success" role="status">{notice}</p>}

    {loading ? <div className="drafts-empty">Loading drafts…</div> : drafts.length === 0 ?
      <div className="drafts-empty"><strong>No drafts waiting for review</strong><span>Generate a reply from a ticket using Draft with AI, then review it here.</span><Link href="/">Go to inbox</Link></div> :
      <section className="draft-review-list" aria-label="Drafts waiting for review">
        {drafts.map((draft) => {
          const sources = getSources(draft.sources);
          return <article className="draft-review-card" key={draft.id}>
            <header className="draft-review-top">
              <div><span className="draft-review-label">SUGGESTED REPLY</span><span className="draft-model">{draft.model ?? "Gemini"}</span></div>
              <Link href={`/?ticket=${encodeURIComponent(draft.ticket.reference)}`}>{draft.ticket.reference} ↗</Link>
            </header>
            <div className="draft-ticket-summary">
              <h2>{draft.ticket.subject}</h2>
              <p><strong>{draft.ticket.customer.name}</strong> <span>{draft.ticket.customer.email}</span></p>
              <div><span className={`draft-priority ${draft.ticket.priority.toLowerCase()}`}>{draft.ticket.priority} priority</span><span>{draft.ticket.status.toLowerCase()}</span><time>{formatDate(draft.createdAt)}</time></div>
            </div>
            <div className="draft-reply-body"><strong>Draft response</strong><p>{draft.body}</p></div>
            {sources.length > 0 && <details className="draft-evidence"><summary>Knowledge evidence <span>{sources.length} {sources.length === 1 ? "article" : "articles"}</span></summary><div>{sources.map((source) => <a key={source.articleId} href="/knowledge"><strong>{source.title}</strong><span>{source.excerpt}</span></a>)}</div></details>}
            <footer className="draft-review-actions"><span>Approval does not send the reply.</span><div><button className="draft-reject" disabled={busyId === draft.id} onClick={() => void review(draft, "reject")}>{busyId === draft.id ? "Saving…" : "Reject"}</button><button className="draft-approve" disabled={busyId === draft.id} onClick={() => void review(draft, "approve")}>{busyId === draft.id ? "Saving…" : "Approve draft"}</button></div></footer>
          </article>;
        })}
      </section>
    }
  </main>;
}