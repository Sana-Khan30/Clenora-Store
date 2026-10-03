# CLENORA — Modern Cleaning Products (MERN E-Commerce)

Clenora is a full-featured MERN (MongoDB Atlas, Express.js, React, Node.js) e-commerce platform engineered for modern cleaning and hygiene supplies. It features an interactive, responsive customer storefront and an authenticated administrative management portal.

---

## 1. Technology Stack

- **Frontend**: React 19 + Vite, custom CSS system (`App.css`, `Admin.css`), Three.js brand loader, modular Context providers (`AuthProvider`, `StoreProvider`).
- **Backend**: Node.js + Express 5, Helmet, CORS, Rate Limiters, Zod input validation, MongoDB sanitization.
- **Database**: MongoDB Atlas (replica set) with Mongoose 9 models, atomic transactions, and sequential order numbering.
- **Authentication**: Stateless JSON Web Tokens (JWT) signed with HS256, bcrypt password hashing (12 rounds), session invalidation via `tokenVersion`.
- **Media Storage**: Cloudinary REST API integration for product image upload, optimization, and cleanup.
- **Payment Method**: Cash on Delivery (COD) with server-side price recalculation and atomic stock locking.
- **WhatsApp**: Click-to-chat integration for general inquiries and prefilled order summaries on checkout success.

---

## 2. Directory Structure

```
Booking-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection (db.js) & Zod env validation (env.js)
│   │   ├── controllers/     # Route controllers (auth, catalog, orders, admin, dashboard, inventory, etc.)
│   │   ├── middleware/      # Auth (JWT), validation, sanitization, rateLimiters, upload (Multer), error handler
│   │   ├── models/          # Category, Product, Order, User, Counter, Setting, InventoryTransaction
│   │   ├── routes/          # Express route definitions (public catalog, auth, orders, settings, admin)
│   │   ├── scripts/         # createAdmin.js (CLI setup) & seedCatalog.js
│   │   ├── services/        # Business logic: order processing, inventory adjustments, dashboard analytics
│   │   ├── utils/           # ApiError, transactions, slugify, response helper
│   │   ├── validators/      # Zod validation schemas for requests
│   │   ├── app.js           # Express app instance and middleware pipeline
│   │   └── server.js        # Server listener and graceful shutdown
│   ├── tests/               # Automated test suite (admin, auth, catalog, orders, validation, foundation)
│   ├── .env.example         # Backend environment variables template
│   └── package.json
├── frontend/
│   ├── public/              # Static assets, 3D glb model
│   ├── src/
│   │   ├── api/             # client.js (Fetch wrapper with FormData support) & endpoints.js
│   │   ├── assets/          # Brand logos and product images
│   │   ├── components/      # Navbar, Sidebar, Footer, ProductCard, CategoryView, WhatsAppButton, ThreeLoader
│   │   ├── context/         # AuthContext/AuthProvider & StoreContext/StoreProvider
│   │   ├── pages/           # Storefront pages (Home, Cart, Checkout, OrderSuccess, Account, Categories) + Admin.jsx
│   │   ├── utils/           # Cart helpers, localStorage wrappers, WhatsApp URL generator
│   │   ├── App.jsx          # Main application router and state management
│   │   ├── App.css          # Main responsive styling
│   │   └── main.jsx
│   ├── .env.example         # Frontend environment variable template
│   └── package.json
└── README.md
```

---

## 3. Environment Variables Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description | Example / Instructions |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP port the Express server listens on | `5000` |
| `MONGODB_URI` | MongoDB Atlas replica set URI with database name | `mongodb+srv://user:pass@cluster.mongodb.net/cleany_store?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for signing JWTs (minimum 32 characters) | Generate via `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `CLIENT_URL` | Allowed frontend origin for CORS (comma-separate if multiple) | `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name (from Cloudinary dashboard) | `dmycloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `abcdefghijklmnopqrstuvwx` |
| `ADMIN_NAME` | Initial admin account name (used once by `create-admin`) | `Admin User` |
| `ADMIN_EMAIL` | Initial admin account email | `admin@clenora.com` |
| `ADMIN_PASSWORD` | Initial admin password (min 12 chars, letter & number) | `SecurePass1234!` |
| `TEST_MONGODB_URI` | *(Optional)* Isolated database for automated test suite | Must end in `_test`, e.g. `.../cleany_test?retryWrites=true&w=majority` |

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
# Development:
VITE_API_URL=http://localhost:5000/api

# Production:
# VITE_API_URL=https://your-api-domain.com/api
```

---

## 4. Setup and Local Development

### 1. Install Dependencies

In backend directory:
```bash
cd backend
npm install
```

In frontend directory:
```bash
cd ../frontend
npm install
```

### 2. Seed Database Catalog (Optional)
To populate 6 core categories and 24 cleaning products into MongoDB Atlas:
```bash
cd backend
npm run seed-catalog
```

### 3. Create First Administrator Account
Configure `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env`, then run:
```bash
cd backend
npm run create-admin
```
*After running, remove the `ADMIN_*` keys from `backend/.env` for security.*

### 4. Start Development Servers

Terminal 1 (Backend API on `http://localhost:5000`):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend Client on `http://localhost:5173`):
```bash
cd frontend
npm run dev
```

---

## 5. Automated Testing

The backend includes a comprehensive 90+ test suite covering security, authentication, catalog filtering, atomic concurrency checkout, inventory audits, and admin authorizations.

Run the test suite:
```bash
cd backend
npm test
```
*Note: Ensure `TEST_MONGODB_URI` is specified in `backend/.env` pointing to a database name ending with `_test`.*

Build the frontend for production:
```bash
cd frontend
npm run build
```

---

## 6. Admin Panel Navigation & Capabilities

Navigate to the Admin Portal via:
1. Direct URL/Router: Select **Admin Portal** in the website footer.
2. Sign-in via `/account`: An authenticated user with role `admin` sees a direct **🛡️ Admin Portal** shortcut.
3. Dedicated Login: If not authenticated, the portal presents a secure Admin Login gate requiring server-verified admin credentials.

### Features:
- **Dashboard**: Total orders, revenue, customer metrics, status breakdown, 14-day sales sparkline, and low-stock warnings.
- **Products**: Complete CRUD, SKU validation, price & sale price management, multi-image upload via Cloudinary, and stock threshold controls.
- **Categories**: Category creation, editing, custom emoji/icon designation, sorting order, and deletion guard.
- **Inventory**: Stock overview, real-time manual stock adjustments with mandatory reason logging, and comprehensive immutable transaction audit logs.
- **Orders**: Status transition workflow (Pending → Confirmed → Processing → Shipped → Delivered / Cancelled), customer contact/address inspection, items snapshot review, and order history notes.
- **Customers**: Customer listing, order history drill-down, and account deactivation (instantly invalidating customer JWT sessions).
- **Settings**: Store name, currency code (`PKR`), currency symbol (`Rs.`), delivery fee, free delivery threshold, and business WhatsApp number configuration with live link test.
