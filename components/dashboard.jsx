"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Bell, BookOpen, CheckCircle2, Clock3, Library, LogOut, Menu, Moon, Plus, Search, Sun, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import BookFormModal from "@/components/book-form-modal";

const librarianNavigation = [["Dashboard", BarChart3], ["Books Catalog", BookOpen], ["Issue / Return Desk", CheckCircle2], ["Reservations Queue", Clock3], ["Overdue Reports", AlertCircle]];
const memberNavigation = [["Browse Catalog", BookOpen], ["My Borrowed Books", CheckCircle2], ["My Reservations", Clock3], ["Fine Summary", AlertCircle]];
const gradients = ["from-indigo-500 to-violet-600", "from-cyan-500 to-blue-600", "from-amber-400 to-orange-500", "from-emerald-400 to-teal-600", "from-rose-400 to-pink-600"];

function Badge({ children, tone = "available" }) {
  const styles = { available: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500", borrowed: "border-amber-500/20 bg-amber-500/10 text-amber-500", reserved: "border-purple-500/20 bg-purple-500/10 text-purple-500", overdue: "border-rose-500/20 bg-rose-500/10 text-rose-500" };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[tone]}`}>{children}</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("member");
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Browse Catalog");
  const [showBookModal, setShowBookModal] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const loadData = useCallback(async () => {
    const [booksResponse, loansResponse, reservationsResponse] = await Promise.all([
      fetch("/api/books"),
      fetch("/api/borrow"),
      fetch("/api/reservations"),
    ]);
    const [booksPayload, loansPayload, reservationsPayload] = await Promise.all([booksResponse.json(), loansResponse.json(), reservationsResponse.json()]);
    if (!booksResponse.ok) throw new Error(booksPayload.error || "Unable to load books.");
    if (!loansResponse.ok) throw new Error(loansPayload.error || "Unable to load loans.");
    if (!reservationsResponse.ok) throw new Error(reservationsPayload.error || "Unable to load reservations.");
    setBooks(booksPayload.data || []);
    setLoans(loansPayload.data || []);
    setReservations(reservationsPayload.data || []);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me").then((response) => response.json()).then(async ({ user: currentUser }) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      if (!active) return;
      setUser(currentUser);
      setRole(currentUser.role || "member");
      setActiveTab(currentUser.role === "librarian" ? "Dashboard" : "Browse Catalog");
      await loadData();
      if (currentUser.role === "librarian") {
        const membersResponse = await fetch("/api/members");
        const membersPayload = await membersResponse.json();
        if (!membersResponse.ok) throw new Error(membersPayload.error || "Unable to load members.");
        setMembers(membersPayload.data || []);
        setSelectedMemberId(membersPayload.data?.[0]?.id || "");
      }
    }).catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [loadData, router]);

  const visibleBooks = useMemo(() => books.filter((book) => `${book.title} ${book.author} ${book.category} ${book.isbn}`.toLowerCase().includes(query.toLowerCase())), [books, query]);
  const navigation = role === "librarian" ? librarianNavigation : memberNavigation;
  const activeLoans = loans.filter((loan) => !loan.returnedAt);
  const myLoans = activeLoans.filter((loan) => loan.memberId === user?.id);
  const myReservations = reservations.filter((reservation) => reservation.memberId === user?.id);
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 4500); };

  const perform = async (key, url, body, successMessage) => {
    setBusy(key);
    setError("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The action could not be completed.");
      await loadData();
      notify(successMessage(payload));
    } catch (actionError) { setError(actionError.message); } finally { setBusy(""); }
  };

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); };
  const handleSaved = async () => { await loadData(); notify("Book and physical copies added to the catalog."); };
  const issueBook = (book) => {
    const copy = (book.book_copies || []).find((item) => item.status === "available");
    if (!copy) return reserveBook(book);
    const memberId = role === "librarian" ? selectedMemberId : user?.id;
    if (!memberId) return setError("Select a member before issuing a copy.");
    return perform(`issue-${book.id}`, "/api/borrow", { copyId: copy.id || copy._id, memberId }, () => "Book issued. It is due in 14 days.");
  };
  const reserveBook = (book) => perform(`reserve-${book.id}`, "/api/reservations", { bookId: book.id }, () => "You are in the reservation queue.");
  const returnLoan = (loan) => perform(`return-${loan.id}`, "/api/returns", { borrowId: loan.id }, (payload) => payload.fine ? `Book returned. Late fine: ₹${payload.fine}.` : "Book returned on time.");

  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-5 transition-transform dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center gap-3 px-2"><div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 text-white"><Library size={19} /></div><strong className="text-xl tracking-tight">lumen<span className="text-violet-500">.</span></strong></div>
      <p className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</p>
      <nav className="mt-3 space-y-1">{navigation.map(([label, Icon]) => <button key={label} onClick={() => { setActiveTab(label); setMobileMenu(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${activeTab === label ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"}`}><Icon size={17} />{label}</button>)}</nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{(user?.email?.[0] || "U").toUpperCase()}</div><div className="min-w-0"><p className="truncate text-xs font-bold">{user?.fullName || user?.email || "Signed-in user"}</p><Badge tone="available">{role}</Badge></div></div><button onClick={logout} className="mt-4 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-rose-500 dark:hover:bg-slate-800"><LogOut size={15} /> Sign out</button></div>
    </aside>
    <main className="lg:pl-72"><header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-slate-200 bg-slate-50/90 px-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-8"><button onClick={() => setMobileMenu(true)} className="rounded-lg p-2 lg:hidden"><Menu size={20} /></button><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author or ISBN..." className="form-input pl-10" /></div><button onClick={() => { setDark(!dark); document.documentElement.classList.toggle("dark", !dark); }} className="icon-button">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button"><Bell size={18} /></button></header>
      <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{role === "librarian" ? "Librarian workspace" : "Member workspace"}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{activeTab}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Live library data and circulation tools.</p></div>{role === "librarian" && <button onClick={() => setShowBookModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5"><Plus size={17} /> Add new book</button>}</div>
        {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">{error}<button onClick={() => setError("")}><X size={16} /></button></div>}
        {notice && <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-300">{notice}</div>}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={BookOpen} label="Catalog books" value={books.length} /><Metric icon={Users} label={role === "librarian" ? "Active loans" : "Your active loans"} value={role === "librarian" ? activeLoans.length : myLoans.length} /><Metric icon={Clock3} label="Loan policy" value="14 days" /><Metric icon={CheckCircle2} label="Fine rate" value="₹5/day" /></div>
        <PolicyCard role={role} />
        {role === "librarian" && activeTab === "Issue / Return Desk" && <div className="surface-card mb-6 flex flex-wrap items-center gap-3 p-5"><label className="text-sm font-bold" htmlFor="issue-member">Issue copies to</label><select id="issue-member" value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} className="form-input max-w-sm"><option value="">Select a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {member.email}</option>)}</select><p className="text-xs text-slate-500">Choose a member, then issue an available copy from the catalog below.</p></div>}
        {(activeTab === "Issue / Return Desk" || activeTab === "My Borrowed Books" || activeTab === "Fine Summary" || activeTab === "Overdue Reports") && <LoanPanel loans={role === "librarian" ? activeLoans : myLoans} librarian={role === "librarian"} busy={busy} onReturn={returnLoan} fineOnly={activeTab === "Fine Summary"} overdueOnly={activeTab === "Overdue Reports"} />}
        {(activeTab === "Reservations Queue" || activeTab === "My Reservations") && <ReservationPanel reservations={role === "librarian" ? reservations : myReservations} />}
        <section className="surface-card p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Books catalog</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search by title, author, ISBN, then issue or reserve a copy.</p></div><Badge tone="available">{visibleBooks.length} results</Badge></div>{visibleBooks.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No books found. Add your first title or adjust your search.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleBooks.map((book, index) => <BookCard key={book.id} book={book} gradient={gradients[index % gradients.length]} role={role} busy={busy} hasReservation={myReservations.some((item) => item.bookId === book.id && ["waiting", "held"].includes(item.status))} onIssue={issueBook} onReserve={reserveBook} canIssue={role !== "librarian" || Boolean(selectedMemberId)} />)}</div>}</section>
      </div>
    </main>
    {showBookModal && <BookFormModal onClose={() => setShowBookModal(false)} onSaved={handleSaved} />}
  </div>;
}

function Metric({ icon: Icon, label, value }) { return <div className="surface-card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"><Icon size={19} /></div><p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold capitalize">{value}</p></div>; }

function PolicyCard({ role }) {
  return <section className="surface-card mb-6 border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-bold">Borrowing & return policy</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Books are issued for 14 days. Late returns cost ₹5 per overdue day.</p></div><Badge tone="available">Clear terms</Badge></div><div className="mt-4 grid gap-3 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3"><p><strong className="block text-slate-900 dark:text-white">Return a book</strong>{role === "librarian" ? "Open Issue / Return Desk below and select Return copy." : "Bring the book to a librarian; they will confirm the return in the desk."}</p><p><strong className="block text-slate-900 dark:text-white">Reservations</strong>When copies are unavailable, join the FIFO queue. A returned copy is held for the first member.</p><p><strong className="block text-slate-900 dark:text-white">Borrowing limit</strong>Members can have up to 3 active books at once.</p></div></section>;
}

function BookCard({ book, gradient, role, busy, hasReservation, onIssue, onReserve, canIssue }) {
  const available = (book.book_copies || []).filter((copy) => copy.status === "available").length;
  const total = book.book_copies?.length || 0;
  const actionKey = `${available ? "issue" : "reserve"}-${book.id}`;
  return <article className="surface-card lift overflow-hidden p-3"><div className={`relative flex h-40 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}><BookOpen className="absolute -bottom-5 -right-4 text-white/15" size={130} /><strong className="relative text-4xl text-white/90">{book.title.split(" ").slice(0, 2).map((word) => word[0]).join("")}</strong><div className="absolute right-2 top-2"><Badge tone={available ? "available" : "borrowed"}>{available ? "Available" : "Borrowed"}</Badge></div></div><div className="px-1 pt-4"><h3 className="truncate font-bold">{book.title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{book.author}</p><div className="mt-4 flex justify-between border-t border-slate-200 pt-3 text-xs dark:border-slate-800"><span>{book.category}</span><strong className={available ? "text-emerald-500" : "text-amber-500"}>{available}/{total} available</strong></div>{(role === "member" || role === "librarian") && <button disabled={Boolean(busy) || (role === "member" && hasReservation) || !canIssue} onClick={() => available ? onIssue(book) : role === "member" ? onReserve(book) : null} className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">{busy === actionKey ? "Working..." : role === "librarian" ? canIssue ? "Issue to selected member" : "Select a member first" : hasReservation ? "Already in queue" : available ? "Borrow this book" : "Join reservation queue"}</button>}</div></article>;
}

function LoanPanel({ loans, librarian, busy, onReturn, fineOnly, overdueOnly }) {
  const filtered = loans.filter((loan) => !fineOnly || loan.fineRupees > 0).filter((loan) => !overdueOnly || new Date(loan.dueAt) < new Date());
  return <section className="surface-card mb-6 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{fineOnly ? "Fine summary" : overdueOnly ? "Overdue report" : librarian ? "Issue / return desk" : "Your borrowed books"}</h2><p className="mt-1 text-xs text-slate-500">{librarian ? "Confirm physical returns here to release copies and calculate fines." : "Return books to the library desk before the due date to avoid fines."}</p></div>{librarian && <Badge tone="available">Librarian action</Badge>}</div>{filtered.length === 0 ? <p className="py-8 text-sm text-slate-500">No matching loans.</p> : <div className="mt-4 space-y-3">{filtered.map((loan) => <div key={loan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div><p className="font-semibold">{loan.title}</p><p className="mt-1 text-xs text-slate-500">Due {new Date(loan.dueAt).toLocaleDateString()} {librarian && ` · ${loan.memberEmail}`}</p></div><div className="flex items-center gap-3">{new Date(loan.dueAt) < new Date() && <Badge tone="overdue">Overdue</Badge>}{loan.fineRupees > 0 && <Badge tone="overdue">₹{loan.fineRupees} fine</Badge>}{librarian && <button disabled={busy === `return-${loan.id}`} onClick={() => onReturn(loan)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === `return-${loan.id}` ? "Returning..." : "Return copy"}</button>}</div></div>)}</div>}</section>;
}

function ReservationPanel({ reservations }) { return <section className="surface-card mb-6 p-5"><h2 className="text-lg font-bold">Reservation queue</h2>{reservations.length === 0 ? <p className="py-8 text-sm text-slate-500">No active reservations.</p> : <div className="mt-4 space-y-3">{reservations.map((reservation, index) => <div key={reservation.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800"><span><strong>#{index + 1}</strong> {reservation.title}</span><Badge tone={reservation.status === "held" ? "reserved" : "borrowed"}>{reservation.status === "held" ? "Ready for pickup" : "Waiting"}</Badge></div>)}</div>}</section>; }
