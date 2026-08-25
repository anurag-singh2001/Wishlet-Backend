# Wishlet Backend API 🎁

The high-performance, modular backend service for **Wishlet** — a micro SaaS application for creating personalized mini websites for special occasions (Birthdays, Anniversaries, Celebrations, Thank You notes, and Apologies).

Built with **Fastify**, **TypeScript**, **Prisma ORM**, **PostgreSQL (Neon)**, and **Cloudinary CDN**.

---

## 🚀 Tech Stack

- **Framework**: [Fastify](https://fastify.dev/) (Fast & low overhead Node.js framework)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) managed via [Neon](https://neon.tech/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Storage & CDN**: [Cloudinary](https://cloudinary.com/) (Direct signed uploads & CDN delivery)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: Node Test Runner / [tsx](https://github.com/privatenumber/tsx)

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL / Neon Database connection string
- Cloudinary Account (Cloud Name, API Key, API Secret)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anurag-singh2001/Wishlet-Backend.git
   cd Wishlet-Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. Configure `.env`:
   ```env
   PORT=3001
   HOST=0.0.0.0
   NODE_ENV=development
   DATABASE_URL="postgresql://user:password@ep-host.aws.neon.tech/neondb?sslmode=require"
   CORS_ORIGIN=http://localhost:3000
   FRONTEND_URL=http://localhost:3000

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

5. Push Prisma database schema:
   ```bash
   npx prisma db push
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

The backend server will start on `http://localhost:3001`.

---

## 📋 API Endpoints

### 🩺 Health
- `GET /health` — Returns server health status.

### 🎁 Wishes
- `GET /api/v1/wishes` — API usage guide.
- `POST /api/v1/wishes` — Creates a new Wishlet and returns public shareable URL.
- `GET /api/v1/wishes/:slug` — Fetches a public Wishlet by unique URL slug.
- `DELETE /api/v1/wishes/:slug` — Deletes a Wishlet and purges associated Cloudinary media.

### 🎨 Templates
- `GET /api/v1/templates` — Lists available Wishlet design templates.

### 🖼️ Photo Uploads
- `POST /api/v1/uploads/signature` — Generates a signed SHA-1 authorization token for direct browser-to-Cloudinary CDN uploads.
- `POST /api/v1/uploads/image` — Server-assisted photo upload endpoint with local preview fallback.

---

## 📜 Available NPM Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `tsx watch src/server.ts` | Starts local dev server with hot reload |
| `build` | `tsc` | Compiles TypeScript into `/dist` |
| `start` | `node dist/server.js` | Starts compiled production server |
| `typecheck` | `tsc --noEmit` | Runs static type check |
| `lint` | `eslint src/` | Runs ESLint code style check |
| `test` | `tsx --test src/__tests__/*.test.ts` | Executes automated unit test suite |

---

## 🔒 Security & Privacy

- **No Public API Secrets**: `CLOUDINARY_API_SECRET` and database credentials remain strictly server-side.
- **Signed CDN Uploads**: Direct uploads require time-bound SHA-1 signatures from backend authorization.
- **CORS Protection**: Origin validation restricted via `CORS_ORIGIN`.

---

## 📄 License

MIT License © [Anurag Singh](https://github.com/anurag-singh2001)
