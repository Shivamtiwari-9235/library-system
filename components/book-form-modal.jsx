"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";

const initialForm = { title: "", author: "", isbn: "", category: "Fiction", copyCount: 1, description: "" };

export default function BookFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.isbn.trim()) return setError("ISBN is required.");
    if (form.copyCount < 1) return setError("Copies must be at least 1.");
    setSaving(true);
    const response = await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || "Unable to save the book.");
    else { onSaved(payload.data); onClose(); }
    setSaving(false);
  };
  return <div className="modal-backdrop"><form onSubmit={submit} className="modal-card"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">Add a new book</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create the title and its physical copies.</p></div><button type="button" onClick={onClose} className="icon-button"><X size={18} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="field-label">Title<input autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="The Midnight Library" className="form-input" /></label><label className="field-label">Author<input value={form.author} onChange={(event) => update("author", event.target.value)} placeholder="Matt Haig" className="form-input" /></label><label className="field-label">ISBN<input value={form.isbn} onChange={(event) => update("isbn", event.target.value)} placeholder="978..." className="form-input" /></label><label className="field-label">Category<select value={form.category} onChange={(event) => update("category", event.target.value)} className="form-input"><option>Fiction</option><option>Science</option><option>History</option><option>Computer Science</option><option>Technology</option></select></label><div className="field-label">Physical copies<div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><button type="button" onClick={() => update("copyCount", Math.max(1, form.copyCount - 1))} className="counter-button"><Minus size={15} /></button><span className="flex-1 text-center text-sm font-bold">{form.copyCount}</span><button type="button" onClick={() => update("copyCount", Math.min(100, form.copyCount + 1))} className="counter-button"><Plus size={15} /></button></div></div><label className="field-label sm:col-span-2">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="A short description..." rows="3" className="form-input" /></label></div>{error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}<button disabled={saving} className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Create book"}</button></form></div>;
}
