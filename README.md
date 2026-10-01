# Riwaayat Closet

Riwaayat Closet is a premium, view-only catalogue for Indian ethnic wear: **Where Tradition Meets Elegance**. Customers can browse, search, filter, sort, open an article, view its media, price, details and availability. There is no customer account, cart, checkout, payment, order or review workflow.

#Live url
https://riwaayat-vert.vercel.app/

## Features

The public experience includes an editorial home page, category rail, paginated collection, backend-driven search across article metadata, category/price/status filters, sorting, responsive cards, detail galleries with fullscreen images and responsive video controls, an about page, SEO files, loading states, empty states and friendly errors. The private experience includes username/password admin login, dashboard counts, listing CRUD, status transitions, media upload previews, file limits, and delete confirmation.

## Architecture

The preview uses a Vite React client and an Express API. The API owns validation, listing queries, hashed admin authentication, file uploads and the local development repository. Production deployment should swap the repository/storage adapter to Supabase PostgreSQL and the `riwaayat-media` Storage bucket using the SQL migration and policies in `migrations/001_initial_schema.sql`; browser code never receives the service-role key.

The local repository in `data/` is a real server-owned development persistence adapter so the preview is usable without external credentials. It is intentionally not a claim that production is using fake data: production should provide Supabase credentials and migrate the tables before deployment.

## Tech stack

- React + TypeScript + Vite
- Express + TypeScript
- Zod validation, bcryptjs password hashing, Helmet, CORS, cookie-parser, Multer
- Supabase PostgreSQL + Supabase Storage for production
- Free-tier friendly assets and lazy-loaded catalogue imagery

## Folder structure

- `src/` — public/admin React UI, service calls and design system
- `server.ts` — REST API, auth, uploads, repository adapter and static serving
- `data/` — local development persistence, created on first start and excluded from production secrets
- `public/assets/` — catalogue imagery used by the preview
- `public/manus-routes.json`, `robots.txt`, `sitemap.xml` — route and SEO support
- `migrations/` — complete Supabase schema and storage policy notes
- `scripts/create-admin.ts` — hashed admin creation utility

## Local setup

```bash
npm install
npm run create-admin
npm run build
npm start
```

The default development seed account is created automatically on first start only when `data/admin.json` does not exist. For a controlled account, run `npm run create-admin -- --username=your-id --password='your-long-password'` before starting. Never commit `data/admin.json` or real credentials.

To run the TypeScript server directly during development:

```bash
npm run dev
```

## Environment variables

Copy `backend/.env.example` to your deployment environment and keep `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and any database credentials server-only. `frontend/.env.example` documents the browser API URL expected if the client and API are split. The current same-origin preview does not need a public API URL.

Relevant variables include `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV`, `MAX_IMAGE_SIZE_MB` and `MAX_VIDEO_SIZE_MB`.

## Supabase setup

1. Create a Supabase Free project.
2. Run `migrations/001_initial_schema.sql` in the SQL editor.
3. Create a Storage bucket named `riwaayat-media`.
4. Keep uploads and deletes backend-only with the service role; expose only public/signed read URLs needed by the catalogue.
5. Use `listings/{listingId}/images/` and `listings/{listingId}/videos/` as storage paths.
6. Add Supabase URL and keys to the backend runtime only.

The database stores listing metadata and file references, never image/video binaries. Listing media has a foreign key with `on delete cascade`.

## API

Public: `GET /api/health`, `GET /api/categories`, `GET /api/listings?page=1&limit=12&search=&category=&minPrice=&maxPrice=&status=&sort=`, `GET /api/listings/:slug`.

Authentication: `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`.

Admin: `GET /api/admin/dashboard`, `GET /api/admin/listings`, `GET /api/admin/listings/:id`, `POST /api/admin/listings` (multipart `media`), `PATCH /api/admin/listings/:id`, `PATCH /api/admin/listings/:id/status`, `DELETE /api/admin/listings/:id`.

Responses use `{ success: true, data }` or `{ success: false, message }`. Admin APIs reject unauthenticated requests.

## Deployment

The frontend can be published as a Vercel/Render static build and the Express API can run as a Render Free web service. Alternatively, keep the compiled Vite assets and Express API in one container. The app listens on `PORT` (default 3000), binds to `0.0.0.0`, and has an unauthenticated `/api/health` endpoint for readiness. Keep CORS restricted to the configured frontend origin when split.

## Free-tier limitations

Supabase Free and Render/Vercel free tiers have finite database, storage, bandwidth, build-minute, sleep/idle and request limits. This project avoids storing media in the database, lazy-loads images, paginates listing metadata, does not load catalogue videos on cards, and places configurable file-size limits on uploads. Review current provider limits before a busy public launch; they are not unlimited.

## Troubleshooting

- If the preview is empty, run `npm run build` and then `npm start`; the managed preview expects port 3000 unless changed in project runtime configuration.
- If login fails, run `npm run create-admin` and confirm the username/password, then restart the server.
- If uploads fail, check file type/size and the `public/uploads` directory permissions.
- If a public article is missing, inspect `data/listings.json` and the server logs; the API intentionally returns a friendly 404 without a stack trace.
- For Supabase deployment, confirm RLS policies, Storage bucket policies, and backend-only service-role environment variables before enabling mutations.
