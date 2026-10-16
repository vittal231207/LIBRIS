
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    publisher TEXT,
    publication_year INTEGER,
    total_copies INTEGER NOT NULL DEFAULT 1
        CHECK (total_copies >= 0),
    available_copies INTEGER NOT NULL DEFAULT 1
        CHECK (
            available_copies >= 0
            AND available_copies <= total_copies
        ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    issue_date TEXT NOT NULL DEFAULT (date('now')),
    due_date TEXT NOT NULL,
    returned_at TEXT,
    status TEXT NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued', 'returned')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (book_id) REFERENCES books(id)
        ON DELETE RESTRICT,
    FOREIGN KEY (member_id) REFERENCES members(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_books_title
    ON books(title);

CREATE INDEX IF NOT EXISTS idx_books_author
    ON books(author);

CREATE INDEX IF NOT EXISTS idx_members_name
    ON members(name);

CREATE INDEX IF NOT EXISTS idx_loans_member
    ON loans(member_id);

CREATE INDEX IF NOT EXISTS idx_loans_book
    ON loans(book_id);

CREATE INDEX IF NOT EXISTS idx_loans_due_date
    ON loans(due_date);

CREATE INDEX IF NOT EXISTS idx_loans_status
    ON loans(status);
