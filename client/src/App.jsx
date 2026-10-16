
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:3001";

const NAV = [
  { id: "overview", icon: "◫", label: "Overview" },
  { id: "books", icon: "▤", label: "Book catalogue" },
  { id: "members", icon: "♙", label: "Members" },
  { id: "loans", icon: "⇄", label: "Circulation" },
  { id: "analytics", icon: "▥", label: "Analytics" },
];

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function StatCard({ icon, label, value, note, accent = "" }) {
  return (
    <article className={`stat-card ${accent}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value ?? "—"}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}

function Empty({ children }) {
  return <div className="empty-state">{children}</div>;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="search-box">
      <span>⌕</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function BookTable({ books, onEdit, onDelete }) {
  const showActions = Boolean(onEdit && onDelete);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>BOOK TITLE</th>
            <th>CATEGORY</th>
            <th>ISBN</th>
            <th>AVAILABILITY</th>
            {showActions && <th>ACTIONS</th>}
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id}>
              <td>
                <div className="book-cell">
                  <div className="book-cover">
                    {book.title?.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong>{book.title}</strong>
                    <small className="table-sub">{book.author}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className="category-pill">
                  {book.category || "General"}
                </span>
              </td>
              <td>{book.isbn || "—"}</td>
              <td>
                <span
                  className={`availability-pill ${
                    book.available_copies > 0
                      ? "available"
                      : "unavailable"
                  }`}
                >
                  <i />
                  {book.available_copies} / {book.total_copies} copies
                </span>
              </td>

              {showActions && (
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => onEdit(book)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button-danger"
                      onClick={() => onDelete(book)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberTable({ members, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>MEMBER</th>
            <th>MEMBER CODE</th>
            <th>EMAIL</th>
            <th>PHONE</th>
            <th>JOINED</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td><strong>{member.name}</strong></td>
              <td>
                <span className="code-pill">{member.member_code}</span>
              </td>
              <td>{member.email || "—"}</td>
              <td>{member.phone || "—"}</td>
              <td>{String(member.joined_at || "").slice(0, 10) || "—"}</td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => onEdit(member)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => onDelete(member)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoanTable({ loans, onReturn, returningId }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>BOOK</th>
            <th>MEMBER</th>
            <th>ISSUED</th>
            <th>DUE DATE</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td>
                <strong>{loan.book_title}</strong>
                <small className="table-sub">
                  {loan.book_isbn || "No ISBN"}
                </small>
              </td>
              <td>
                {loan.member_name}
                <small className="table-sub">{loan.member_code}</small>
              </td>
              <td>{loan.issue_date}</td>
              <td>{loan.due_date}</td>
              <td>
                <span
                  className={`status-pill ${
                    loan.status === "returned"
                      ? "returned"
                      : loan.is_overdue
                        ? "overdue"
                        : "issued"
                  }`}
                >
                  {loan.status === "returned"
                    ? "Returned"
                    : loan.is_overdue
                      ? "Overdue"
                      : "Issued"}
                </span>
              </td>
              <td>
                {loan.status === "issued" && (
                  <button
                    className="return-button"
                    disabled={returningId === loan.id}
                    onClick={() => onReturn(loan.id)}
                  >
                    {returningId === loan.id
                      ? "Returning…"
                      : "Return book"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, eyebrow, onClose, children, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="book-modal"
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {children}
      </form>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("libris-theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const [page, setPage] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [returningId, setReturningId] = useState(null);

  const [bookSearch, setBookSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [loanSearch, setLoanSearch] = useState("");
  const [loanFilter, setLoanFilter] = useState("active");

  const [modal, setModal] = useState("");
  const [formError, setFormError] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);

  const activeNav = NAV.find((item) => item.id === page) || NAV[0];

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const [d, b, m, l, a] = await Promise.all([
        api("/api/dashboard"),
        api("/api/books"),
        api("/api/members"),
        api("/api/loans"),
        api("/api/analytics"),
      ]);

      setDashboard(d);
      setBooks(b);
      setMembers(m);
      setLoans(l);
      setAnalytics(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("libris-theme", theme);
    } catch {
      // The theme still works for this session if storage is unavailable.
    }
  }, [theme]);

  const filteredBooks = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();

    return books.filter((book) =>
      [
        book.title,
        book.author,
        book.isbn,
        book.category,
        book.publisher,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [books, bookSearch]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return members.filter((member) =>
      [
        member.name,
        member.member_code,
        member.email,
        member.phone,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [members, memberSearch]);

  const filteredLoans = useMemo(() => {
    const query = loanSearch.trim().toLowerCase();

    return loans.filter((loan) => {
      const matchesQuery = [
        loan.book_title,
        loan.member_name,
        loan.member_code,
        loan.book_isbn,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        loanFilter === "all" ||
        (loanFilter === "active" && loan.status === "issued") ||
        (loanFilter === "overdue" &&
          loan.status === "issued" &&
          loan.is_overdue) ||
        (loanFilter === "returned" && loan.status === "returned");

      return matchesQuery && matchesStatus;
    });
  }, [loans, loanSearch, loanFilter]);

  function openModal(name) {
    setFormError("");
    setEditingRecord(null);
    setModal(name);
  }

  function closeModal() {
    if (busy) return;
    setModal("");
    setFormError("");
    setEditingRecord(null);
  }

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4500);
  }

  async function submitForm(event, path, transform, successMessage) {
    event.preventDefault();
    setBusy(true);
    setFormError("");

    try {
      const form = new FormData(event.currentTarget);
      const payload = transform(form);

      await api(path, {
        method: modal.startsWith("edit-") ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setModal("");
      setEditingRecord(null);
      notify(successMessage);
      await loadData(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function addBook(event) {
    return submitForm(
      event,
      "/api/books",
      (form) => ({
        title: String(form.get("title") || "").trim(),
        author: String(form.get("author") || "").trim(),
        isbn: String(form.get("isbn") || "").trim() || null,
        category: String(form.get("category") || "").trim() || "General",
        publisher: String(form.get("publisher") || "").trim(),
        publication_year: form.get("year")
          ? Number(form.get("year"))
          : null,
        total_copies: Number(form.get("copies")),
      }),
      "Book added to the catalogue."
    );
  }

  function addMember(event) {
    return submitForm(
      event,
      "/api/members",
      (form) => ({
        member_code: String(form.get("member_code") || "").trim(),
        name: String(form.get("name") || "").trim(),
        email: String(form.get("email") || "").trim() || null,
        phone: String(form.get("phone") || "").trim(),
      }),
      "Member registered successfully."
    );
  }

  function editBook(book) {
    setFormError("");
    setEditingRecord(book);
    setModal("edit-book");
  }

  function editMember(member) {
    setFormError("");
    setEditingRecord(member);
    setModal("edit-member");
  }

  function saveEditedBook(event) {
    if (!editingRecord) {
      event.preventDefault();
      setFormError("No book selected for editing. Close this window and try again.");
      return;
    }

    return submitForm(
      event,
      `/api/books/${editingRecord.id}`,
      (form) => ({
        title: String(form.get("title") || "").trim(),
        author: String(form.get("author") || "").trim(),
        isbn: String(form.get("isbn") || "").trim() || null,
        category: String(form.get("category") || "").trim() || "General",
        publisher: String(form.get("publisher") || "").trim(),
        publication_year: form.get("year")
          ? Number(form.get("year"))
          : null,
        total_copies: Number(form.get("copies")),
      }),
      "Book updated successfully."
    );
  }

  function saveEditedMember(event) {
    if (!editingRecord) {
      event.preventDefault();
      setFormError("No member selected for editing. Close this window and try again.");
      return;
    }

    return submitForm(
      event,
      `/api/members/${editingRecord.id}`,
      (form) => ({
        member_code: String(form.get("member_code") || "").trim(),
        name: String(form.get("name") || "").trim(),
        email: String(form.get("email") || "").trim() || null,
        phone: String(form.get("phone") || "").trim(),
      }),
      "Member updated successfully."
    );
  }

  async function deleteRecord(type, record) {
    const label = type === "books" ? "book" : "member";
    const name = type === "books" ? record.title : record.name;

    const confirmed = window.confirm(
      `Delete ${label} "${name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api(`/api/${type}/${record.id}`, { method: "DELETE" });
      notify(`${label === "book" ? "Book" : "Member"} deleted successfully.`);
      await loadData(false);
    } catch (err) {
      notify(err.message);
    }
  }

  function issueBook(event) {
    return submitForm(
      event,
      "/api/loans",
      (form) => ({
        book_id: Number(form.get("book_id")),
        member_id: Number(form.get("member_id")),
        due_date: String(form.get("due_date") || ""),
      }),
      "Book issued successfully."
    );
  }

  async function returnBook(id) {
    setReturningId(id);

    try {
      await api(`/api/loans/${id}/return`, { method: "POST" });
      notify("Book returned successfully.");
      await loadData(false);
    } catch (err) {
      notify(err.message);
    } finally {
      setReturningId(null);
    }
  }

  const availableBooks = books.filter(
    (book) => book.available_copies > 0
  );

  const activeLoans = loans.filter(
    (loan) => loan.status === "issued"
  ).length;

  const overdueLoans = loans.filter(
    (loan) => loan.status === "issued" && loan.is_overdue
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">libris<span>.</span></div>
          </div>
        </div>

        <div className="side-caption">WORKSPACE</div>

        <nav className="nav-list">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {page === item.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>


      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>{activeNav.label}</strong>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <div className="avatar">L</div>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <h1>
                {{
                  overview: "Good to see you.",
                  books: "Book catalogue.",
                  members: "Your members.",
                  loans: "Circulation desk.",
                  analytics: "Library insights.",
                }[page]}
              </h1>

              <p className="page-description">
                {{
                  overview: "Here's what's happening across your library today.",
                  books: "Discover, search and manage your collection.",
                  members: "Keep your library community organised.",
                  loans: "Issue books, track due dates and process returns.",
                  analytics: "Understand your collection and circulation.",
                }[page]}
              </p>
            </div>

            <div className="header-actions">
              <button
                className="button-secondary"
                onClick={() => loadData()}
                disabled={loading}
              >
                ↻ {loading ? "Refreshing…" : "Refresh"}
              </button>

              {page === "books" && (
                <button
                  className="button-primary"
                  onClick={() => openModal("book")}
                >
                  ＋ Add a book
                </button>
              )}

              {page === "members" && (
                <button
                  className="button-primary"
                  onClick={() => openModal("member")}
                >
                  ＋ Add member
                </button>
              )}

              {page === "loans" && (
                <button
                  className="button-primary"
                  onClick={() => openModal("loan")}
                  disabled={!availableBooks.length || !members.length}
                >
                  ＋ Issue a book
                </button>
              )}
            </div>
          </div>

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="error-panel">
              <strong>Couldn't load library data</strong>
              <p>
                {error}. Make sure your backend is running on port 3001.
              </p>
              <button
                className="button-secondary"
                onClick={() => loadData()}
              >
                Try again
              </button>
            </div>
          )}

          {loading && !dashboard ? (
            <div className="loading-panel">
              Connecting to your library…
            </div>
          ) : (
            <>
              {page === "overview" && (
                <>
                  <section className="stats-grid">
                    <StatCard
                      icon="▤"
                      label="BOOK TITLES"
                      value={dashboard?.books?.titles ?? 0}
                      note="Unique titles in catalogue"
                      accent="violet"
                    />
                    <StatCard
                      icon="▧"
                      label="TOTAL COPIES"
                      value={dashboard?.books?.totalCopies ?? 0}
                      note="Across all book titles"
                      accent="blue"
                    />
                    <StatCard
                      icon="♙"
                      label="REGISTERED MEMBERS"
                      value={dashboard?.members ?? 0}
                      note="People in your library"
                      accent="green"
                    />
                    <StatCard
                      icon="⇄"
                      label="BOOKS ON LOAN"
                      value={activeLoans}
                      note={`${overdueLoans} currently overdue`}
                      accent="orange"
                    />
                  </section>

                  <section className="content-grid">
                    <article className="panel catalogue-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Recently added books</h2>
                          <p>Your library catalogue</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setPage("books")}
                        >
                          View catalogue ↗
                        </button>
                      </div>

                      {books.length ? (
                        <BookTable
                          books={[...books].slice(-5).reverse()}
                        />
                      ) : (
                        <Empty>
                          Your catalogue is empty. Add your first book to begin.
                        </Empty>
                      )}
                    </article>

                    <article className="panel activity-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Library snapshot</h2>
                          <p>Current collection status</p>
                        </div>
                        <span className="panel-icon">◈</span>
                      </div>

                      <div className="availability-number">
                        {dashboard?.books?.availableCopies ?? 0}
                        <span>
                          {" "} / {dashboard?.books?.totalCopies ?? 0} copies available
                        </span>
                      </div>

                      <div className="availability-track">
                        <div
                          style={{
                            width: `${
                              dashboard?.books?.totalCopies
                                ? Math.min(
                                    100,
                                    (dashboard.books.availableCopies /
                                      dashboard.books.totalCopies) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="snapshot-row">
                        <span>Available to borrow</span>
                        <strong>
                          {dashboard?.books?.availableCopies ?? 0}
                        </strong>
                      </div>
                      <div className="snapshot-row">
                        <span>Currently issued</span>
                        <strong>{activeLoans}</strong>
                      </div>
                      <div className="snapshot-row">
                        <span>Overdue returns</span>
                        <strong className="overdue-text">
                          {overdueLoans}
                        </strong>
                      </div>

                      <button
                        className="wide-button"
                        onClick={() => setPage("loans")}
                      >
                        Manage circulation <span>→</span>
                      </button>
                    </article>
                  </section>

                  <section className="panel lower-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Quick actions</h2>
                        <p>Jump straight into your workflow</p>
                      </div>
                    </div>

                    <div className="quick-actions">
                      <button
                        onClick={() => {
                          setPage("books");
                          openModal("book");
                        }}
                      >
                        <span className="quick-icon purple">＋</span>
                        <span>
                          <strong>Add new book</strong>
                          <small>Expand your collection</small>
                        </span>
                        <b>→</b>
                      </button>

                      <button
                        onClick={() => {
                          setPage("members");
                          openModal("member");
                        }}
                      >
                        <span className="quick-icon green">♙</span>
                        <span>
                          <strong>Register member</strong>
                          <small>Welcome a reader</small>
                        </span>
                        <b>→</b>
                      </button>

                      <button
                        onClick={() => {
                          setPage("loans");
                          if (availableBooks.length && members.length) {
                            openModal("loan");
                          }
                        }}
                      >
                        <span className="quick-icon orange">⇄</span>
                        <span>
                          <strong>Issue a book</strong>
                          <small>Start a new loan</small>
                        </span>
                        <b>→</b>
                      </button>
                    </div>
                  </section>
                </>
              )}

              {page === "books" && (
                <section className="panel full-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>All books</h2>
                      <p>
                        {filteredBooks.length} of {books.length} titles
                      </p>
                    </div>
                    <SearchBox
                      value={bookSearch}
                      onChange={setBookSearch}
                      placeholder="Search title, author, ISBN..."
                    />
                  </div>

                  {filteredBooks.length ? (
                    <BookTable
                      books={filteredBooks}
                      onEdit={editBook}
                      onDelete={(book) => deleteRecord("books", book)}
                    />
                  ) : (
                    <Empty>
                      {books.length
                        ? "No matching books. Try another search."
                        : "No books yet. Use Add a book to build your catalogue."}
                    </Empty>
                  )}
                </section>
              )}

              {page === "members" && (
                <section className="panel full-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Registered members</h2>
                      <p>
                        {filteredMembers.length} of {members.length} members
                      </p>
                    </div>
                    <SearchBox
                      value={memberSearch}
                      onChange={setMemberSearch}
                      placeholder="Search name, code, email..."
                    />
                  </div>

                  {filteredMembers.length ? (
                    <MemberTable
                      members={filteredMembers}
                      onEdit={editMember}
                      onDelete={(member) =>
                        deleteRecord("members", member)
                      }
                    />
                  ) : (
                    <Empty>
                      {members.length
                        ? "No matching members. Try another search."
                        : "No members yet. Register your first member."}
                    </Empty>
                  )}
                </section>
              )}

              {page === "loans" && (
                <section className="panel full-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Loans & returns</h2>
                      <p>
                        {activeLoans} active loans · {overdueLoans} overdue
                      </p>
                    </div>
                    <button
                      className="button-primary"
                      onClick={() => openModal("loan")}
                      disabled={!availableBooks.length || !members.length}
                    >
                      ＋ Issue a book
                    </button>
                  </div>

                  <div className="loan-toolbar">
                    <SearchBox
                      value={loanSearch}
                      onChange={setLoanSearch}
                      placeholder="Search book or member..."
                    />

                    <select
                      className="filter-select"
                      value={loanFilter}
                      onChange={(event) =>
                        setLoanFilter(event.target.value)
                      }
                    >
                      <option value="active">Active loans</option>
                      <option value="overdue">Overdue only</option>
                      <option value="returned">Returned books</option>
                      <option value="all">All loans</option>
                    </select>
                  </div>

                  {filteredLoans.length ? (
                    <LoanTable
                      loans={filteredLoans}
                      onReturn={returnBook}
                      returningId={returningId}
                    />
                  ) : (
                    <Empty>
                      {loans.length
                        ? "No loans match the selected filters."
                        : "No loans recorded yet. Issue a book to get started."}
                    </Empty>
                  )}

                  {!availableBooks.length && (
                    <p className="muted">
                      All copies are currently issued or your catalogue is empty.
                    </p>
                  )}

                  {!members.length && (
                    <p className="muted">
                      Register a member before issuing a book.
                    </p>
                  )}
                </section>
              )}

              {page === "analytics" && (
                <section className="analytics-layout">
                  <article className="panel full-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Collection by category</h2>
                        <p>Number of copies in each category</p>
                      </div>
                    </div>

                    {analytics?.categories?.length ? (
                      analytics.categories.map((item) => {
                        const max = Math.max(
                          ...analytics.categories.map(
                            (category) => category.copies
                          ),
                          1
                        );

                        return (
                          <div
                            className="category-row"
                            key={item.category}
                          >
                            <div>
                              <span>
                                {item.category || "Uncategorised"}
                              </span>
                              <strong>{item.copies} copies</strong>
                            </div>
                            <div className="category-track">
                              <div
                                style={{
                                  width: `${(item.copies / max) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <Empty>
                        Add books to see your collection analytics.
                      </Empty>
                    )}
                  </article>

                  <article className="panel analytics-summary">
                    <div className="panel-heading">
                      <div>
                        <h2>Circulation summary</h2>
                        <p>All-time totals</p>
                      </div>
                    </div>

                    <div className="analytics-big">
                      {analytics?.returns ?? 0}
                    </div>
                    <p className="muted">Books successfully returned</p>
                    <div className="analytics-divider" />

                    <div className="snapshot-row">
                      <span>Current loans</span>
                      <strong>{activeLoans}</strong>
                    </div>
                    <div className="snapshot-row">
                      <span>Overdue</span>
                      <strong className="overdue-text">
                        {overdueLoans}
                      </strong>
                    </div>
                    <div className="snapshot-row">
                      <span>Total members</span>
                      <strong>{members.length}</strong>
                    </div>
                    <div className="snapshot-row">
                      <span>Total titles</span>
                      <strong>{books.length}</strong>
                    </div>
                  </article>

                  <article className="panel full-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Daily circulation</h2>
                        <p>Recorded book issues by date</p>
                      </div>
                    </div>

                    {analytics?.circulation?.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>DATE</th>
                              <th>BOOKS ISSUED</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...analytics.circulation]
                              .reverse()
                              .map((item) => (
                                <tr key={item.date}>
                                  <td>{item.date}</td>
                                  <td><strong>{item.total}</strong></td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty>
                        Circulation data will appear here once books are issued.
                      </Empty>
                    )}
                  </article>
                </section>
              )}
            </>
          )}

        </div>
      </main>

      {modal === "book" && (
        <Modal
          title="Add a new book"
          eyebrow="CATALOGUE MANAGEMENT"
          onClose={closeModal}
          onSubmit={addBook}
        >
          <label>
            Book title *
            <input
              name="title"
              required
              maxLength="200"
              placeholder="e.g. The Great Gatsby"
            />
          </label>

          <label>
            Author *
            <input
              name="author"
              required
              maxLength="150"
              placeholder="Author's name"
            />
          </label>

          <div className="form-row">
            <label>
              ISBN
              <input name="isbn" maxLength="30" placeholder="Optional" />
            </label>
            <label>
              Category
              <input
                name="category"
                maxLength="80"
                placeholder="Fiction, Science..."
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Publisher
              <input
                name="publisher"
                maxLength="150"
                placeholder="Publisher"
              />
            </label>
            <label>
              Publication year
              <input
                name="year"
                type="number"
                min="0"
                max={new Date().getFullYear()}
                placeholder="2024"
              />
            </label>
          </div>

          <label>
            Total copies
            <input
              name="copies"
              type="number"
              min="0"
              max="100000"
              defaultValue="1"
              required
            />
          </label>

          {formError && <p className="form-error">{formError}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? "Saving…" : "Save book ↗"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "edit-book" && editingRecord && (
        <Modal
          title="Edit book"
          eyebrow="CATALOGUE MANAGEMENT"
          onClose={closeModal}
          onSubmit={saveEditedBook}
        >
          <label>
            Book title *
            <input
              name="title"
              required
              maxLength="200"
              defaultValue={editingRecord.title || ""}
            />
          </label>

          <label>
            Author *
            <input
              name="author"
              required
              maxLength="150"
              defaultValue={editingRecord.author || ""}
            />
          </label>

          <div className="form-row">
            <label>
              ISBN
              <input
                name="isbn"
                maxLength="30"
                defaultValue={editingRecord.isbn || ""}
              />
            </label>
            <label>
              Category
              <input
                name="category"
                maxLength="80"
                defaultValue={editingRecord.category || ""}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Publisher
              <input
                name="publisher"
                maxLength="150"
                defaultValue={editingRecord.publisher || ""}
              />
            </label>
            <label>
              Publication year
              <input
                name="year"
                type="number"
                min="0"
                max={new Date().getFullYear()}
                defaultValue={editingRecord.publication_year ?? ""}
              />
            </label>
          </div>

          <label>
            Total copies
            <input
              name="copies"
              type="number"
              min="0"
              max="100000"
              defaultValue={editingRecord.total_copies ?? 1}
              required
            />
          </label>

          <p className="muted">
            Copies currently on loan must remain accounted for. The server
            will validate changes to the total copy count.
          </p>

          {formError && <p className="form-error">{formError}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? "Saving…" : "Save changes ↗"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "member" && (
        <Modal
          title="Register a member"
          eyebrow="MEMBER MANAGEMENT"
          onClose={closeModal}
          onSubmit={addMember}
        >
          <label>
            Member code *
            <input
              name="member_code"
              required
              maxLength="50"
              placeholder="e.g. LIB-001"
            />
          </label>

          <label>
            Full name *
            <input
              name="name"
              required
              maxLength="150"
              placeholder="Member's full name"
            />
          </label>

          <label>
            Email address
            <input
              name="email"
              type="email"
              maxLength="200"
              placeholder="reader@example.com"
            />
          </label>

          <label>
            Phone number
            <input
              name="phone"
              maxLength="30"
              placeholder="Optional contact number"
            />
          </label>

          {formError && <p className="form-error">{formError}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? "Registering…" : "Register member ↗"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "edit-member" && editingRecord && (
        <Modal
          title="Edit member"
          eyebrow="MEMBER MANAGEMENT"
          onClose={closeModal}
          onSubmit={saveEditedMember}
        >
          <label>
            Member code *
            <input
              name="member_code"
              required
              maxLength="50"
              defaultValue={editingRecord.member_code || ""}
            />
          </label>

          <label>
            Full name *
            <input
              name="name"
              required
              maxLength="150"
              defaultValue={editingRecord.name || ""}
            />
          </label>

          <label>
            Email address
            <input
              name="email"
              type="email"
              maxLength="200"
              defaultValue={editingRecord.email || ""}
            />
          </label>

          <label>
            Phone number
            <input
              name="phone"
              maxLength="30"
              defaultValue={editingRecord.phone || ""}
            />
          </label>

          {formError && <p className="form-error">{formError}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? "Saving…" : "Save changes ↗"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "loan" && (
        <Modal
          title="Issue a book"
          eyebrow="CIRCULATION DESK"
          onClose={closeModal}
          onSubmit={issueBook}
        >
          {availableBooks.length === 0 || members.length === 0 ? (
            <Empty>
              You need at least one available book and one registered member
              before creating a loan.
            </Empty>
          ) : (
            <>
              <label>
                Select book *
                <select name="book_id" required defaultValue="">
                  <option value="" disabled>Choose a book</option>
                  {availableBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} — {book.available_copies} available
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Select member *
                <select name="member_id" required defaultValue="">
                  <option value="" disabled>Choose a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.member_code} — {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Due date *
                <input
                  name="due_date"
                  type="date"
                  min={today()}
                  defaultValue={futureDate()}
                  required
                />
              </label>

              <p className="muted">
                Issuing a book reduces its available copy count automatically.
              </p>
            </>
          )}

          {formError && <p className="form-error">{formError}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={busy || !availableBooks.length || !members.length}
              type="submit"
            >
              {busy ? "Issuing…" : "Confirm issue ↗"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
