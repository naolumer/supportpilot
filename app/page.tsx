"use client";

import { useMemo, useState } from "react";

type Status = "Open" | "Pending" | "Resolved";
type Ticket = {
  id: string; name: string; email: string; initials: string; color: string;
  subject: string; preview: string; time: string; status: Status;
  priority: "Urgent" | "High" | "Normal" | "Low"; channel: string; assignee: string;
  messages: { author: string; role: string; time: string; body: string; internal?: boolean }[];
};

const initialTickets: Ticket[] = [
  { id: "SP-2048", name: "Maya Chen", email: "maya.chen@email.com", initials: "MC", color: "lilac", subject: "Charged twice for my subscription", preview: "I noticed two charges on my card this morning...", time: "8 min", status: "Open", priority: "Urgent", channel: "Email", assignee: "Unassigned", messages: [{ author: "Maya Chen", role: "Customer", time: "Today, 10:42 AM", body: "Hi there — I noticed two charges for my monthly plan on my card this morning. I only meant to subscribe once. Could you check what happened and help me get one of them refunded?" }, { author: "Maya Chen", role: "Customer", time: "Today, 10:44 AM", body: "The two charges are both for $24.00. I can send a screenshot if that helps." }] },
  { id: "SP-2047", name: "Jordan Lee", email: "jordan.lee@email.com", initials: "JL", color: "peach", subject: "Can’t connect my calendar", preview: "The Google Calendar integration keeps disconnecting...", time: "23 min", status: "Open", priority: "High", channel: "Chat", assignee: "Ava Patel", messages: [{ author: "Jordan Lee", role: "Customer", time: "Today, 10:27 AM", body: "The Google Calendar integration keeps disconnecting every few hours. I have already tried reconnecting it, but it still drops. Is there a known issue?" }] },
  { id: "SP-2046", name: "Sofia Ramirez", email: "sofia.r@email.com", initials: "SR", color: "mint", subject: "Where can I download my invoices?", preview: "I need copies of the last three months for accounting...", time: "41 min", status: "Open", priority: "Normal", channel: "Email", assignee: "Noah Kim", messages: [{ author: "Sofia Ramirez", role: "Customer", time: "Today, 10:09 AM", body: "Hi! I need copies of my invoices from the last three months for accounting. I looked under settings but couldn't find them. Where should I go?" }] },
  { id: "SP-2045", name: "Ethan Brooks", email: "ethan.b@email.com", initials: "EB", color: "blue", subject: "Feature request: custom fields", preview: "It would be great if we could add our own fields...", time: "1 hr", status: "Pending", priority: "Low", channel: "Web", assignee: "Ava Patel", messages: [{ author: "Ethan Brooks", role: "Customer", time: "Today, 9:34 AM", body: "It would be great if teams could add custom fields to a workspace. We track a couple of details that don't fit the current setup. Is that something you're considering?" }] },
  { id: "SP-2044", name: "Amara Okafor", email: "amara.o@email.com", initials: "AO", color: "yellow", subject: "Password reset link expired", preview: "I tried the reset link but it says it has expired...", time: "2 hr", status: "Open", priority: "High", channel: "Email", assignee: "Unassigned", messages: [{ author: "Amara Okafor", role: "Customer", time: "Today, 8:56 AM", body: "I tried to reset my password, but the link says it has expired. Could you send me a new one?" }] },
  { id: "SP-2043", name: "Oliver Smith", email: "oliver.s@email.com", initials: "OS", color: "rose", subject: "Team member invite not received", preview: "I invited a teammate yesterday, but they never got...", time: "3 hr", status: "Pending", priority: "Normal", channel: "Chat", assignee: "Noah Kim", messages: [{ author: "Oliver Smith", role: "Customer", time: "Today, 7:51 AM", body: "I invited a teammate yesterday, but they never got the email. I checked the address and it looks right. Can you help?" }] },
  { id: "SP-2042", name: "Priya Nair", email: "priya.n@email.com", initials: "PN", color: "mint", subject: "How do I export a report?", preview: "Looking for a CSV export of our monthly activity...", time: "Yesterday", status: "Resolved", priority: "Normal", channel: "Email", assignee: "You", messages: [{ author: "Priya Nair", role: "Customer", time: "Yesterday, 4:18 PM", body: "I'm looking for a CSV export of our monthly activity report. Is there a way to download one?" }, { author: "You", role: "Agent", time: "Yesterday, 4:32 PM", body: "You can export a report from Analytics. Open the date range you need, then use the Download CSV button in the top right." }] },
];

function Icon({ children }: { children: string }) { return <span className="icon" aria-hidden="true">{children}</span>; }
function Avatar({ ticket }: { ticket: Ticket }) { return <span className={`avatar ${ticket.color}`}>{ticket.initials}</span>; }

export default function Home() {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0].id);
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const visible = useMemo(() => tickets.filter((ticket) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = `${ticket.id} ${ticket.name} ${ticket.subject} ${ticket.preview}`.toLowerCase().includes(term);
    return matchesQuery && (filter === "All" || ticket.status === filter);
  }), [tickets, filter, query]);
  const active = visible.find((ticket) => ticket.id === selectedId) ?? visible[0] ?? null;
  const counts = { All: tickets.length, Open: tickets.filter(t => t.status === "Open").length, Pending: tickets.filter(t => t.status === "Pending").length, Resolved: tickets.filter(t => t.status === "Resolved").length };
  function update(id: string, patch: Partial<Ticket>) { setTickets(rows => rows.map(ticket => ticket.id === id ? { ...ticket, ...patch } : ticket)); }
  function addMessage() {
    if (!note.trim() || !active) return;
    const internal = composerMode === "note";
    setTickets(rows => rows.map(ticket => ticket.id === active.id ? { ...ticket, messages: [...ticket.messages, { author: "You", role: internal ? "Internal note" : "Agent", time: "Just now", body: note.trim(), internal }] } : ticket));
    setNote("");
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#inbox"><span className="brand-mark"><i/><i/><i/><i/></span>supportpilot<span className="beta">BETA</span></a>
      <button className="workspace"><b>N</b><span><strong>Northstar Studio</strong><small>Free workspace</small></span><span className="chevron">⌄</span></button>
      <p className="nav-label">WORKSPACE</p>
      <nav className="nav-list" aria-label="Workspace navigation">
        <button className="nav-link active"><Icon>▤</Icon>Inbox <small>7</small></button>
        <button className="nav-link"><Icon>✧</Icon>AI drafts <small>3</small></button>
        <button className="nav-link"><Icon>▣</Icon>Knowledge base</button>
        <button className="nav-link"><Icon>▥</Icon>Reporting</button>
      </nav>
      <p className="nav-label views-label">YOUR VIEWS <span>＋</span></p>
      <div className="view-link"><i className="green-dot"/>My open tickets <small>4</small></div>
      <div className="view-link"><i className="orange-dot"/>Unassigned <small>2</small></div>
      <button className="add-view">＋ Add a view</button>
      <div className="sidebar-spacer"/>
      <div className="usage-card"><div><strong>AI usage</strong><b>72%</b></div><span className="usage-track"><i/></span><small>72 of 100 AI actions used</small><a href="#plans">See plans →</a></div>
      <button className="profile"><span className="profile-avatar">N</span><span><strong>Naol Umer</strong><small>Admin</small></span><span className="profile-more">···</span></button>
    </aside>

    <section className="main-area" id="inbox">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <strong>Inbox</strong></div><div className="top-actions"><label className="search"><Icon>⌕</Icon><input aria-label="Search tickets" placeholder="Search tickets..." value={query} onChange={event => setQuery(event.target.value)}/><kbd>⌘ K</kbd></label><button className="top-icon" aria-label="Notifications">♧<i/></button><button className="help">?</button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><i/> FRIDAY, OCTOBER 23, 2026</div><h1>Good morning, Naol <span>✳</span></h1><p>Here’s what’s happening with your support inbox today.</p></div><button className="date-button">◷ &nbsp;Last 7 days &nbsp;⌄</button></div>
        <section className="metrics" aria-label="Inbox overview">
          <article className="metric"><div><span>Open tickets</span><b className="metric-icon green">▤</b></div><strong>{counts.Open + counts.Pending}<small className="good">↓ 12%</small></strong><p>vs. previous 7 days</p><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          <article className="metric"><div><span>Needs a reply</span><b className="metric-icon purple">◌</b></div><strong>{counts.Open}<small>in your queue</small></strong><p>2 tickets are unassigned</p><div className="progress"><i style={{width:"55%"}}/></div></article>
          <article className="metric"><div><span>Avg. first response</span><b className="metric-icon amber">◷</b></div><strong>2.4<small className="unit">hrs</small><small className="good">↓ 18%</small></strong><p>You’re faster than last week</p><div className="progress"><i style={{width:"72%"}}/></div></article>
          <article className="metric"><div><span>Resolved this week</span><b className="metric-icon green">✓</b></div><strong>38<small className="good">↑ 8%</small></strong><p>Great work, team <b className="star">✦</b></p><div className="sparkline pale"><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>

        <section className="inbox-panel" aria-label="Support inbox">
          <div className="ticket-column"><div className="inbox-heading"><div><h2>Inbox <span>{tickets.length}</span></h2><p>Your team’s conversations</p></div><button className="more" aria-label="More inbox options">···</button></div>
            <div className="list-toolbar"><div className="filters" role="tablist" aria-label="Filter tickets">{(["All", "Open", "Pending", "Resolved"] as const).map(item => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "chosen" : ""} onClick={() => setFilter(item)}>{item}<small>{counts[item]}</small></button>)}</div><button className="sort">Newest ⌄</button></div>
            <div className="ticket-list" role="listbox" aria-label="Tickets">{visible.length ? visible.map(ticket => <button key={ticket.id} className={`ticket-row ${active?.id === ticket.id ? "selected" : ""}`} role="option" aria-selected={active?.id === ticket.id} onClick={() => setSelectedId(ticket.id)}>
              <div className="ticket-top"><Avatar ticket={ticket}/><div className="ticket-person"><strong>{ticket.name}</strong><span>{ticket.time}</span></div><span className="channel" title={ticket.channel}>{ticket.channel === "Chat" ? "◌" : ticket.channel === "Web" ? "◫" : "✉"}</span></div>
              <strong className="ticket-subject">{ticket.subject}</strong><p className="ticket-preview">{ticket.preview}</p><div className="ticket-tags"><span className={`priority ${ticket.priority.toLowerCase()}`}><i/>{ticket.priority}</span><span className={`status ${ticket.status.toLowerCase()}`}>{ticket.status}</span>{ticket.assignee !== "Unassigned" && <span className="assignee">{ticket.assignee === "You" ? "NU" : ticket.assignee.split(" ").map(p => p[0]).join("")}</span>}</div>
            </button>) : <div className="empty"><b>No tickets found</b><span>Try a different search or filter.</span></div>}</div>
            <div className="list-footer">Showing {visible.length} of {tickets.length} tickets</div>
          </div>

          {active ? <article className="detail-column"><div className="detail-top"><div className="ticket-id"><i/> {active.id} <span>·</span> {active.channel}</div><div className="detail-actions"><button className="more" aria-label="More ticket actions">···</button><button className="resolve" onClick={() => update(active.id, {status: active.status === "Resolved" ? "Open" : "Resolved"})}>✓ &nbsp;{active.status === "Resolved" ? "Reopen" : "Resolve"}</button></div></div>
            <div className="subject-block"><h2>{active.subject}</h2><div><span className={`priority ${active.priority.toLowerCase()}`}><i/>{active.priority} priority</span><i className="divider"/>Created today at 10:42 AM<i className="divider"/>Updated {active.time} ago</div></div>
            <div className="customer"><div><Avatar ticket={active}/><span><strong>{active.name}</strong><small>{active.email}</small></span></div><div><button aria-label="Email customer">✉</button><button aria-label="Customer details">♙</button></div></div>
            <div className="conversation" aria-label="Conversation history">{active.messages.map((message, index) => <div className={`message ${message.internal ? "internal" : ""}`} key={`${active.id}-${index}`}><span className={`message-avatar ${message.author === "You" ? "agent" : active.color}`}>{message.author === "You" ? "NU" : active.initials}</span><div><div className="message-meta"><strong>{message.author}</strong>{message.internal && <b>INTERNAL NOTE</b>}<span>{message.role}</span><time>{message.time}</time></div><p>{message.body}</p></div></div>)}</div>
            <div className="ticket-controls"><label><span>STATUS</span><select value={active.status} onChange={event => update(active.id, {status: event.target.value as Status})}><option>Open</option><option>Pending</option><option>Resolved</option></select></label><label><span>ASSIGNED TO</span><select value={active.assignee} onChange={event => update(active.id, {assignee: event.target.value})}><option>Unassigned</option><option>Ava Patel</option><option>Noah Kim</option><option>You</option></select></label></div>
            <div className="composer"><div className="composer-tabs"><button className={composerMode === "reply" ? "current" : ""} onClick={() => setComposerMode("reply")}>Reply</button><button className={composerMode === "note" ? "current" : ""} onClick={() => setComposerMode("note")}>Internal note</button><span>Demo workspace · nothing is sent</span></div><textarea aria-label={composerMode === "note" ? "Write an internal note" : "Write a reply"} placeholder={composerMode === "note" ? "Add an internal note for your team…" : "Write a reply (demo only)…"} value={note} onChange={event => setNote(event.target.value)}/><div className="composer-bottom"><small><kbd>⌘</kbd> + <kbd>↵</kbd> to send</small><button disabled={!note.trim()} onClick={addMessage}>{composerMode === "note" ? "Add note" : "Add reply"} <span>↗</span></button></div></div>
          </article> : <div className="detail-empty">Select a ticket to see its conversation.</div>}
        </section>
        <footer className="footer"><span><i/> All systems operational</span><span>SupportPilot demo workspace <b>·</b> Last synced just now</span></footer>
      </div>
    </section>
  </main>;
}
