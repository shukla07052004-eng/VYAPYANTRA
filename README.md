# BizLedger Pro v2.0

Professional accounting SaaS — Billwise-style business management system built with React + Vite.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📁 Project Structure

```
src/
├── App.jsx                        # Root: router, layout, keyboard shortcuts
├── main.jsx                       # Entry point
├── index.css                      # Global styles (B&W mono theme)
│
├── data/
│   └── store.js                   # All seed data & constants
│
├── utils/
│   └── helpers.js                 # fmt, fmtShort, initials, etc.
│
├── context/
│   ├── AppContext.jsx              # Global state (invoices, parties, ...)
│   └── ToastContext.jsx            # Toast notifications
│
├── hooks/
│   ├── useKeyboardShortcuts.js    # Ctrl+B/I/K handlers
│   └── useInvoiceForm.js          # Invoice form state & validation
│
├── components/
│   ├── ui/                        # Reusable UI primitives
│   │   ├── Button.jsx
│   │   ├── Form.jsx               # Input, Select, Textarea, FormGrid
│   │   ├── Card.jsx               # Card, CardHead, CardBody, KpiCard, PageHeader
│   │   ├── Badge.jsx              # Badge, Avatar
│   │   ├── Table.jsx              # Sortable, keyboard-navigable table
│   │   ├── Modal.jsx              # Accessible modal with Esc/focus trap
│   │   ├── Search.jsx             # SearchInput, FilterPills
│   │   └── index.js               # Barrel export
│   │
│   └── layout/                    # Layout & feature components
│       ├── Sidebar.jsx            # Collapsible sidebar navigation
│       ├── Topbar.jsx             # Top navigation bar
│       ├── InvoiceView.jsx        # Print-ready professional invoice
│       └── NewInvoiceModal.jsx    # Full invoice creation modal
│
└── pages/
    ├── Dashboard.jsx              # KPIs, revenue chart, recent invoices
    ├── Sales.jsx                  # Invoice management, payment recording
    ├── Parties.jsx                # Party list + per-party invoice drill-down
    └── OtherPages.jsx             # Purchase, Expense, Cash&Bank, Dues, Workers, Reports, Backup
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut    | Action              |
|-------------|---------------------|
| `Ctrl + B`  | Toggle sidebar      |
| `Ctrl + I`  | New invoice         |
| `Ctrl + K`  | Focus global search |
| `Esc`       | Close modal         |
| `↑ / ↓`     | Navigate table rows |
| `Enter`     | Open selected row   |

---

## ✨ Features

- **Collapsible sidebar** — icon-only when collapsed, smooth transition
- **Full invoice system** — create with line items, tax, notes; per-party history
- **Professional invoice view** — print-ready, PDF-downloadable structured bill
- **Keyboard-first** — complete app workflow without mouse
- **Strict B&W/Grey theme** — Tally/Zoho Books aesthetic
- **Sortable tables** — click any column header
- **Clean toast** — white background, black text, no colors
- **Data flow** — Parties ↔ Sales ↔ Invoices fully linked
- **React Router** — proper URL-based routing
- **Context API** — centralized state management

---

## 🎨 Theme

The app uses a **strict monochrome palette**:

| Token          | Value    | Usage                  |
|----------------|----------|------------------------|
| `--ink`        | `#111`   | Primary text, buttons  |
| `--ink-60`     | `#555`   | Secondary text         |
| `--ink-40`     | `#888`   | Muted / labels         |
| `--surface`    | `#fff`   | Cards, inputs          |
| `--surface-3`  | `#f5f5f5`| Hover, background      |
| `--border`     | `#e8e8e8`| Borders                |

All colors are defined as CSS variables in `src/index.css`.
