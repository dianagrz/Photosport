# 📷 PhotoSport

**A full-stack marketplace that connects sports photographers with athletes and their families at sporting events.**

PhotoSport lets photographers sign up to cover events, publish photo packages and a portfolio, and deliver photos to their clients. Clients (athletes, parents, teams) can browse upcoming events, find photographers covering them, buy a package, and download their photos from a personal gallery once they're delivered.

### 🌐 [Live demo → dianagrz.github.io/Photosport](https://dianagrz.github.io/Photosport/)

Try it without installing anything. On the login page, pick **Entrar como Cliente** or **Entrar como Fotógrafo**:

| Role | Email | Password |
|------|-------|----------|
| Client | `lorena.tovar24@mail.com` | `cliente24123` |
| Photographer | `fotografo5@photosport.com` | `foto5secure` |

The live demo runs entirely in the browser. See [Local version vs. live demo](#-local-version-vs-live-demo) for how it works.

> The user interface is written in Spanish, since the project was built for a Spanish-speaking audience. This README and the notes below explain the code in English.

---

## ✨ Highlights

- **Three user roles**: *cliente* (client), *fotógrafo* (photographer) and *administrador* (admin), each with its own dashboard, navigation and route guarding.
- **REST API built with Express 5**: about 40 endpoints covering auth, events, packages, purchases, photo uploads and analytics.
- **Relational MySQL design**: 10 normalized tables with foreign keys and cascading rules, plus **stored procedures and SQL functions** for reporting queries.
- **File uploads with Multer**: batch uploads (up to 50 photos per request) for portfolios, profile pictures and photo delivery to clients.
- **Analytics dashboard**: photographers see total revenue, clients served, events covered, monthly revenue charts (Chart.js) and revenue per event.
- **End-to-end purchase flow**: pick a photographer, pick a package and an event, enter athlete details, then go through a simulated checkout. The order is recorded, and the photographer uploads the finished photos to that order.

---

## 🛠 Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | HTML5, CSS3, vanilla JavaScript (Fetch API), Font Awesome, Chart.js |
| Backend    | Node.js, Express 5, CORS, Multer |
| Database   | MySQL (via `mysql2`), stored procedures & functions |
| Storage    | Local filesystem (`/Uploads`) served as static files |

I chose not to use a front-end framework so I could practice DOM manipulation, asynchronous `fetch` calls, and client-side state (`localStorage` / `sessionStorage`) directly.

---

## 🧭 Features by Role

### 👤 Client
- Register and log in
- Browse upcoming events they haven't signed up for yet
- See which photographers are covering each event and view their profiles and portfolios
- Hire a photographer: choose a package and event, and enter athlete details (name, age, category, branch, team, events/heats)
- Simulated payment screen that confirms the purchase
- "My events" view showing each order's delivery status
- Private gallery with the photos delivered for each purchase

### 📸 Photographer
- Create and edit a professional profile (specialty, experience, bio, profile photo)
- Upload, preview and manage a portfolio
- Create, edit and delete photo **packages** (price, coverage, description)
- Sign up to cover upcoming events, and see the events they're signed up for
- See the client list for each event, with each order's athlete details
- **Deliver photos** to a specific order, which automatically marks it as delivered
- **Statistics dashboard**: total revenue, clients served, events covered, revenue by month (line chart) and by event

### 🛡 Administrator
- Dashboard, event management, user management and statistics screens
- Backend endpoints for creating events and accepting event requests (`/eventos`, `/solicitud_evento`)
- *The admin screens are currently UI prototypes and aren't connected to the API yet. The live demo links to them from the login page.*

---

## 🏗 Architecture

```
Browser (HTML + vanilla JS)
        │  fetch() → JSON
        ▼
Express REST API  ──  Multer (file uploads → /Uploads)
        │  mysql2 (parameterized queries, CALL procedures)
        ▼
MySQL database: tables + stored procedures + functions
```

- **`Assets/JS/conexion.js`**: the Express server. It serves the static front end *and* the JSON API from the same origin on port `3000`. On startup it also runs a small migration check (`ensureCompraDetailColumns`) that adds any missing columns to the `compra` (purchase) table, so older databases keep working.
- **`Assets/JS/page-binding.js`**: shared front-end module loaded on every page. It:
  - defines a single `API_BASE` and an `apiUrl()` helper,
  - redirects pages opened through `file://` to the running server,
  - **guards routes by role**: client pages require a client session and photographer pages require a photographer session; anyone else is sent back to the login page,
  - handles logout and clears session state.
- **Per-role page scripts** (`ClientJS/`, `PhotographerJS/`) keep each view's logic small and focused.

### Database design

The core entities and how they relate:

```
cliente ──< compra >── paquete_fotografico >── fotografo
               │                                   │
               └────── evento ──< fotografo_evento >┘
compra ──< foto_entregada        fotografo ──< foto_portafolio
```

Reporting logic lives in the database rather than in JavaScript, for example:

- Procedures: `eventos_por_fotografo`, `eventos_no_inscritos_fotografo`, `eventos_por_cliente`, `eventos_no_inscritos_cliente`, `ingresos_por_mes`, `ingresos_por_evento`, `portafolio_por_fotografo`, `foto_por_compra`
- Functions: `ingresos_totales`, `clientes_atendidos`, `eventos_cubiertos`, `total_fotos_guardadas`, `eventos_inscritos`

---

## 🧪 Local version vs. live demo

GitHub Pages can only host static files, so it can't run the Express server or the MySQL database. For the live demo, a small **in-browser mock backend** (`Assets/JS/demo/mock-api.js`) stands in for them.

| | Local version | Live demo (GitHub Pages) |
|---|---|---|
| Backend | Express REST API (`conexion.js`) | `mock-api.js` intercepts `fetch()` calls to the API and answers them in the browser |
| Database | MySQL with stored procedures & functions | Seed data in `seed-data.json`, generated from `Database/photosportData.sql`; the procedures' logic is reimplemented in JS |
| Persistence | Shared database | Each visitor's own `localStorage`; **Reiniciar demo** restores the original data |
| Photo uploads | Saved to `/Uploads` with Multer | Resized in the browser and stored as `data:` URLs |
| Payments | Simulated | Simulated |

**How it switches:** `mock-api.js` is the first script on every page. It only turns on when the site is served from `*.github.io` or opened with `?demo=1`; otherwise it returns immediately and the pages talk to the real API. Because the page code is **exactly the same in both modes**, the mock returns the same JSON shapes as each Express route.

**Why it lives on `main` and not in a separate `deployed` branch:** the demo's *features* differ from the local version (no shared database), but its *code* doesn't. Every page and page script is shared, and the demo is one isolated layer that is off by default. A separate branch would copy ~50 files that are otherwise identical, and it would fall behind every time `main` changed. With one branch, every push to `main` redeploys the demo automatically through GitHub Actions (`.github/workflows/pages.yml`).

Demo-only extras, all added by `scripts/build-demo-seed.js` and none written to the SQL files:
- sport names, photographer bios and profile pictures
- purchase dates, so the revenue charts have data
- placeholder portfolio and delivered photos (`Assets/IMG/demo/`)
- a date shift, so the next event is always a few weeks away

---

## 📁 Project Structure

```
Photosport/
├── Assets/
│   ├── CSS/style.css              # Shared styles / dashboard layout
│   ├── IMG/                       # Static images (+ demo/ placeholders)
│   └── JS/
│       ├── conexion.js            # Express server + REST API
│       ├── page-binding.js        # API base URL, route guards, session helpers
│       ├── mainLogin.js           # Login logic
│       ├── registro.js            # Sign-up logic
│       ├── demo/                  # Live-demo layer (mock API + seed data)
│       ├── ClientJS/              # Client page scripts
│       └── PhotographerJS/        # Photographer page scripts
├── Database/
│   ├── photosportSchema.sql       # Tables, procedures and functions
│   └── photosportData.sql         # Sample seed data
├── Pages/
│   ├── index.html                 # Login
│   ├── registro.html              # Sign up
│   ├── client/                    # Client views
│   ├── photographer/              # Photographer views
│   └── admin/                     # Admin views (UI prototypes)
├── scripts/build-demo-seed.js     # Converts the SQL seed into demo JSON
├── .github/workflows/pages.yml    # Deploys the live demo to GitHub Pages
├── index.html                     # Redirects to Pages/index.html
├── Uploads/                       # Created at runtime for uploaded photos (git-ignored)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- MySQL 8 (or MariaDB)

### 1. Clone and install
```bash
git clone https://github.com/dianagrz/Photosport.git
cd Photosport
npm install
```

### 2. Set up the database
```bash
mysql -u root -p < Database/photosportSchema.sql
mysql -u root -p PHOTOSPORT < Database/photosportData.sql   # optional sample data
```

The connection settings are at the top of `Assets/JS/conexion.js` (`host: localhost`, `user: root`, empty password, database `PHOTOSPORT`). Change them to match your local MySQL setup.

### 3. Run the server
```bash
npm start            # same as: node Assets/JS/conexion.js
```

### 4. Open the app
Go to **http://localhost:3000**. You can register a new client or photographer account, or log in with one from the sample data.

### Try the demo mode locally (no MySQL needed)
Serve the folder with any static server and add `?demo=1` to the URL:
```bash
npx serve .          # or: python3 -m http.server
# open http://localhost:3000/?demo=1  (use the port your server prints)
```
Add `?demo=0` to turn demo mode off again. If you change `Database/photosportData.sql`, regenerate the demo data with `npm run build:demo`. The deploy workflow also runs this step on every push.

### Deploying the live demo
The workflow in `.github/workflows/pages.yml` publishes the static site on every push to `main`. It's a one-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

---

## 🔌 API Overview

A sample of the endpoints exposed by the server:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/registro` · `/login` | Create an account / authenticate a client or photographer |
| `GET`  | `/eventos` · `/eventos/:id` | List events / get event details |
| `GET`  | `/eventos/no-inscritos/:fotografoId` | Upcoming events a photographer hasn't signed up for |
| `GET`  | `/fotografos/evento/:eventoId` | Photographers covering an event |
| `POST` | `/inscribir` | Sign a photographer up for an event |
| `GET/POST/PUT/DELETE` | `/paquetes[/:id]` | Manage photo packages |
| `POST` | `/compra` · `GET /compra/:id` | Create a purchase / get an order and its photos |
| `POST` | `/upload` | Upload photos (`tipo`: portfolio, `perfil`, or `entrega`) |
| `GET`  | `/clientes/:fotografoId/:eventoId` | A photographer's clients for an event |
| `GET`  | `/fotografo/:id/ingresos_por_mes` · `/ingresos_por_evento` · `/ingresos_totales` | Revenue analytics |

---

## 💡 What I Learned

- Designing a relational schema from real-world requirements, and choosing between `ON DELETE CASCADE` and `SET NULL` so that historical purchases are kept when related records are deleted.
- Moving aggregation and reporting into **stored procedures and functions**, which keeps the API layer thin.
- Building a REST API with Express, including multipart file uploads and serving user-uploaded content.
- Handling client-side state and role-based navigation without a framework.
- Connecting a multi-step purchase flow across pages with `sessionStorage`.
- Making a full-stack app deployable on static hosting: I wrote a drop-in mock layer that intercepts `fetch()` and copies the API's behavior, without changing any page code.

## 🔭 Future Improvements

These are next steps I've identified to make the project production-ready:

- **Security**: hash passwords (e.g. bcrypt) and replace `localStorage` IDs with server-verified sessions or JWTs, with authorization checks on every endpoint.
- **Configuration**: move database credentials into environment variables (`.env`).
- **Admin panel**: connect the admin screens to the API.
- **Payments**: replace the simulated checkout with a real payment provider (e.g. Stripe).
- **Storage**: move uploads to cloud object storage and generate thumbnails.
- **Testing**: add automated API tests and input validation. The mock API's routes could double as a contract test for the real ones.

---

## 👩‍💻 Author

**Diana** ([@dianagrz](https://github.com/dianagrz))
