
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./database/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Libris Library Management System 📚",
    health: "/api/health",
    dashboard: "/api/dashboard",
    books: "/api/books",
    members: "/api/members",
    loans: "/api/loans",
    analytics: "/api/analytics"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Libris Library Management System",
    database: "connected",
  });
});

// Dashboard statistics
app.get("/api/dashboard", (req, res) => {
  const books = db.prepare(`
    SELECT
      COUNT(*) AS titles,
      COALESCE(SUM(total_copies), 0) AS totalCopies,
      COALESCE(SUM(available_copies), 0) AS availableCopies
    FROM books
  `).get();

  const members = db.prepare(`
    SELECT COUNT(*) AS total FROM members
  `).get();

  const issued = db.prepare(`
    SELECT COUNT(*) AS total
    FROM loans
    WHERE status = 'issued'
  `).get();

  const overdue = db.prepare(`
    SELECT COUNT(*) AS total
    FROM loans
    WHERE status = 'issued'
      AND due_date < date('now')
  `).get();

  res.json({
    books,
    members: members.total,
    issuedBooks: issued.total,
    overdueBooks: overdue.total,
  });
});

// List and search books
app.get("/api/books", (req, res) => {
  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();

  let sql = `
    SELECT * FROM books
    WHERE (
      title LIKE @search
      OR author LIKE @search
      OR isbn LIKE @search
    )
  `;

  const params = { search: `%${search}%` };

  if (category) {
    sql += " AND category = @category";
    params.category = category;
  }

  sql += " ORDER BY title COLLATE NOCASE";

  res.json(db.prepare(sql).all(params));
});

// Add a book
app.post("/api/books", (req, res) => {
  const {
    isbn,
    title,
    author,
    category = "General",
    publisher = "",
    publication_year = null,
    total_copies = 1,
  } = req.body;

  if (
    typeof title !== "string" || !title.trim() ||
    typeof author !== "string" || !author.trim()
  ) {
    return res.status(400).json({
      error: "Book title and author are required.",
    });
  }

  if (
    !Number.isInteger(total_copies) ||
    total_copies < 0 ||
    (publication_year !== null &&
      (!Number.isInteger(publication_year) ||
        publication_year < 0 ||
        publication_year > new Date().getFullYear()))
  ) {
    return res.status(400).json({
      error: "Invalid copy count or publication year.",
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO books (
        isbn, title, author, category, publisher,
        publication_year, total_copies, available_copies
      )
      VALUES (
        @isbn, @title, @author, @category, @publisher,
        @publication_year, @total_copies, @total_copies
      )
    `).run({
      isbn: isbn?.trim() || null,
      title: title.trim(),
      author: author.trim(),
      category: typeof category === "string" && category.trim()
        ? category.trim()
        : "General",
      publisher: typeof publisher === "string" ? publisher.trim() : "",
      publication_year,
      total_copies,
    });

    res.status(201).json(
      db.prepare("SELECT * FROM books WHERE id = ?").get(result.lastInsertRowid)
    );
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "A book with this ISBN already exists.",
      });
    }

    console.error(error);
    res.status(500).json({ error: "Unable to create book." });
  }
});

// Update an existing book
app.patch("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid book ID." });
  }

  const {
    isbn,
    title,
    author,
    category = "General",
    publisher = "",
    publication_year = null,
    total_copies,
  } = req.body;

  if (
    typeof title !== "string" || !title.trim() ||
    typeof author !== "string" || !author.trim()
  ) {
    return res.status(400).json({
      error: "Book title and author are required.",
    });
  }

  if (
    !Number.isInteger(total_copies) ||
    total_copies < 0 ||
    (publication_year !== null &&
      (!Number.isInteger(publication_year) ||
        publication_year < 0 ||
        publication_year > new Date().getFullYear()))
  ) {
    return res.status(400).json({
      error: "Invalid copy count or publication year.",
    });
  }

  if (isbn != null && typeof isbn !== "string") {
    return res.status(400).json({ error: "ISBN must be text." });
  }

  try {
    const updateBook = db.transaction(() => {
      const existing = db.prepare(
        "SELECT * FROM books WHERE id = ?"
      ).get(id);

      if (!existing) {
        throw Object.assign(new Error("Book not found."), { status: 404 });
      }

      const outstanding = existing.total_copies - existing.available_copies;

      if (total_copies < outstanding) {
        throw Object.assign(
          new Error(`At least ${outstanding} copies are currently on loan.`),
          { status: 409 }
        );
      }

      db.prepare(`
        UPDATE books
        SET isbn = ?, title = ?, author = ?, category = ?,
            publisher = ?, publication_year = ?, total_copies = ?,
            available_copies = ?
        WHERE id = ?
      `).run(
        isbn?.trim() || null,
        title.trim(),
        author.trim(),
        typeof category === "string" && category.trim()
          ? category.trim()
          : "General",
        typeof publisher === "string" ? publisher.trim() : "",
        publication_year,
        total_copies,
        total_copies - outstanding,
        id
      );

      return db.prepare("SELECT * FROM books WHERE id = ?").get(id);
    });

    res.json(updateBook());
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "That ISBN is already assigned to another book.",
      });
    }

    console.error(error);
    res.status(500).json({ error: "Unable to update book." });
  }
});

// Delete a book only when it has no loan history
app.delete("/api/books/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid book ID." });
  }

  try {
    const book = db.prepare(
      "SELECT id FROM books WHERE id = ?"
    ).get(id);

    if (!book) {
      return res.status(404).json({ error: "Book not found." });
    }

    const history = db.prepare(
      "SELECT COUNT(*) AS total FROM loans WHERE book_id = ?"
    ).get(id).total;

    if (history > 0) {
      return res.status(409).json({
        error: "This book has loan history and cannot be deleted. Keep the record to preserve circulation history.",
      });
    }

    db.prepare("DELETE FROM books WHERE id = ?").run(id);
    res.json({ message: "Book deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete book." });
  }
});


// List and search members
app.get("/api/members", (req, res) => {
  const search = String(req.query.search || "").trim();

  res.json(db.prepare(`
    SELECT * FROM members
    WHERE name LIKE @search
       OR member_code LIKE @search
       OR email LIKE @search
    ORDER BY name COLLATE NOCASE
  `).all({ search: `%${search}%` }));
});

// Register a member
app.post("/api/members", (req, res) => {
  const { member_code, name, email = null, phone = "" } = req.body;

  if (
    typeof member_code !== "string" || !member_code.trim() ||
    typeof name !== "string" || !name.trim()
  ) {
    return res.status(400).json({
      error: "Member code and name are required.",
    });
  }

  try {
    const result = db.prepare(`
      INSERT INTO members (member_code, name, email, phone)
      VALUES (@member_code, @name, @email, @phone)
    `).run({
      member_code: member_code.trim(),
      name: name.trim(),
      email: typeof email === "string" && email.trim()
        ? email.trim()
        : null,
      phone: typeof phone === "string" ? phone.trim() : "",
    });

    res.status(201).json(
      db.prepare("SELECT * FROM members WHERE id = ?").get(result.lastInsertRowid)
    );
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "That member code or email is already registered.",
      });
    }

    console.error(error);
    res.status(500).json({ error: "Unable to register member." });
  }
});


// Update an existing member
app.patch("/api/members/:id", (req, res) => {
  const id = Number(req.params.id);
  const { member_code, name, email = null, phone = "" } = req.body;

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid member ID." });
  }

  if (
    typeof member_code !== "string" || !member_code.trim() ||
    typeof name !== "string" || !name.trim()
  ) {
    return res.status(400).json({
      error: "Member code and name are required.",
    });
  }

  if (
    email != null &&
    typeof email !== "string"
  ) {
    return res.status(400).json({ error: "Email must be text." });
  }

  try {
    const existing = db.prepare(
      "SELECT id FROM members WHERE id = ?"
    ).get(id);

    if (!existing) {
      return res.status(404).json({ error: "Member not found." });
    }

    db.prepare(`
      UPDATE members
      SET member_code = ?, name = ?, email = ?, phone = ?
      WHERE id = ?
    `).run(
      member_code.trim(),
      name.trim(),
      email?.trim() || null,
      typeof phone === "string" ? phone.trim() : "",
      id
    );

    res.json(db.prepare(
      "SELECT * FROM members WHERE id = ?"
    ).get(id));
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "That member code or email is already registered.",
      });
    }

    console.error(error);
    res.status(500).json({ error: "Unable to update member." });
  }
});

// Delete a member only when they have no loan history
app.delete("/api/members/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid member ID." });
  }

  const member = db.prepare(
    "SELECT id FROM members WHERE id = ?"
  ).get(id);

  if (!member) {
    return res.status(404).json({ error: "Member not found." });
  }

  const history = db.prepare(
    "SELECT COUNT(*) AS total FROM loans WHERE member_id = ?"
  ).get(id).total;

  if (history > 0) {
    return res.status(409).json({
      error: "This member has borrowing history and cannot be deleted, even if all books have been returned. Their record is retained to preserve library circulation history.",
    });
  }

  db.prepare("DELETE FROM members WHERE id = ?").run(id);
  res.json({ message: "Member deleted successfully." });
});

// View loans with member and book details
app.get("/api/loans", (req, res) => {
  const loans = db.prepare(`
    SELECT
      loans.*,
      books.title AS book_title,
      books.isbn AS book_isbn,
      members.name AS member_name,
      members.member_code
    FROM loans
    JOIN books ON books.id = loans.book_id
    JOIN members ON members.id = loans.member_id
    ORDER BY loans.id DESC
  `).all();

  res.json(loans.map((loan) => ({
    ...loan,
    is_overdue:
      loan.status === "issued" &&
      loan.due_date < new Date().toISOString().slice(0, 10),
  })));
});

// Issue a book
app.post("/api/loans", (req, res) => {
  const { book_id, member_id, due_date } = req.body;

  if (
    !Number.isInteger(book_id) ||
    !Number.isInteger(member_id) ||
    typeof due_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(due_date)
  ) {
    return res.status(400).json({
      error: "Provide valid book, member and due-date values.",
    });
  }

  const parsedDate = new Date(`${due_date}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== due_date ||
    due_date < new Date().toISOString().slice(0, 10)
  ) {
    return res.status(400).json({
      error: "Due date must be a valid date today or later.",
    });
  }

  const issueBook = db.transaction(() => {
    const book = db.prepare(
      "SELECT * FROM books WHERE id = ?"
    ).get(book_id);

    if (!book) throw Object.assign(new Error("Book not found."), { status: 404 });
    if (book.available_copies < 1) {
      throw Object.assign(new Error("No copies are available."), { status: 409 });
    }

    const member = db.prepare(
      "SELECT id FROM members WHERE id = ?"
    ).get(member_id);

    if (!member) {
      throw Object.assign(new Error("Member not found."), { status: 404 });
    }

    const result = db.prepare(`
      INSERT INTO loans (book_id, member_id, due_date)
      VALUES (?, ?, ?)
    `).run(book_id, member_id, due_date);

    db.prepare(`
      UPDATE books
      SET available_copies = available_copies - 1
      WHERE id = ?
    `).run(book_id);

    return db.prepare("SELECT * FROM loans WHERE id = ?")
      .get(result.lastInsertRowid);
  });

  try {
    res.status(201).json(issueBook());
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error(error);
    res.status(500).json({ error: "Unable to issue book." });
  }
});

// Return a book
app.post("/api/loans/:id/return", (req, res) => {
  const loanId = Number(req.params.id);

  if (!Number.isInteger(loanId) || loanId < 1) {
    return res.status(400).json({ error: "Invalid loan ID." });
  }

  const returnBook = db.transaction(() => {
    const loan = db.prepare(
      "SELECT * FROM loans WHERE id = ?"
    ).get(loanId);

    if (!loan) {
      throw Object.assign(new Error("Loan not found."), { status: 404 });
    }

    if (loan.status === "returned") {
      throw Object.assign(new Error("This book has already been returned."), {
        status: 409,
      });
    }

    db.prepare(`
      UPDATE loans
      SET status = 'returned', returned_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'issued'
    `).run(loanId);

    db.prepare(`
      UPDATE books
      SET available_copies = available_copies + 1
      WHERE id = ?
    `).run(loan.book_id);

    return db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId);
  });

  try {
    res.json(returnBook());
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error(error);
    res.status(500).json({ error: "Unable to return book." });
  }
});

// Analytics
app.get("/api/analytics", (req, res) => {
  const categories = db.prepare(`
    SELECT category, SUM(total_copies) AS copies
    FROM books
    GROUP BY category
    ORDER BY copies DESC
  `).all();

  const circulation = db.prepare(`
    SELECT issue_date AS date, COUNT(*) AS total
    FROM loans
    WHERE issue_date >= date('now', '-29 days')
    GROUP BY issue_date
    ORDER BY issue_date
  `).all();

  const returns = db.prepare(`
    SELECT COUNT(*) AS total
    FROM loans
    WHERE status = 'returned'
  `).get();

  res.json({ categories, circulation, returns: returns.total });
});

// Friendly 404 response
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) return next(error);

  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`📚 Libris API running at http://localhost:${PORT}`);
});
