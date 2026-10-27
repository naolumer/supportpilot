"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";
import { initialTickets, type InboxTicket } from "@/lib/demo-data";
import { readApiResponse } from "@/lib/read-api-response";
type Status = InboxTicket["status"];
type Ticket = InboxTicket;
type DraftSource = { articleId: string; slug: string; title: string; excerpt: string; score: number };
const ticketCategoryLabels: Record<string, string> = { BILLING: "Billing", ACCOUNT_ACCESS: "Account access", TECHNICAL_ISSUE: "Technical", FEATURE_REQUEST: "Feature", HOW_TO: "How-to", OTHER: "Other" };

function Icon({ children }: { children: string }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function Avatar({ ticket }: { ticket: Ticket }) { return <span className={`avatar ${ticket.color}`}>{ticket.initials}</span>; }

export default function Home() {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0].id);
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [databaseMode, setDatabaseMode] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftDetected, setDraftDetected] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [triaging, setTriaging] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [messageNotice, setMessageNotice] = useState("");
  const [triageNotice, setTriageNotice] = useState("");
  const [draftSources, setDraftSources] = useState<DraftSource[]>([]);
  const selectedIdRef = useRef(initialTickets[0].id);
  useEffect(() => {
    let current = true;
    void fetch("/api/tickets", { cache: "no-store" })
      .then(async (response) => {
        const result = await readApiResponse<{ mode?: string; tickets?: Ticket[]; error?: string }>(response);
        if (!response.ok) throw new Error(result.error ?? "Could not load tickets.");
        return result;
      })
      .then((result) => {
        if (!current || !result.tickets) return;
        setTickets(result.tickets);
        const requestedTicket = new URLSearchParams(window.location.search).get("ticket");
        const approvedDraftId = new URLSearchParams(window.location.search).get("approvedDraft");
        const nextSelectedId = result.tickets.find(ticket => ticket.id === requestedTicket)?.id ?? result.tickets[0]?.id ?? "";
        selectedIdRef.current = nextSelectedId;
        setSelectedId(nextSelectedId);
        setDatabaseMode(result.mode === "database");
        setSaveError("");
        if (approvedDraftId) {
          void fetch(`/api/drafts/${encodeURIComponent(approvedDraftId)}`, { cache: "no-store" })
            .then(async (response) => {
              const payload = await readApiResponse<{ draft?: { body: string; sources: unknown; ticket: { reference: string } }; error?: string }>(response);
              if (!response.ok || !payload.draft) throw new Error(payload.error ?? "Could not load the approved reply.");
              return payload.draft;
            })
            .then((draft) => {
              if (!current) return;
              if (draft.ticket.reference !== nextSelectedId) throw new Error("The approved reply belongs to a different ticket.");
              setNote(draft.body);
              setComposerMode("reply");
              setDraftSources(Array.isArray(draft.sources) ? draft.sources as DraftSource[] : []);
              setDraftDetected(true);
              setDraftNotice(`Approved AI reply loaded for ${nextSelectedId}. Review it, then choose Add reply to save it to the ticket.`);
            })
            .catch((error: unknown) => {
              if (current) setSaveError(error instanceof Error ? error.message : "Could not load the approved reply.");
            });
        }
      })
      .catch((error: unknown) => {
        if (current) {
          setDatabaseMode(false);
          setSaveError(error instanceof Error ? error.message : "Could not load saved tickets.");
        }
      });
    return () => { current = false; };
  }, []);
  const visible = useMemo(() => tickets.filter((ticket) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = `${ticket.id} ${ticket.name} ${ticket.subject} ${ticket.preview}`.toLowerCase().includes(term);
    return matchesQuery && (filter === "All" || ticket.status === filter);
  }), [tickets, filter, query]);
  const active = visible.find((ticket) => ticket.id === selectedId) ?? visible[0] ?? null;
  useEffect(() => { selectedIdRef.current = active?.id ?? ""; }, [active?.id]);
  const counts = { All: tickets.length, Open: tickets.filter(t => t.status === "Open").length, Pending: tickets.filter(t => t.status === "Pending").length, Resolved: tickets.filter(t => t.status === "Resolved").length };
  async function update(id: string, patch: Partial<Ticket>) {
    if (!databaseMode) {
      setTickets(rows => rows.map(ticket => ticket.id === id ? { ...ticket, ...patch } : ticket));
      return;
    }
    try {
      const response = await fetch(`/api/tickets/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      const result = await readApiResponse<{ ticket?: Ticket; error?: string }>(response);
      if (!response.ok || !result.ticket) throw new Error(result.error ?? "Could not save ticket changes.");
      setTickets(rows => rows.map(ticket => ticket.id === id ? result.ticket! : ticket));
      setSaveError("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save ticket changes.");
    }
  }
  async function generateDraft() {
    if (!active || drafting || draftDetected) return;
    const ticketId = active.id;
    const requestStartedAt = Date.now();
    setDrafting(true);
    setDraftDetected(false);
    setDraftNotice("");
    setSaveError("");
    setDraftSources([]);
    try {
      const generation = fetch(`/api/tickets/${encodeURIComponent(ticketId)}/drafts`, { method: "POST" })
        .then(async (response) => ({
          response,
          result: await readApiResponse<{ draft?: { id: string; body: string; model: string | null }; sources?: DraftSource[]; error?: string }>(response),
        }));
      let requestSettled = false;
      void generation.then(() => { requestSettled = true; }, () => { requestSettled = true; });

      const savedDraft = async () => {
        while (!requestSettled) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          if (requestSettled) return null;
          try {
            const response = await fetch("/api/drafts", { cache: "no-store" });
            if (!response.ok) continue;
            const result = await readApiResponse<{ drafts?: { body: string; sources: unknown; createdAt: string; ticket: { reference: string } }[] }>(response);
            const draft = result.drafts?.find((item) => item.ticket.reference === ticketId && Date.parse(item.createdAt) >= requestStartedAt - 10_000);
            if (draft) return draft;
          } catch {
            // A failed status check should not interrupt the generation request.
          }
        }
        return null;
      };

      const detected = await Promise.race([savedDraft(), generation.then(() => null)]);
      if (detected) {
        if (selectedIdRef.current === ticketId) {
          setNote(detected.body);
          setComposerMode("reply");
          setDraftSources(Array.isArray(detected.sources) ? detected.sources as DraftSource[] : []);
          setDraftDetected(true);
        }
        setDraftNotice(`Draft for ${ticketId} saved. You can review it in AI drafts.`);
        return;
      }

      const { response, result } = await generation;
      if (!response.ok || !result.draft) throw new Error(result.error ?? "Could not generate an AI draft.");
      if (selectedIdRef.current === ticketId) {
        setNote(result.draft.body);
        setComposerMode("reply");
        setDraftSources(result.sources ?? []);
        setDraftDetected(true);
      }
      setDraftNotice(`Draft for ${ticketId} saved. You can review it in AI drafts.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not generate an AI draft.");
    } finally {
      setDrafting(false);
    }
  }
  async function generateTriage() {
    if (!active || triaging) return;
    setTriaging(true);
    setSaveError("");
    setTriageNotice("");
    try {
      const response = await fetch(`/api/tickets/${encodeURIComponent(active.id)}/triage`, { method: "POST" });
      const result = await readApiResponse<{ triage?: { id: string }; error?: string }>(response);
      if (!response.ok || !result.triage) throw new Error(result.error ?? "Could not analyze this ticket.");
      setTriageNotice("AI triage is ready for " + active.id + ". ");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not analyze this ticket.");
    } finally { setTriaging(false); }
  }
  async function addMessage() {
    const body = note.trim();
    if (!body || !active || savingMessage) return;
    const internal = composerMode === "note";
    setSavingMessage(true);
    setMessageNotice("");
    try {
      if (!databaseMode) {
        setTickets(rows => rows.map(ticket => ticket.id === active.id ? { ...ticket, messages: [...ticket.messages, { author: "You", role: internal ? "Internal note" : "Agent", time: "Just now", body, internal }] } : ticket));
        setNote("");
        setDraftSources([]);
        setDraftDetected(false);
        setDraftNotice("");
        setMessageNotice(internal ? "Note added to the conversation." : "Reply added to the conversation.");
        return;
      }
      const response = await fetch(`/api/tickets/${encodeURIComponent(active.id)}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, internal }),
      });
      const result = await readApiResponse<{ ticket?: Ticket; error?: string }>(response);
      if (!response.ok || !result.ticket) throw new Error(result.error ?? "Could not save the message.");
      setTickets(rows => rows.map(ticket => ticket.id === active.id ? result.ticket! : ticket));
      setNote("");
      setDraftSources([]);
      setDraftDetected(false);
      setDraftNotice("");
      setSaveError("");
      setMessageNotice(internal ? "Note added to the conversation." : "Reply added to the conversation.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save the message.");
    } finally {
      setSavingMessage(false);
    }
  }

  return <main className="app-shell">
    <section className="main-area" id="inbox">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <strong>Inbox</strong></div><div className="top-actions"><label className="search"><Icon>⌕</Icon><input aria-label="Search tickets" placeholder="Search tickets..." value={query} onChange={event => setQuery(event.target.value)}/><kbd>⌘ K</kbd></label><button className="top-icon" aria-label="Notifications">♧<i/></button><button className="help">?</button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><i/> FRIDAY, OCTOBER 23, 2026</div><h1>Good morning, Naol <span>✳</span></h1><p>Here’s what’s happening with your support inbox today.</p></div><button className="date-button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Last 7 days</span><svg className="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button></div>
        {saveError && <p className="save-error" role="alert">{saveError}</p>}{messageNotice && <p className="save-success" role="status">{messageNotice}</p>}{draftNotice && <p className="save-success" role="status">{draftNotice}<Link href="/drafts">Review drafts</Link></p>}{triageNotice && <p className="save-success" role="status">{triageNotice}<Link href="/triage">Review suggestion</Link></p>}
        <section className="metrics" aria-label="Inbox overview">
          <article className="metric"><div><span>Open tickets</span><b className="metric-icon green">▤</b></div><strong>{counts.Open + counts.Pending}<small className="good">↓ 12%</small></strong><p>vs. previous 7 days</p><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric"><div><span>Needs a reply</span><b className="metric-icon purple">◌</b></div><strong>{counts.Open}<small>in your queue</small></strong><p>2 tickets are unassigned</p><div className="progress"><i style={{width:"55%"}}/></div></article>
          <article className="metric"><div><span>Avg. first response</span><b className="metric-icon amber">◷</b></div><strong>2.4<small className="unit">hrs</small><small className="good">↓ 18%</small></strong><p>You’re faster than last week</p><div className="progress"><i style={{width:"72%"}}/></div></article>
          <article className="metric"><div><span>Resolved this week</span><b className="metric-icon green">✓</b></div><strong>38<small className="good">↑ 8%</small></strong><p>Great work, team <b className="star">✦</b></p><div className="sparkline pale"><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>

        <section className="inbox-panel" aria-label="Support inbox">
          <div className="ticket-column"><div className="inbox-heading"><div><h2>Inbox <span>{tickets.length}</span></h2><p>Your team’s conversations</p></div><button className="more" aria-label="More inbox options">···</button></div>
            <div className="list-toolbar"><div className="filters" role="tablist" aria-label="Filter tickets">{(["All", "Open", "Pending", "Resolved"] as const).map(item => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "chosen" : ""} onClick={() => setFilter(item)}>{item}<small>{counts[item]}</small></button>)}</div><button className="sort">Newest<svg className="dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button></div>
            <div className="ticket-list" role="listbox" aria-label="Tickets">{visible.length ? visible.map(ticket => <button key={ticket.id} className={`ticket-row ${active?.id === ticket.id ? "selected" : ""}`} role="option" aria-selected={active?.id === ticket.id} onClick={() => { selectedIdRef.current = ticket.id; setSelectedId(ticket.id); setNote(""); setDraftSources([]); setDraftDetected(false); setDraftNotice(""); setMessageNotice(""); }}>
              <div className="ticket-top"><Avatar ticket={ticket}/><div className="ticket-person"><strong>{ticket.name}</strong><span>{ticket.time}</span></div><span className="channel" title={ticket.channel}>{ticket.channel === "Chat" ? "◌" : ticket.channel === "Web" ? "◫" : "✉"}</span></div>
              <strong className="ticket-subject">{ticket.subject}</strong><p className="ticket-preview">{ticket.preview}</p><div className="ticket-tags"><span className={`priority ${ticket.priority.toLowerCase()}`}><i/>{ticket.priority}</span>{ticket.category && <span className="ticket-ai-label">{ticketCategoryLabels[ticket.category] ?? ticket.category}</span>}<span className={`status ${ticket.status.toLowerCase()}`}>{ticket.status}</span>{ticket.assignee !== "Unassigned" && <span className="assignee">{ticket.assignee === "You" ? "NU" : ticket.assignee.split(" ").map(p => p[0]).join("")}</span>}</div>
            </button>) : <div className="empty"><b>No tickets found</b><span>Try a different search or filter.</span></div>}</div>
            <div className="list-footer">Showing {visible.length} of {tickets.length} tickets</div>
          </div>

          {active ? <article className="detail-column"><div className="detail-top"><div className="ticket-id"><i/> {active.id} <span>·</span> {active.channel}</div><div className="detail-actions"><button className="ai-triage-button" onClick={generateTriage} disabled={triaging}>{triaging ? "Analyzing..." : "Analyze with AI"}</button><button className="more" aria-label="More ticket actions">···</button><button className="resolve" onClick={() => update(active.id, {status: active.status === "Resolved" ? "Open" : "Resolved"})}>✓ &nbsp;{active.status === "Resolved" ? "Reopen" : "Resolve"}</button></div></div>
            <div className="subject-block"><h2>{active.subject}</h2><div><span className={`priority ${active.priority.toLowerCase()}`}><i/>{active.priority} priority</span>{active.category && <span className="ticket-ai-label">{ticketCategoryLabels[active.category]}</span>}{active.sentiment && <span className={`ticket-sentiment ${active.sentiment.toLowerCase()}`}>{active.sentiment.toLowerCase()}</span>}<i className="divider"/>Created today at 10:42 AM<i className="divider"/>Updated {active.time} ago</div></div>
            <div className="customer"><div><Avatar ticket={active}/><span><strong>{active.name}</strong><small>{active.email}</small></span></div><div><button aria-label="Email customer">✉</button><button aria-label="Customer details">♙</button></div></div>
            <div className="conversation" aria-label="Conversation history">{active.messages.map((message, index) => <div className={`message ${message.internal ? "internal" : ""}`} key={`${active.id}-${index}`}><span className={`message-avatar ${message.author === "You" ? "agent" : active.color}`}>{message.author === "You" ? "NU" : active.initials}</span><div><div className="message-meta"><strong>{message.author}</strong>{message.internal && <b>INTERNAL NOTE</b>}<span>{message.role}</span><time>{message.time}</time></div><p>{message.body}</p></div></div>)}</div>
            <div className="ticket-controls"><label><span>STATUS</span><select value={active.status} onChange={event => update(active.id, {status: event.target.value as Status})}><option>Open</option><option>Pending</option><option>Resolved</option></select></label><label><span>ASSIGNED TO</span><select value={active.assignee} onChange={event => update(active.id, {assignee: event.target.value})}><option>Unassigned</option><option>Ava Patel</option><option>Noah Kim</option><option>You</option></select></label></div>
            <div className="composer"><div className="composer-tabs"><button disabled={savingMessage} className={composerMode === "reply" ? "current" : ""} onClick={() => { setComposerMode("reply"); setMessageNotice(""); }}>Reply</button><button disabled={savingMessage} className={composerMode === "note" ? "current" : ""} onClick={() => { setComposerMode("note"); setMessageNotice(""); }}>Internal note</button><button className="ai-draft-button" type="button" onClick={generateDraft} disabled={drafting || savingMessage || draftDetected || !active}>{drafting ? "Generating draft..." : draftDetected ? "Draft saved" : "Draft with AI"}</button><span>AI drafts need your review</span></div>{draftSources.length > 0 && <div className="draft-sources"><strong>Sources from published articles</strong>{draftSources.map(source => <a key={source.articleId} href="/knowledge"><span>{source.title}</span><small>{source.excerpt}</small></a>)}</div>}<textarea disabled={savingMessage} aria-label={composerMode === "note" ? "Write an internal note" : "Write a reply"} placeholder={composerMode === "note" ? "Add an internal note for your team…" : "Write a reply (demo only)…"} value={note} onChange={event => { setNote(event.target.value); setMessageNotice(""); }}/><div className="composer-bottom"><small><kbd>⌘</kbd> + <kbd>↵</kbd> to send</small><button disabled={!note.trim() || savingMessage} aria-busy={savingMessage} onClick={addMessage}>{savingMessage && <span className="button-spinner" aria-hidden="true"/>}{savingMessage ? (composerMode === "note" ? "Adding note…" : "Adding reply…") : (composerMode === "note" ? "Add note" : "Add reply")} {!savingMessage && <span>↗</span>}</button></div></div>
          </article> : <div className="detail-empty">Select a ticket to see its conversation.</div>}
        </section>
        <footer className="footer"><span><i/> All systems operational</span><span>SupportPilot demo workspace <b>·</b> Last synced just now</span></footer>
      </div>
    </section>
  </main>;
}
