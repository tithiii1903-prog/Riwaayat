import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.basename(__dirname) === 'dist-server' ? path.resolve(__dirname, '..') : path.resolve(__dirname);
const publicDir = path.join(rootDir, 'public');
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(publicDir, 'uploads');
const listingsPath = path.join(dataDir, 'listings.json');
const adminPath = path.join(dataDir, 'admin.json');
const categories = ['Lehenga', 'Saree', 'Bridal Wear', 'Anarkali', 'Suit', 'Sharara', 'Gharara', 'Dupatta', 'Other'];
const statuses = ['available', 'out_of_stock', 'sold'];
const now = () => new Date().toISOString();
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const publicMedia = (id, fileUrl, mediaType, sortOrder, storagePath = fileUrl) => ({ id, fileUrl, storagePath, mediaType, sortOrder, createdAt: now() });
const seedListings = [
    {
        id: '0be1a6c0-4e57-48c3-a7ce-2c5d58f10711', title: 'Noor Maroon Bridal Lehenga', slug: 'noor-maroon-bridal-lehenga', category: 'Bridal Wear', price: 24999,
        description: 'A deep maroon bridal set layered with zardozi-inspired embroidery, quiet shimmer, and a sweeping silhouette made for the evening light.',
        fabric: 'Silk blend', color: 'Deep maroon', work: 'Zari, sequins & hand-finish detailing', occasion: 'Bridal / Wedding', size: 'XS–XL', customization: 'Blouse and length adjustments available', additionalNotes: 'Includes lehenga, blouse and dupatta.', status: 'available', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z',
        media: [publicMedia('m-1', '/assets/maroon-lehenga.jpg', 'image', 0), publicMedia('m-2', '/assets/gold-embroidery.jpg', 'image', 1), publicMedia('m-3', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 'video', 2, 'remote/flower.mp4')],
    },
    {
        id: '2a0e4db6-2db1-4d68-a4b1-3f6fb2f2af113', title: 'Gulab Ivory Saree', slug: 'gulab-ivory-saree', category: 'Saree', price: 12990,
        description: 'An ivory drape with a wine border and delicate floral work—graceful enough for an intimate gathering, luminous enough for a celebration.',
        fabric: 'Georgette', color: 'Ivory & wine', work: 'Floral border embroidery', occasion: 'Festive / Evening', size: 'Free size', status: 'available', createdAt: '2026-09-24T10:00:00.000Z', updatedAt: '2026-09-24T10:00:00.000Z',
        media: [publicMedia('m-4', '/assets/cream-saree.jpg', 'image', 0), publicMedia('m-5', '/assets/embroidery-detail.jpg', 'image', 1)],
    },
    {
        id: 'd77a8927-7657-4666-9c35-f285d88f4a22', title: 'Aabha Copper Silk Saree', slug: 'aabha-copper-silk-saree', category: 'Saree', price: 8990,
        description: 'A warm copper silk with an easy fall and a softly gleaming pallu, chosen for its flattering drape and heirloom warmth.',
        fabric: 'Art silk', color: 'Copper brown', work: 'Woven border', occasion: 'Festive / Occasion', size: 'Free size', status: 'out_of_stock', createdAt: '2026-09-19T10:00:00.000Z', updatedAt: '2026-09-19T10:00:00.000Z',
        media: [publicMedia('m-6', '/assets/copper-saree.jpg', 'image', 0)],
    },
    {
        id: 'e56a61af-9a9f-4b5d-976d-71e2db12b532', title: 'Meher Embroidered Sharara', slug: 'meher-embroidered-sharara', category: 'Sharara', price: 18990,
        description: 'A champagne-and-maroon sharara set composed around soft movement, ornate cuffs, and an embroidered dupatta that catches the light.',
        fabric: 'Organza & silk blend', color: 'Champagne & maroon', work: 'Threadwork and cutdana', occasion: 'Mehendi / Festive', size: 'S–XL', customization: 'Color pairing available on request', status: 'sold', createdAt: '2026-09-14T10:00:00.000Z', updatedAt: '2026-09-14T10:00:00.000Z',
        media: [publicMedia('m-7', '/assets/maroon-lehenga.jpg', 'image', 0), publicMedia('m-8', '/assets/gold-embroidery.jpg', 'image', 1)],
    },
];
const listingInput = z.object({
    title: z.string().trim().min(2).max(120), category: z.enum(categories), price: z.coerce.number().positive().max(10000000), description: z.string().trim().min(10).max(5000),
    fabric: z.string().trim().max(120).optional().or(z.literal('')), color: z.string().trim().max(120).optional().or(z.literal('')), work: z.string().trim().max(180).optional().or(z.literal('')),
    occasion: z.string().trim().max(120).optional().or(z.literal('')), size: z.string().trim().max(120).optional().or(z.literal('')), customization: z.string().trim().max(240).optional().or(z.literal('')),
    additionalNotes: z.string().trim().max(500).optional().or(z.literal('')), status: z.enum(statuses).default('available'),
});
async function readJson(filePath, fallback) {
    try {
        return JSON.parse(await fs.readFile(filePath, 'utf8'));
    }
    catch {
        return fallback;
    }
}
async function writeJson(filePath, value) { await fs.writeFile(filePath, JSON.stringify(value, null, 2)); }
const sessionsPath = path.join(dataDir, 'sessions.json');
async function loadSessions() {
    const stored = await readJson(sessionsPath, {});
    const currentTime = Date.now();
    for (const [token, session] of Object.entries(stored)) {
        if (session && session.expiresAt > currentTime) {
            sessions.set(token, session);
        }
    }
}
async function persistSessions() {
    const obj = {};
    const currentTime = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (session.expiresAt > currentTime) {
            obj[token] = session;
        }
    }
    await writeJson(sessionsPath, obj);
}
async function ensureStore() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(uploadsDir, { recursive: true });
    try {
        await fs.access(listingsPath);
    }
    catch {
        await writeJson(listingsPath, seedListings);
    }
    const envUsername = process.env.RIWAAYAT_ADMIN_USERNAME || process.env.RIWAAYAT_DEV_USERNAME;
    const envPassword = process.env.RIWAAYAT_ADMIN_PASSWORD || process.env.RIWAAYAT_DEV_PASSWORD;
    const existingAdmin = await getAdmin();
    if (!existingAdmin) {
        const username = (envUsername || 'admin').trim();
        const password = envPassword || 'Riwaayat!2026';
        const record = { id: crypto.randomUUID(), username, passwordHash: await bcrypt.hash(password, 12), createdAt: now(), updatedAt: now() };
        await writeJson(adminPath, record);
    }
    else if (envUsername && envPassword) {
        const isMatchingUser = existingAdmin.username === envUsername.trim();
        const isMatchingPass = await bcrypt.compare(envPassword, existingAdmin.passwordHash);
        if (!isMatchingUser || !isMatchingPass) {
            existingAdmin.username = envUsername.trim();
            existingAdmin.passwordHash = await bcrypt.hash(envPassword, 12);
            existingAdmin.updatedAt = now();
            await writeJson(adminPath, existingAdmin);
        }
    }
    await loadSessions();
}
async function getListings() { return readJson(listingsPath, []); }
async function saveListings(listings) { await writeJson(listingsPath, listings); }
async function getAdmin() { return readJson(adminPath, null); }
const sessions = new Map();
const cookieName = 'riwaayat_admin_session';
const isPreviewOrProduction = Boolean(process.env.MANUS_PROJECT_ID) || process.env.NODE_ENV === 'production';
const sessionCookieOptions = { httpOnly: true, sameSite: (isPreviewOrProduction ? 'none' : 'lax'), secure: isPreviewOrProduction, maxAge: 1000 * 60 * 60 * 8, path: '/' };
const getSession = (req) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const cookieToken = req.cookies?.[cookieName];
    const token = bearerToken || cookieToken;
    const session = token ? sessions.get(token) : undefined;
    if (!session || session.expiresAt < Date.now())
        return null;
    return { token, ...session };
};
const requireAuth = (req, res, next) => { const session = getSession(req); if (!session)
    return res.status(401).json({ success: false, message: 'Authentication required' }); req.admin = session.username; next(); };
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, frameguard: false }));
const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        const cleanOrigin = origin ? origin.replace(/\/+$/, '') : '';
        if (!origin ||
            allowedOrigins.includes(cleanOrigin) ||
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
            /\.vercel\.app$/i.test(origin) ||
            /\.onrender\.com$/i.test(origin)) {
            return callback(null, true);
        }
        if (!isPreviewOrProduction && allowedOrigins.length === 0) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin is not allowed.'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use('/uploads', express.static(uploadsDir));
const authAttempts = new Map();
const rateLimitAuth = (req, res, next) => {
    const key = req.ip || 'unknown';
    const current = authAttempts.get(key);
    const timestamp = Date.now();
    if (!current || current.resetAt < timestamp)
        authAttempts.set(key, { count: 1, resetAt: timestamp + 60_000 });
    else
        current.count += 1;
    if ((authAttempts.get(key)?.count || 0) > 12)
        return res.status(429).json({ success: false, message: 'Too many login attempts. Please try again shortly.' });
    next();
};
const maxImageBytes = Number(process.env.MAX_IMAGE_SIZE_MB || 8) * 1024 * 1024;
const maxVideoBytes = Number(process.env.MAX_VIDEO_SIZE_MB || 40) * 1024 * 1024;
const upload = multer({
    dest: uploadsDir,
    limits: { files: 12, fileSize: Math.max(maxImageBytes, maxVideoBytes) },
    fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
        callback(null, allowed.includes(file.mimetype));
    },
});
const envelope = (data) => ({ success: true, data });
app.get('/api/health', (_req, res) => res.json(envelope({ status: 'ok', service: 'riwaayat-closet' })));
app.get('/api/categories', (_req, res) => res.json(envelope(categories)));
const listingQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(12),
    search: z.string().trim().max(120).default(''),
    category: z.enum(categories).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    status: z.enum(statuses).optional(),
    sort: z.enum(['newest', 'oldest', 'price-low', 'price-high', 'name-az', 'name-za']).default('newest'),
}).superRefine((value, ctx) => { if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxPrice'], message: 'Maximum price must be greater than minimum price.' }); });
app.get('/api/listings', async (req, res) => {
    const parsedQuery = listingQuery.safeParse(req.query);
    if (!parsedQuery.success)
        return res.status(400).json({ success: false, message: parsedQuery.error.issues[0]?.message || 'Invalid listing query.' });
    const { search, category, status, minPrice = 0, maxPrice = Number.MAX_SAFE_INTEGER, page, limit, sort } = parsedQuery.data;
    let rows = (await getListings()).filter((listing) => {
        const haystack = [listing.title, listing.description, listing.category, listing.fabric, listing.color, listing.work, listing.occasion].filter(Boolean).join(' ').toLowerCase();
        return (!search || haystack.includes(search.toLowerCase())) && (!category || listing.category === category) && (!status || listing.status === status) && listing.price >= minPrice && listing.price <= maxPrice;
    });
    rows.sort((a, b) => sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'name-az' ? a.title.localeCompare(b.title) : sort === 'name-za' ? b.title.localeCompare(a.title) : b.createdAt.localeCompare(a.createdAt));
    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    res.json({ success: true, data: rows.slice(start, start + limit), pagination: { page, limit, total, totalPages } });
});
app.get('/api/listings/:slug', async (req, res) => { const listing = (await getListings()).find((item) => item.slug === req.params.slug); if (!listing)
    return res.status(404).json({ success: false, message: 'Listing not found' }); res.json(envelope(listing)); });
app.post('/api/admin/login', rateLimitAuth, async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const admin = await getAdmin();
    if (!admin || !username || !(await bcrypt.compare(password, admin.passwordHash)) || username !== admin.username)
        return res.status(401).json({ success: false, message: 'The Admin ID or password is incorrect.' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { username, expiresAt: Date.now() + 1000 * 60 * 60 * 8 });
    await persistSessions();
    res.cookie(cookieName, token, sessionCookieOptions);
    res.json(envelope({ username, token }));
});
app.post('/api/admin/logout', async (req, res) => {
    const session = getSession(req);
    if (session?.token) {
        sessions.delete(session.token);
        await persistSessions();
    }
    res.clearCookie(cookieName, { ...sessionCookieOptions, maxAge: undefined });
    res.json(envelope({ loggedOut: true }));
});
app.get('/api/admin/me', requireAuth, (req, res) => res.json(envelope({ username: req.admin })));
app.get('/api/admin/dashboard', requireAuth, async (_req, res) => { const rows = await getListings(); res.json(envelope({ total: rows.length, available: rows.filter((l) => l.status === 'available').length, outOfStock: rows.filter((l) => l.status === 'out_of_stock').length, sold: rows.filter((l) => l.status === 'sold').length, recent: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5) })); });
app.get('/api/admin/listings', requireAuth, async (_req, res) => res.json(envelope(await getListings())));
app.get('/api/admin/listings/:id', requireAuth, async (req, res) => { const listing = (await getListings()).find((item) => item.id === req.params.id); if (!listing)
    return res.status(404).json({ success: false, message: 'Listing not found' }); res.json(envelope(listing)); });
const collectListingFields = (body) => listingInput.parse({ title: body.title, category: body.category, price: body.price, description: body.description, fabric: body.fabric || '', color: body.color || '', work: body.work || '', occasion: body.occasion || '', size: body.size || '', customization: body.customization || '', additionalNotes: body.additionalNotes || '', status: body.status || 'available' });
const validateUploadedFiles = (files) => {
    for (const file of files) {
        const limit = file.mimetype.startsWith('video') ? maxVideoBytes : maxImageBytes;
        if (file.size > limit)
            return `This ${file.mimetype.startsWith('video') ? 'video' : 'image'} is too large. Please upload a smaller file.`;
    }
    return null;
};
const cleanupUploadedFiles = async (files) => { for (const file of files) {
    try {
        await fs.unlink(file.path);
    }
    catch { /* best-effort cleanup */ }
} };
const filesToMedia = (files = [], startAt = 0) => files.map((file, index) => ({ id: crypto.randomUUID(), fileUrl: `/uploads/${file.filename}`, storagePath: `listings/uploads/${file.filename}`, mediaType: file.mimetype.startsWith('video') ? 'video' : 'image', sortOrder: startAt + index, createdAt: now() }));
app.post('/api/admin/listings', requireAuth, upload.array('media', 12), async (req, res) => {
    try {
        const fields = collectListingFields(req.body);
        const files = req.files || [];
        const uploadError = validateUploadedFiles(files);
        if (uploadError) {
            await cleanupUploadedFiles(files);
            return res.status(400).json({ success: false, message: uploadError });
        }
        if (!files.some((file) => file.mimetype.startsWith('image'))) {
            await cleanupUploadedFiles(files);
            return res.status(400).json({ success: false, message: 'Please add at least one image.' });
        }
        const listings = await getListings();
        const baseSlug = slugify(fields.title);
        const slug = listings.some((l) => l.slug === baseSlug) ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
        const listing = { id: crypto.randomUUID(), ...fields, slug, createdAt: now(), updatedAt: now(), media: filesToMedia(files) };
        listings.unshift(listing);
        await saveListings(listings);
        res.status(201).json(envelope(listing));
    }
    catch (error) {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Could not create listing.' });
    }
});
app.patch('/api/admin/listings/:id', requireAuth, upload.array('media', 12), async (req, res) => {
    try {
        const listings = await getListings();
        const index = listings.findIndex((item) => item.id === req.params.id);
        if (index < 0)
            return res.status(404).json({ success: false, message: 'Listing not found' });
        const fields = collectListingFields(req.body);
        const files = req.files || [];
        const current = listings[index];
        const uploadError = validateUploadedFiles(files);
        if (uploadError) {
            await cleanupUploadedFiles(files);
            return res.status(400).json({ success: false, message: uploadError });
        }
        if (!current.media.some((media) => media.mediaType === 'image') && !files.some((file) => file.mimetype.startsWith('image'))) {
            await cleanupUploadedFiles(files);
            return res.status(400).json({ success: false, message: 'A listing must contain at least one image.' });
        }
        const nextSlugBase = slugify(fields.title);
        const nextSlug = listings.some((item, itemIndex) => itemIndex !== index && item.slug === nextSlugBase) ? `${nextSlugBase}-${Date.now().toString().slice(-4)}` : nextSlugBase;
        listings[index] = { ...current, ...fields, slug: nextSlug, updatedAt: now(), media: [...current.media, ...filesToMedia(files, current.media.length)] };
        await saveListings(listings);
        res.json(envelope(listings[index]));
    }
    catch (error) {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Could not update listing.' });
    }
});
app.patch('/api/admin/listings/:id/status', requireAuth, async (req, res) => { const status = z.enum(statuses).safeParse(req.body?.status); if (!status.success)
    return res.status(400).json({ success: false, message: 'Invalid status.' }); const listings = await getListings(); const index = listings.findIndex((item) => item.id === req.params.id); if (index < 0)
    return res.status(404).json({ success: false, message: 'Listing not found' }); listings[index] = { ...listings[index], status: status.data, updatedAt: now() }; await saveListings(listings); res.json(envelope(listings[index])); });
app.delete('/api/admin/listings/:id', requireAuth, async (req, res) => { const listings = await getListings(); const listing = listings.find((item) => item.id === req.params.id); if (!listing)
    return res.status(404).json({ success: false, message: 'Listing not found' }); for (const media of listing.media) {
    if (media.storagePath.startsWith('listings/uploads/')) {
        try {
            await fs.unlink(path.join(uploadsDir, path.basename(media.storagePath)));
        }
        catch { /* storage deletion is best-effort */ }
    }
} await saveListings(listings.filter((item) => item.id !== req.params.id)); res.json(envelope({ deleted: true })); });
app.use((error, _req, res, _next) => { if (error instanceof multer.MulterError)
    return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'This file is too large. Please upload a smaller file.' : 'Upload could not be completed.' }); res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' }); });
const clientDir = path.join(rootDir, 'dist');
app.use(express.static(clientDir));
app.get('*', async (_req, res) => { try {
    await fs.access(path.join(clientDir, 'index.html'));
    res.sendFile(path.join(clientDir, 'index.html'));
}
catch {
    res.sendFile(path.join(rootDir, 'index.html'));
} });
const port = Number(process.env.PORT || 3000);
ensureStore().then(() => app.listen(port, '0.0.0.0', () => console.log(`Riwaayat Closet listening on 0.0.0.0:${port}`))).catch((error) => { console.error(error); process.exit(1); });
//# sourceMappingURL=server.js.map