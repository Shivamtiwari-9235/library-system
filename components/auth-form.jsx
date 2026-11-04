"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Check, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const demoAccounts = {
  librarian: { email: "librarian@library.com", password: "admin123" },
  member: { email: "member@library.com", password: "member123" },
};
const emptyForm = { email: "", password: "" };

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState("member");
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState(demoAccounts.member);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fillDemo = (role) => {
    setMode(role);
    setTab("login");
    setForm(demoAccounts[role]);
    setError("");
  };

  const selectTab = (nextTab, nextMode = mode) => {
    setTab(nextTab);
    setError("");
    if (nextTab === "register") {
      setName("");
      setForm(emptyForm);
    } else {
      setMode(nextMode);
      setForm(demoAccounts[nextMode]);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${tab === "register" ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tab === "register" ? { name, ...form } : form) });
      const result = await response.json();
      if (!response.ok) {
        setError(response.status === 409
          ? "An account with this email already exists. Please switch to Member login and sign in instead."
          : result.error || "Authentication failed.");
      }
      else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("The server is unavailable. Check your MongoDB connection and restart Next.js.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/15 p-2.5"><BookOpen size={22} /></div><span className="text-xl font-bold">lumen<span className="text-violet-200">.</span></span></div><div className="mt-24 max-w-xl"><p className="mb-5 text-sm font-semibold uppercase tracking-[.25em] text-indigo-200">Library operations, simplified</p><h1 className="text-5xl font-bold leading-tight">A smarter way to keep every shelf moving.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-indigo-100">One calm workspace for members, librarians, loans, reservations, and the details that make a great library.</p></div></div>
        <div className="relative grid gap-3 sm:grid-cols-3">{["14-day tracking", "FIFO reservations", "Automatic fines"].map((item) => <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><Check size={17} className="text-emerald-300" /><p className="mt-3 text-sm font-semibold">{item}</p></div>)}</div>
      </section>
      <section className="flex items-center justify-center bg-slate-950 px-5 py-10 sm:px-10"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="rounded-xl bg-indigo-600 p-2.5"><BookOpen size={20} /></div><span className="text-xl font-bold">lumen<span className="text-violet-400">.</span></span></div><div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-black/30 sm:p-8"><div className="mb-7"><div className="mb-4 flex items-center gap-2 text-indigo-300"><Sparkles size={17} /><span className="text-xs font-bold uppercase tracking-widest">Welcome back</span></div><h2 className="text-2xl font-bold">Sign in to your library</h2><p className="mt-2 text-sm text-slate-400">Choose an access level to continue.</p></div>            <div className="grid grid-cols-3 rounded-xl bg-slate-800 p-1 text-xs font-semibold">{["member", "librarian", "register"].map((item) => <button key={item} type="button" onClick={() => selectTab(item === "register" ? "register" : "login", item)} className={`rounded-lg px-2 py-2.5 capitalize transition ${((tab === "register" && item === "register") || (tab === "login" && item === mode)) ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>{item}</button>)}</div><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => fillDemo("librarian")} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-3 text-left text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20">⚡ Quick Login as Demo Librarian</button><button type="button" onClick={() => fillDemo("member")} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-3 text-left text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20">⚡ Quick Login as Demo Member</button></div><form onSubmit={submit} className="mt-6 space-y-4">{tab === "register" && <label className="block text-xs font-semibold text-slate-300">Full name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="auth-input" /></label>}<label className="block text-xs font-semibold text-slate-300"><Mail className="mr-2 inline" size={14} />Email<input required type="email" autoComplete={tab === "register" ? "off" : "email"} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" className="auth-input" /></label><label className="block text-xs font-semibold text-slate-300"><LockKeyhole className="mr-2 inline" size={14} />Password<input required minLength={6} type="password" autoComplete={tab === "register" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 6 characters" className="auth-input" /></label>{error && <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold transition hover:brightness-110 disabled:opacity-50">{loading ? "Please wait..." : tab === "register" ? "Create member account" : `Continue as ${mode}`} {!loading && <ArrowRight size={16} />}</button></form></div></div></section>
    </main>
  );
}
