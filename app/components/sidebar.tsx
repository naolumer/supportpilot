"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type ViewStatus = "All" | "Open" | "Pending" | "Resolved";
type SavedView = { id: string; name: string; status: ViewStatus; unassignedOnly: boolean };
const savedViewsKey = "supportpilot:saved-inbox-views";

function readSavedViews(): SavedView[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(savedViewsKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is SavedView => item && typeof item.id === "string" && typeof item.name === "string" && ["All", "Open", "Pending", "Resolved"].includes(item.status) && typeof item.unassignedOnly === "boolean");
  } catch {
    return [];
  }
}

const navigation = [
  { href: "/", label: "Inbox", icon: "inbox" },
  { href: "/drafts", label: "AI drafts", icon: "drafts" },
  { href: "/triage", label: "AI triage", icon: "triage" },
  { href: "/knowledge", label: "Knowledge base", icon: "knowledge" },
  { href: "/reporting", label: "Reporting", icon: "reporting" },
] as const;

function NavigationIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  const shared = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "inbox") return <svg {...shared}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 9v3h6V9"/></svg>;
  if (name === "drafts") return <svg {...shared}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>;
  if (name === "triage") return <svg {...shared}><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="4"/></svg>;
  if (name === "knowledge") return <svg {...shared}><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z"/><path d="M5 5h12M9 8h5M9 11h7"/></svg>;
  return <svg {...shared}><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/></svg>;
}

function ChevronDown() {
  return <svg className="sidebar-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewStatus, setViewStatus] = useState<ViewStatus>("All");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [viewError, setViewError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSavedViews(readSavedViews()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!viewDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setViewDialogOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewDialogOpen]);

  function saveView(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = viewName.trim();
    if (!name) { setViewError("Enter a name for this view."); return; }
    const view = { id: window.crypto.randomUUID(), name, status: viewStatus, unassignedOnly };
    const next = [...savedViews, view];
    try { window.localStorage.setItem(savedViewsKey, JSON.stringify(next)); }
    catch { setViewError("This browser could not save the view. Check its storage settings and try again."); return; }
    setSavedViews(next);
    setViewName("");
    setViewStatus("All");
    setUnassignedOnly(false);
    setViewError("");
    setViewDialogOpen(false);
    router.push(`/?view=${encodeURIComponent(view.id)}`);
    window.dispatchEvent(new CustomEvent("supportpilot:select-view", { detail: view.id }));
  }

  function removeView(id: string) {
    const next = savedViews.filter(view => view.id !== id);
    try { window.localStorage.setItem(savedViewsKey, JSON.stringify(next)); }
    catch { return; }
    setSavedViews(next);
  }

  return <aside className="sidebar" aria-label="SupportPilot workspace">
    <Link className="brand" href="/" aria-label="SupportPilot home"><span className="brand-mark"><i/><i/><i/><i/></span><span className="brand-name">supportpilot</span><span className="beta">BETA</span></Link>
    <button className="workspace" type="button"><b>N</b><span><strong>Northstar Studio</strong><small>Free workspace</small></span><ChevronDown/></button>
    <p className="nav-label">WORKSPACE</p>
    <nav className="nav-list" aria-label="Workspace navigation">
      {navigation.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return <Link key={item.href} className={`nav-link ${active ? "active" : ""}`} href={item.href} aria-current={active ? "page" : undefined}>
          <span className="icon"><NavigationIcon name={item.icon}/></span><span className="nav-link-label">{item.label}</span>{item.href === "/" && <small>7</small>}
        </Link>;
      })}
    </nav>
    <p className="nav-label views-label">YOUR VIEWS <button type="button" aria-label="Create a view" onClick={() => setViewDialogOpen(true)}>+</button></p>
    <Link className="view-link" href="/?view=my-open" onClick={() => window.dispatchEvent(new CustomEvent("supportpilot:select-view", { detail: "my-open" }))}><i className="green-dot"/>My open tickets</Link>
    <Link className="view-link" href="/?view=unassigned" onClick={() => window.dispatchEvent(new CustomEvent("supportpilot:select-view", { detail: "unassigned" }))}><i className="orange-dot"/>Unassigned</Link>
    {savedViews.map(view => <div className="saved-view-row" key={view.id}><Link className="view-link" href={`/?view=${encodeURIComponent(view.id)}`} onClick={() => window.dispatchEvent(new CustomEvent("supportpilot:select-view", { detail: view.id }))}><i className="green-dot"/>{view.name}</Link><button type="button" aria-label={`Delete ${view.name} view`} title="Delete view" onClick={() => removeView(view.id)}>×</button></div>)}
    <button className="add-view" type="button" onClick={() => setViewDialogOpen(true)}>+ Add a view</button>
    {viewDialogOpen && <div className="view-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setViewDialogOpen(false); }}><form className="view-dialog" role="dialog" aria-modal="true" aria-labelledby="view-dialog-title" onSubmit={saveView}><div className="view-dialog-title"><div><p>CUSTOM INBOX FILTER</p><h2 id="view-dialog-title">Create a view</h2></div><button type="button" aria-label="Close dialog" onClick={() => setViewDialogOpen(false)}>×</button></div><label className="view-dialog-field">View name<input autoFocus maxLength={40} value={viewName} onChange={event => { setViewName(event.target.value); setViewError(""); }} placeholder="e.g. Billing follow-ups"/></label><label className="view-dialog-field">Ticket status<select value={viewStatus} onChange={event => setViewStatus(event.target.value as ViewStatus)}><option>All</option><option>Open</option><option>Pending</option><option>Resolved</option></select></label><label className="view-dialog-check"><input type="checkbox" checked={unassignedOnly} onChange={event => setUnassignedOnly(event.target.checked)}/>Only unassigned tickets</label>{viewError && <p className="view-dialog-error" role="alert">{viewError}</p>}<div className="view-dialog-actions"><button type="button" onClick={() => setViewDialogOpen(false)}>Cancel</button><button type="submit">Save view</button></div></form></div>}
    <div className="sidebar-spacer"/>
    <div className="usage-card"><div><strong>AI usage</strong><b>72%</b></div><span className="usage-track"><i/></span><small>72 of 100 AI actions used</small><a href="#plans">See plans <span aria-hidden="true">→</span></a></div>
    <button className="profile" type="button"><span className="profile-avatar">N</span><span><strong>Naol Umer</strong><small>Admin</small></span><span className="profile-more" aria-hidden="true">···</span></button>
  </aside>;
}
