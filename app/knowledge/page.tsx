"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { initialKnowledgeArticles, type KnowledgeArticle } from "@/lib/knowledge-data";

type ArticleStatus = KnowledgeArticle["status"];

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState(initialKnowledgeArticles);
  const [selectedId, setSelectedId] = useState(initialKnowledgeArticles[0].id);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState(initialKnowledgeArticles[0].title);
  const [summary, setSummary] = useState(initialKnowledgeArticles[0].summary);
  const [content, setContent] = useState(initialKnowledgeArticles[0].content);
  const [status, setStatus] = useState<ArticleStatus>(initialKnowledgeArticles[0].status);
  const [databaseMode, setDatabaseMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    void fetch("/api/knowledge", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { mode?: string; articles?: KnowledgeArticle[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load knowledge articles.");
        return result;
      })
      .then((result) => {
        if (!current || !result.articles) return;
        setArticles(result.articles);
        setDatabaseMode(result.mode === "database");
        const first = result.articles[0];
        if (first) {
          setSelectedId(first.id);
          setTitle(first.title);
          setSummary(first.summary);
          setContent(first.content);
          setStatus(first.status);
        }
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : "Could not load knowledge articles.");
      });
    return () => { current = false; };
  }, []);

  const visibleArticles = useMemo(() => {
    const term = query.trim().toLowerCase();
    return articles.filter((article) => `${article.title} ${article.summary} ${article.content}`.toLowerCase().includes(term));
  }, [articles, query]);

  function selectArticle(article: KnowledgeArticle) {
    setSelectedId(article.id);
    setTitle(article.title);
    setSummary(article.summary);
    setContent(article.content);
    setStatus(article.status);
    setCreating(false);
    setMessage("");
    setError("");
  }

  function newArticle() {
    setSelectedId("");
    setTitle("");
    setSummary("");
    setContent("");
    setStatus("DRAFT");
    setCreating(true);
    setMessage("");
    setError("");
  }

  async function saveArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 120 || !cleanContent || summary.length > 240 || cleanContent.length > 12000) {
      setError("Add a title, summary of up to 240 characters, and article content of up to 12,000 characters.");
      return;
    }
    const input = { title: cleanTitle, summary: summary.trim(), content: cleanContent, status };
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let saved: KnowledgeArticle;
      if (databaseMode) {
        const response = await fetch(creating ? "/api/knowledge" : `/api/knowledge/${encodeURIComponent(selectedId)}`, {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const result = await response.json() as { article?: KnowledgeArticle; error?: string };
        if (!response.ok || !result.article) throw new Error(result.error ?? "Could not save article.");
        saved = result.article;
      } else {
        const slugBase = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "article";
        const existing = articles.find((article) => article.id === selectedId);
        saved = {
          id: existing?.id ?? `demo-${Date.now()}`,
          slug: slugBase,
          ...input,
          updatedAt: new Date().toISOString(),
        };
      }
      setArticles((rows) => [saved, ...rows.filter((article) => article.id !== saved.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setSelectedId(saved.id);
      setTitle(saved.title);
      setSummary(saved.summary);
      setContent(saved.content);
      setStatus(saved.status);
      setCreating(false);
      setMessage("Article saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save article.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/></span>supportpilot<span className="beta">BETA</span></Link>
      <button className="workspace"><b>N</b><span><strong>Northstar Studio</strong><small>Free workspace</small></span><span className="chevron">⌄</span></button>
      <p className="nav-label">WORKSPACE</p>
      <nav className="nav-list" aria-label="Workspace navigation">
        <Link className="nav-link" href="/"><span className="icon" aria-hidden="true">▤</span>Inbox</Link>
        <button className="nav-link"><span className="icon" aria-hidden="true">✧</span>AI drafts <small>3</small></button>
        <Link className="nav-link active" href="/knowledge"><span className="icon" aria-hidden="true">▣</span>Knowledge base</Link>
        <button className="nav-link"><span className="icon" aria-hidden="true">▥</span>Reporting</button>
      </nav>
      <p className="nav-label views-label">YOUR VIEWS</p>
      <div className="view-link"><i className="green-dot"/>My open tickets <small>4</small></div>
      <div className="view-link"><i className="orange-dot"/>Unassigned <small>2</small></div>
      <div className="sidebar-spacer"/>
      <div className="usage-card"><div><strong>AI usage</strong><b>72%</b></div><span className="usage-track"><i/></span><small>72 of 100 AI actions used</small><a href="#plans">See plans →</a></div>
      <button className="profile"><span className="profile-avatar">N</span><span><strong>Naol Umer</strong><small>Admin</small></span><span className="profile-more">···</span></button>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <strong>Knowledge base</strong></div><div className="top-actions"><label className="search"><span className="icon" aria-hidden="true">⌕</span><input aria-label="Search knowledge articles" placeholder="Search knowledge..." value={query} onChange={(event) => setQuery(event.target.value)}/><kbd>⌘ K</kbd></label><button className="top-icon" aria-label="Notifications">♧<i/></button><button className="help">?</button></div></header>
      <div className="content knowledge-content">
        <div className="knowledge-heading"><div><div className="eyebrow"><i/> WORKSPACE RESOURCES</div><h1>Knowledge base</h1><p>Keep trusted answers close. Your AI drafts will use published articles as sources.</p></div><button className="knowledge-new" onClick={newArticle}>＋ New article</button></div>
        {error && <p className="save-error" role="alert">{error}</p>}
        <section className="knowledge-stats" aria-label="Knowledge base summary">
          <article><span>All articles</span><strong>{articles.length}</strong></article>
          <article><span>Published</span><strong>{articles.filter((article) => article.status === "PUBLISHED").length}</strong></article>
          <article><span>Drafts</span><strong>{articles.filter((article) => article.status === "DRAFT").length}</strong></article>
          <p>Published articles can be retrieved as evidence when preparing an AI reply.</p>
        </section>
        <section className="knowledge-panel" aria-label="Knowledge articles">
          <div className="knowledge-list">
            <div className="knowledge-list-head"><div><h2>Articles <span>{visibleArticles.length}</span></h2><p>Search and maintain your support guidance</p></div><button className="knowledge-add" onClick={newArticle} aria-label="Create an article">＋</button></div>
            <div className="knowledge-items">{visibleArticles.length ? visibleArticles.map((article) => <button key={article.id} className={`knowledge-item ${selectedId === article.id && !creating ? "selected" : ""}`} onClick={() => selectArticle(article)}>
              <span className={`knowledge-status ${article.status.toLowerCase()}`}>{article.status === "PUBLISHED" ? "Published" : "Draft"}</span><strong>{article.title}</strong><span className="knowledge-summary">{article.summary || "No summary yet"}</span><small>Updated {shortDate(article.updatedAt)}</small>
            </button>) : <div className="knowledge-empty">No articles match your search.</div>}</div>
            <div className="knowledge-list-foot">{articles.length} articles in this workspace</div>
          </div>
          <form className="knowledge-editor" onSubmit={saveArticle}>
            <div className="knowledge-editor-head"><div><span className="editor-kicker">{creating ? "NEW ARTICLE" : "ARTICLE EDITOR"}</span><h2>{creating ? "Create an article" : title || "Edit article"}</h2></div><label className={`knowledge-status ${status.toLowerCase()}`}><span>Status</span><select aria-label="Article status" value={status} onChange={(event) => setStatus(event.target.value as ArticleStatus)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label></div>
            <label className="knowledge-field">Title<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="For example, How refunds work" required/></label>
            <label className="knowledge-field">Short summary<span className="field-hint">{summary.length}/240</span><input value={summary} maxLength={240} onChange={(event) => setSummary(event.target.value)} placeholder="A one-sentence overview for your team"/></label>
            <label className="knowledge-field knowledge-body-field">Article content<textarea value={content} maxLength={12000} onChange={(event) => setContent(event.target.value)} placeholder="Write the steps, policies, and details your team should follow..." required/><span className="field-hint">{content.length.toLocaleString()}/12,000 characters</span></label>
            <div className="knowledge-editor-foot"><span>{message || (databaseMode ? "Changes save to your workspace" : "Demo mode · changes stay in this browser session")}</span><button type="submit" disabled={saving}>{saving ? "Saving..." : creating ? "Create article" : "Save changes"}</button></div>
          </form>
        </section>
        <footer className="footer"><span><i/> Knowledge base ready</span><span>SupportPilot demo workspace <b>·</b> {databaseMode ? "Synced with PostgreSQL" : "Demo content"}</span></footer>
      </div>
    </section>
  </main>;
}