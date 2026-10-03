import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { request, setStoredToken } from './services/api';
import { getListing, getListings } from './services/listings';
import { login, logout, getSession } from './services/auth';

type Status = 'available' | 'out_of_stock' | 'sold';
type Media = { id: string; fileUrl: string; storagePath: string; mediaType: 'image' | 'video'; sortOrder: number };
type Listing = { id: string; title: string; slug: string; category: string; price: number; description: string; fabric?: string; color?: string; work?: string; occasion?: string; size?: string; customization?: string; additionalNotes?: string; status: Status; createdAt: string; updatedAt: string; media: Media[] };
type QueryResult = { data: Listing[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
const categories = ['Lehenga', 'Saree', 'Bridal Wear', 'Anarkali', 'Suit', 'Sharara', 'Gharara', 'Dupatta', 'Other'];
const categoryImages: Record<string, string> = { Lehenga: '/assets/maroon-lehenga.jpg', Saree: '/assets/cream-saree.jpg', 'Bridal Wear': '/assets/gold-embroidery.jpg', Anarkali: '/assets/copper-saree.jpg', Suit: '/assets/embroidery-detail.jpg', Sharara: '/assets/maroon-lehenga.jpg', Gharara: '/assets/cream-saree.jpg', Dupatta: '/assets/gold-embroidery.jpg', Other: '/assets/embroidery-detail.jpg' };
const formatPrice = (price: number) => `₹${new Intl.NumberFormat('en-IN').format(price)}`;
const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
const labelStatus = (status: Status) => status === 'out_of_stock' ? 'Out of stock' : status === 'sold' ? 'Sold' : 'Available';
const go = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo(0, 0); };

function setPageMeta(title: string, description: string, image = '/assets/maroon-lehenga.jpg') {
  document.title = title;
  const descriptionTag = document.querySelector('meta[name=description]');
  if (descriptionTag) descriptionTag.setAttribute('content', description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (ogDescription) ogDescription.setAttribute('content', description);
  if (ogImage) ogImage.setAttribute('content', image);
  let canonical = document.querySelector('link[rel=canonical]') as HTMLLinkElement | null;
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = `${window.location.origin}${window.location.pathname}`;
}
function usePath() { const [path, setPath] = useState(window.location.pathname); useEffect(() => { const handle = () => setPath(window.location.pathname); window.addEventListener('popstate', handle); return () => window.removeEventListener('popstate', handle); }, []); return path; }

function LogoMark() { return <span className="logo-mark" aria-hidden="true"><span>R</span></span>; }
function Brand({ dark = false }: { dark?: boolean }) { return <button className={`brand ${dark ? 'brand-dark' : ''}`} onClick={() => go('/')}><LogoMark /><span><b>RIWAAYAT</b><small>CLOSET</small></span></button>; }
function StatusBadge({ status }: { status: Status }) { return <span className={`status status-${status}`}><i />{labelStatus(status)}</span>; }
function MediaBadge({ listing }: { listing: Listing }) { return listing.media.some((item) => item.mediaType === 'video') ? <span className="media-badge">Video</span> : null; }
function Shell({ children }: { children: React.ReactNode }) { return <div className="site-shell"><header className="site-header"><Brand /><nav className="desktop-nav"><button onClick={() => go('/')}>Home</button><button onClick={() => go('/collection')}>Collection</button><a href="#categories">Categories</a><button onClick={() => go('/about')}>About</button></nav><button className="header-search" onClick={() => go('/collection')} aria-label="Search collection"><span>⌕</span><em>Search collection</em></button></header>{children}<footer className="site-footer"><div><Brand dark /><p>A considered catalogue of Indian occasion wear,<br />where tradition meets elegance.</p></div><div className="footer-links"><span className="eyebrow">Explore</span><button onClick={() => go('/collection')}>Collection</button><button onClick={() => go('/about')}>Our story</button></div><div className="footer-note"><span className="eyebrow">By appointment</span><p>For availability, sizing and styling notes,<br />write to the closet directly.</p><a href="mailto:prathanachouhan184@gmail.com">prathanachouhan184@gmail.com</a></div><div className="footer-bottom"><span>© 2026 Riwaayat Closet</span><button onClick={() => go('/admin/login')}>Admin portal</button><span>Made for moments that matter.</span></div></footer></div>; }
function SectionLabel({ children, number }: { children: React.ReactNode; number?: string }) { return <div className="section-label"><span>{number || '—'}</span><span>{children}</span></div>; }
function Button({ children, onClick, variant = 'primary', type = 'button' }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'text'; type?: 'button' | 'submit' }) { return <button type={type} className={`button button-${variant}`} onClick={onClick}>{children}<span className="button-arrow">↗</span></button>; }
function ProductCard({ listing, index = 0 }: { listing: Listing; index?: number }) { const image = listing.media.find((item) => item.mediaType === 'image'); const open = () => go(`/collection/${listing.slug}`); return <article className="product-card" role="link" tabIndex={0} style={{ ['--delay' as string]: `${index * 60}ms` }} onClick={open} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }}><div className="product-image-wrap">{image ? <img src={image.fileUrl} alt={listing.title} loading="lazy" /> : <div className="image-fallback">RC</div>}<div className="product-overlays"><StatusBadge status={listing.status} /><MediaBadge listing={listing} /></div><span className="card-corner">↗</span></div><div className="product-meta"><div><span className="product-category">{listing.category}</span><h3>{listing.title}</h3></div><strong>{formatPrice(listing.price)}</strong></div></article>; }
function LoadingGrid({ count = 4 }: { count?: number }) { return <div className="product-grid">{Array.from({ length: count }).map((_, i) => <div className="skeleton-card" key={i}><div className="skeleton-image" /><div className="skeleton-line short" /><div className="skeleton-line" /></div>)}</div>; }
function EmptyState({ title, copy = 'Our collection is currently being refreshed.' }: { title: string; copy?: string }) { return <div className="empty-state"><LogoMark /><h3>{title}</h3><p>{copy}</p><Button variant="outline" onClick={() => go('/collection')}>Browse the collection</Button></div>; }

function HomePage() { const [result, setResult] = useState<QueryResult | null>(null); useEffect(() => { getListings<QueryResult>('?limit=4&sort=newest').then(setResult).catch(() => setResult({ data: [], pagination: { page: 1, limit: 4, total: 0, totalPages: 0 } })); }, []); return <Shell><main><section className="hero"><div className="hero-copy"><p className="eyebrow">The occasion edit · 2026</p><h1>Timeless Indian<br /><i>elegance,</i><br />curated for you.</h1><p className="hero-description">A considered collection of silhouettes rich in craft, colour, and quiet splendour—chosen for the moments that matter.</p><Button onClick={() => go('/collection')}>Explore collection</Button><div className="hero-signature"><span>Where tradition meets elegance</span><span className="signature-line" /></div></div><div className="hero-visual"><img src="/assets/maroon-lehenga.jpg" alt="Maroon embroidered Indian lehenga" /><div className="hero-stamp"><span>RC</span><small>EST.<br />2026</small></div><span className="hero-vertical">RIWAAYAT · CLOSET · 01</span></div></section><section className="intro-strip"><p className="eyebrow">A closet with a point of view</p><p>Indian occasion wear, edited with a discerning eye for <em>craft, colour, and the poetry of detail.</em></p><span>✦</span></section><section className="categories-section" id="categories"><div className="section-heading"><div><SectionLabel number="01">The edit</SectionLabel><h2>Find your <i>silhouette.</i></h2></div><button className="text-link" onClick={() => go('/collection')}>View all categories <span>↗</span></button></div><div className="category-rail">{categories.slice(0, 6).map((category, index) => <button className={`category-card category-card-${index}`} key={category} onClick={() => go(`/collection?category=${encodeURIComponent(category)}`)}><img src={categoryImages[category]} alt="" loading="lazy" /><span className="category-number">0{index + 1}</span><span className="category-name">{category === 'Bridal Wear' ? <>Bridal<br />wear</> : category}</span><span className="category-arrow">↗</span></button>)}</div></section><section className="latest-section"><div className="section-heading"><div><SectionLabel number="02">Freshly considered</SectionLabel><h2>From the <i>collection.</i></h2></div><button className="text-link" onClick={() => go('/collection')}>Browse all articles <span>↗</span></button></div>{result ? result.data.length ? <div className="product-grid">{result.data.map((item, index) => <ProductCard listing={item} index={index} key={item.id} />)}</div> : <EmptyState title="A moment of curation." /> : <LoadingGrid count={4} />}</section><section className="story-band"><div className="story-image"><img src="/assets/embroidery-detail.jpg" alt="Close-up of embroidery detail" loading="lazy" /></div><div className="story-copy"><SectionLabel number="03">The Riwaayat note</SectionLabel><h2>Rooted in <i>craft.</i><br />Made for now.</h2><p>We believe the most beautiful pieces hold two truths at once: the patience of old-world craft and the ease of a woman living fully in the present.</p><button className="text-link" onClick={() => go('/about')}>Read our story <span>↗</span></button></div></section></main></Shell>; }

function CollectionPage() { const params = new URLSearchParams(window.location.search); const [search, setSearch] = useState(params.get('search') || ''); const [category, setCategory] = useState(params.get('category') || ''); const [status, setStatus] = useState(''); const [sort, setSort] = useState('newest'); const [pricePreset, setPricePreset] = useState(''); const [page, setPage] = useState(1); const [result, setResult] = useState<QueryResult | null>(null); const [error, setError] = useState(''); const [filterOpen, setFilterOpen] = useState(false); const [searchDraft, setSearchDraft] = useState(search); const minMax = pricePreset === 'under' ? '&maxPrice=10000' : pricePreset === 'mid' ? '&minPrice=10000&maxPrice=20000' : pricePreset === 'upper' ? '&minPrice=20000&maxPrice=40000' : pricePreset === 'high' ? '&minPrice=40000' : '';
  useEffect(() => { const query = new URLSearchParams({ page: String(page), limit: '8', sort }); if (search) query.set('search', search); if (category) query.set('category', category); if (status) query.set('status', status); const url = `/api/listings?${query.toString()}${minMax}`; setError(''); request<QueryResult>(url).then(setResult).catch((e) => { setError(e.message); setResult(null); }); }, [search, category, status, sort, pricePreset, page]);
  const applySearch = (event: FormEvent) => { event.preventDefault(); setPage(1); setSearch(searchDraft); };
  const clearFilters = () => { setSearch(''); setSearchDraft(''); setCategory(''); setStatus(''); setPricePreset(''); setPage(1); };
  return <Shell><main className="collection-page"><section className="collection-heading"><SectionLabel number="The catalogue">Curated pieces, considered</SectionLabel><h1>The <i>collection.</i></h1><p>Explore the current edit of Indian occasion wear, selected for craft, colour, and the feeling of a piece well chosen.</p></section><section className="catalogue-controls"><form className="search-field" onSubmit={applySearch}><span>⌕</span><input value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="Search lehengas, sarees, bridal wear..." aria-label="Search catalogue" /><button type="submit">Search</button></form><button className="mobile-filter-button" onClick={() => setFilterOpen(true)}>Filters <span>＋</span></button><div className="filter-summary"><span>{result?.pagination.total ?? '—'} articles</span><button onClick={() => setFilterOpen(true)}>Filter & sort <span>＋</span></button></div></section><div className={`catalogue-layout ${filterOpen ? 'filters-open' : ''}`}><aside className="filter-panel"><div className="filter-panel-top"><span className="eyebrow">Refine the edit</span><button onClick={() => setFilterOpen(false)} className="close-filter">×</button></div><label>Category<select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Price<select value={pricePreset} onChange={(e) => { setPricePreset(e.target.value); setPage(1); }}><option value="">Any price</option><option value="under">Under ₹10,000</option><option value="mid">₹10,000 – ₹20,000</option><option value="upper">₹20,000 – ₹40,000</option><option value="high">Above ₹40,000</option></select></label><label>Availability<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All status</option><option value="available">Available</option><option value="out_of_stock">Out of stock</option><option value="sold">Sold</option></select></label><label>Sort by<select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name-az">Name: A–Z</option><option value="name-za">Name: Z–A</option></select></label><button className="clear-filters" onClick={clearFilters}>Clear all filters</button></aside><section className="catalogue-results"><div className="results-top"><span>{category || 'All pieces'}{search ? ` · “${search}”` : ''}</span><button className="results-filter-button" onClick={() => setFilterOpen(true)}>Filter & sort ↗</button></div>{error ? <div className="error-state"><h3>We could not open the collection.</h3><p>{error}</p><Button variant="outline" onClick={() => window.location.reload()}>Try again</Button></div> : result ? result.data.length ? <><div className="product-grid">{result.data.map((item, index) => <ProductCard listing={item} index={index} key={item.id} />)}</div>{result.pagination.totalPages > 1 && <div className="pagination"><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>{Array.from({ length: result.pagination.totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => <button className={page === n ? 'active' : ''} key={n} onClick={() => setPage(n)}>{String(n).padStart(2, '0')}</button>)}<button disabled={page >= result.pagination.totalPages} onClick={() => setPage(page + 1)}>→</button></div></div>}</> : <EmptyState title={search || category ? 'No articles matched your search.' : 'Our collection is currently being refreshed.'} copy={search || category ? 'Try a softer search or clear a filter to see the wider edit.' : 'New pieces are being considered for the catalogue.'} /> : <LoadingGrid count={6} />}</section></div></main></Shell>; }

function DetailPage({ slug }: { slug: string }) { const [listing, setListing] = useState<Listing | null>(null); const [error, setError] = useState(''); const [selected, setSelected] = useState(0); const [lightbox, setLightbox] = useState(false); useEffect(() => { getListing<{ data: Listing }>(slug).then((payload) => setListing(payload.data)).catch((e) => setError(e.message)); }, [slug]); if (error) return <Shell><main className="detail-page"><EmptyState title="This article is no longer in the edit." copy="The listing may have been sold or removed from the catalogue." /></main></Shell>; if (!listing) return <Shell><main className="detail-page"><LoadingGrid count={2} /></main></Shell>; const media = listing.media[selected] || listing.media[0]; return <Shell><main className="detail-page"><button className="back-link" onClick={() => go('/collection')}>← Back to collection</button><div className="detail-layout"><section className="gallery"><div className="gallery-main">{media.mediaType === 'video' ? <video src={media.fileUrl} controls playsInline poster={listing.media.find((m) => m.mediaType === 'image')?.fileUrl} /> : <button onClick={() => setLightbox(true)} aria-label="View image fullscreen"><img src={media.fileUrl} alt={listing.title} /></button>}<span className="gallery-count">{String(selected + 1).padStart(2, '0')} / {String(listing.media.length).padStart(2, '0')}</span></div><div className="gallery-thumbs">{listing.media.map((item, index) => <button className={index === selected ? 'active' : ''} key={item.id} onClick={() => setSelected(index)}>{item.mediaType === 'video' ? <span className="thumb-video">Video</span> : <img src={item.fileUrl} alt={`${listing.title} view ${index + 1}`} />}</button>)}</div></section><section className="detail-copy"><SectionLabel number="The article">{listing.category}</SectionLabel><h1>{listing.title}</h1><div className="detail-price-row"><strong>{formatPrice(listing.price)}</strong><StatusBadge status={listing.status} /></div><p className="detail-description">{listing.description}</p><div className="detail-rule" /><dl className="detail-specs">{[['Fabric', listing.fabric], ['Colour', listing.color], ['Work', listing.work], ['Occasion', listing.occasion], ['Size', listing.size], ['Customisation', listing.customization], ['Notes', listing.additionalNotes]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="availability-note"><span className="eyebrow">Availability note</span><p>{listing.status === 'available' ? 'This article is currently available. For sizing, styling or appointment notes, write to the closet.' : listing.status === 'sold' ? 'This article has found its home. Explore the wider collection for a similar mood.' : 'This article is temporarily out of stock. Write to the closet for an update.'}</p><a href="mailto:prathanachouhan184@gmail.com">Enquire by email ↗</a></div></section></div></main>{lightbox && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(false)}><button onClick={() => setLightbox(false)} className="lightbox-close">×</button><img src={media.fileUrl} alt={listing.title} /></div>}</Shell>; }

function AboutPage() { return <Shell><main className="about-page"><section className="about-hero"><SectionLabel number="About the closet">The Riwaayat note</SectionLabel><h1>Rooted in <i>craft.</i><br />Made for now.</h1><p>Riwaayat is a small, considered edit of Indian occasion wear—pieces chosen for their generous colour, thoughtful detail, and the way they make a moment feel more like your own.</p></section><section className="about-grid"><img src="/assets/gold-embroidery.jpg" alt="Gold embroidery on maroon fabric" /><div><SectionLabel number="01">A point of view</SectionLabel><h2>Not a shop floor.<br /><i>A point of view.</i></h2><p>We are a catalogue, not a checkout. Each article is shown as it is currently available, with its story, price, details, and status kept close to the source.</p></div><div><SectionLabel number="02">For your moments</SectionLabel><h2>For the <i>beautifully</i><br />unplanned.</h2><p>From the first invitation to the last dance, we look for silhouettes that feel special without feeling overworked—bridal maroons, soft ivories, warm metallics, and the quiet work of a good drape.</p></div><img src="/assets/cream-saree.jpg" alt="Ivory saree with maroon border" /></section><section className="about-cta"><span className="eyebrow">Ready when you are</span><h2>Find the piece<br /><i>that stays with you.</i></h2><Button onClick={() => go('/collection')}>Explore collection</Button></section></main></Shell>; }

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSession<{ data: { username: string } }>()
      .then(() => go('/admin'))
      .catch(() => {});
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      go('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth">
      <div className="admin-auth-visual">
        <img src="/assets/maroon-lehenga.jpg" alt="Maroon embroidered lehenga" />
        <div>
          <Brand dark />
          <p>Where tradition<br /><i>meets elegance.</i></p>
        </div>
      </div>
      <div className="admin-auth-form">
        <button className="back-link" onClick={() => go('/')}>← Return to catalogue</button>
        <div className="auth-card">
          <SectionLabel number="Private access">Riwaayat Closet</SectionLabel>
          <h1>Admin <i>portal.</i></h1>
          <p>Manage the articles currently being considered for the public edit.</p>
          <form onSubmit={submit}>
            <label>Admin ID
              <input required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Enter your admin ID" />
            </label>
            <label>Password
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" />
            </label>
            {error && <div className="form-error">{error}</div>}
            <Button type="submit">{loading ? 'Signing in…' : 'Login'}</Button>
          </form>
          <small className="auth-footnote">One secure account · catalogue access only</small>
        </div>
      </div>
    </div>
  );
}

function AdminFrame({ children, active = 'dashboard' }: { children: React.ReactNode; active?: string }) {
  const [username, setUsername] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSession<{ data: { username: string } }>()
      .then((payload) => {
        if (mounted) {
          setUsername(payload.data.username);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setStoredToken(null);
          go('/admin/login');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="admin-loading">
        <LogoMark />
        <p>Opening your private edit…</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    go('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <div className="admin-user">
          <span className="avatar">{username.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{username}</strong>
            <small>Administrator</small>
          </div>
        </div>
        <nav>
          <button className={active === 'dashboard' ? 'active' : ''} onClick={() => go('/admin')}>Overview <span>↗</span></button>
          <button className={active === 'listings' ? 'active' : ''} onClick={() => go('/admin/listings')}>Manage listings <span>↗</span></button>
          <button className={active === 'new' ? 'active' : ''} onClick={() => go('/admin/listings/new')}>Add new article <span>↗</span></button>
        </nav>
        <div className="admin-sidebar-bottom">
          <button onClick={() => go('/')}>View public site ↗</button>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <span className="eyebrow">Riwaayat Closet / Private edit</span>
            <span className="admin-breadcrumb">{active === 'dashboard' ? 'Overview' : active === 'new' ? 'Add article' : 'Manage listings'}</span>
          </div>
          <button className="mobile-admin-site" onClick={() => go('/')}>View site ↗</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState<{ total: number; available: number; outOfStock: number; sold: number; recent: Listing[] } | null>(null);

  useEffect(() => {
    let mounted = true;
    request<{ data: typeof dashboard }>('/api/admin/dashboard')
      .then((payload) => {
        if (mounted) setDashboard(payload.data);
      })
      .catch((err) => {
        if (mounted) {
          console.warn('Dashboard load notice:', err.message);
          if (err.message?.includes('Authentication required') || err.message?.includes('401')) {
            setStoredToken(null);
            go('/admin/login');
          }
        }
      });
    return () => { mounted = false; };
  }, []);

  if (!dashboard) {
    return (
      <div className="admin-loading">
        <LogoMark />
        <p>Gathering the latest edit…</p>
      </div>
    );
  }

  return (
    <main className="admin-content">
      <div className="admin-title-row">
        <div><SectionLabel number="01">Good morning</SectionLabel><h1>Your <i>overview.</i></h1></div>
        <Button onClick={() => go('/admin/listings/new')}>Add listing</Button>
      </div>
      <div className="stat-grid">
        <div><span>Total listings</span><strong>{dashboard.total}</strong><small>In the current edit</small></div>
        <div><span>Available</span><strong>{dashboard.available}</strong><small>Ready to enquire</small></div>
        <div><span>Out of stock</span><strong>{dashboard.outOfStock}</strong><small>Awaiting an update</small></div>
        <div><span>Sold</span><strong>{dashboard.sold}</strong><small>Found their home</small></div>
      </div>
      <section className="admin-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Recently added</span><h2>The latest <i>articles.</i></h2></div>
          <button className="text-link" onClick={() => go('/admin/listings')}>Manage all ↗</button>
        </div>
        <div className="recent-list">
          {dashboard.recent.map((item) => (
            <button key={item.id} onClick={() => go(`/admin/listings/${item.id}/edit`)}>
              <img src={item.media[0]?.fileUrl} alt="" />
              <span><strong>{item.title}</strong><small>{item.category} · {formatDate(item.createdAt)}</small></span>
              <StatusBadge status={item.status} />
              <span className="row-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>
      <div className="admin-callout">
        <div><span className="eyebrow">A quiet reminder</span><h2>Every article<br /><i>has a story.</i></h2></div>
        <p>Keep the public edit honest and current. A status change here becomes visible to every visitor immediately.</p>
      </div>
    </main>
  );
}

function ConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <span className="eyebrow">Please confirm</span>
        <h2>Delete <i>listing?</i></h2>
        <p>This will permanently remove this article from the catalogue.</p>
        <div>
          <button className="button button-outline" onClick={onClose}>Cancel</button>
          <button className="button button-danger" onClick={onConfirm}>Delete <span>↗</span></button>
        </div>
      </div>
    </div>
  );
}

function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [message, setMessage] = useState('');

  const load = () =>
    request<{ data: Listing[] }>('/api/admin/listings')
      .then((payload) => setListings(payload.data))
      .catch((err) => {
        console.warn('Listings load notice:', err.message);
        if (err.message?.includes('Authentication required') || err.message?.includes('401')) {
          setStoredToken(null);
          go('/admin/login');
        }
      });

  useEffect(() => { void load(); }, []);

  const changeStatus = async (listing: Listing, status: Status) => {
    try {
      await request(`/api/admin/listings/${listing.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setMessage('Status updated.');
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteListing = async () => {
    if (!selected) return;
    try {
      await request(`/api/admin/listings/${selected.id}`, { method: 'DELETE' });
      setSelected(null);
      setMessage('Listing removed from the catalogue.');
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <main className="admin-content">
        <div className="admin-title-row">
          <div><SectionLabel number="02">Catalogue management</SectionLabel><h1>Manage <i>listings.</i></h1></div>
          <Button onClick={() => go('/admin/listings/new')}>Add listing</Button>
        </div>
        {message && <div className="toast">{message}<button onClick={() => setMessage('')}>×</button></div>}
        <section className="admin-table-panel">
          <div className="admin-table-heading">
            <span>{listings.length} articles in the current edit</span>
            <span>Updated live</span>
          </div>
          <div className="admin-table">
            {listings.map((item) => (
              <div className="admin-row" key={item.id}>
                <img src={item.media[0]?.fileUrl} alt="" />
                <div className="admin-row-title">
                  <strong>{item.title}</strong>
                  <small>{item.category} · Added {formatDate(item.createdAt)}</small>
                </div>
                <strong className="admin-row-price">{formatPrice(item.price)}</strong>
                <select value={item.status} onChange={(e) => changeStatus(item, e.target.value as Status)}>
                  <option value="available">Available</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="sold">Sold</option>
                </select>
                <button className="row-action" onClick={() => go(`/admin/listings/${item.id}/edit`)}>Edit ↗</button>
                <button className="row-delete" onClick={() => setSelected(item)} aria-label={`Delete ${item.title}`}>×</button>
              </div>
            ))}
          </div>
        </section>
      </main>
      {selected && <ConfirmModal onClose={() => setSelected(null)} onConfirm={deleteListing} />}
    </>
  );
}

function ListingEditorPage({ id }: { id?: string }) {
  const editing = Boolean(id);
  const [form, setForm] = useState<Partial<Listing>>({
    title: '', category: 'Lehenga', price: 0, description: '', status: 'available',
    fabric: '', color: '', work: '', occasion: '', size: '', customization: '', additionalNotes: ''
  });
  const [existingMedia, setExistingMedia] = useState<Media[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      request<{ data: Listing }>(`/api/admin/listings/${id}`)
        .then((payload) => {
          setForm(payload.data);
          setExistingMedia(payload.data.media);
        })
        .catch((err) => {
          console.warn('Listing fetch notice:', err.message);
          setError(err.message);
          if (err.message?.includes('Authentication required') || err.message?.includes('401')) {
            setStoredToken(null);
            go('/admin/login');
          }
        });
    }
  }, [id]);

  const update = (key: string, value: string | number) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'slug' && key !== 'media' && key !== 'createdAt' && key !== 'updatedAt') {
        body.append(key, String(value ?? ''));
      }
    });
    files.forEach((file) => body.append('media', file));
    try {
      await request(editing ? `/api/admin/listings/${id}` : '/api/admin/listings', {
        method: editing ? 'PATCH' : 'POST',
        body
      });
      go('/admin/listings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save listing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-content editor-content">
      <button className="back-link" onClick={() => go('/admin/listings')}>← Back to listings</button>
      <div className="editor-heading">
        <SectionLabel number="03">{editing ? 'Refine an article' : 'Add to the edit'}</SectionLabel>
        <h1>{editing ? <>Edit <i>listing.</i></> : <>New <i>listing.</i></>}</h1>
        <p>{editing ? 'Keep the article details precise and current for every visitor.' : 'Add an article with the details your customers need to make an informed enquiry.'}</p>
      </div>
      <form className="listing-form" onSubmit={submit}>
        <section>
          <div className="form-section-heading">
            <span className="eyebrow">01 / Essential details</span>
            <p>Required fields keep the public catalogue clear.</p>
          </div>
          <div className="form-grid">
            <label className="full">Article name
              <input required value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Noor Maroon Bridal Lehenga" />
            </label>
            <label>Category
              <select required value={form.category || ''} onChange={(e) => update('category', e.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>Price (INR)
              <input required type="number" min="1" value={form.price || ''} onChange={(e) => update('price', Number(e.target.value))} placeholder="24999" />
            </label>
            <label className="full">Description
              <textarea required minLength={10} value={form.description || ''} onChange={(e) => update('description', e.target.value)} placeholder="Describe the silhouette, craft, and feeling of the piece." rows={5} />
            </label>
          </div>
        </section>
        <section>
          <div className="form-section-heading">
            <span className="eyebrow">02 / The details</span>
            <p>Optional, but useful for a considered enquiry.</p>
          </div>
          <div className="form-grid">
            <label>Fabric<input value={form.fabric || ''} onChange={(e) => update('fabric', e.target.value)} placeholder="Silk blend" /></label>
            <label>Colour<input value={form.color || ''} onChange={(e) => update('color', e.target.value)} placeholder="Deep maroon" /></label>
            <label>Work / embroidery<input value={form.work || ''} onChange={(e) => update('work', e.target.value)} placeholder="Zari and sequins" /></label>
            <label>Occasion<input value={form.occasion || ''} onChange={(e) => update('occasion', e.target.value)} placeholder="Wedding / festive" /></label>
            <label>Size<input value={form.size || ''} onChange={(e) => update('size', e.target.value)} placeholder="XS–XL" /></label>
            <label>Customization<input value={form.customization || ''} onChange={(e) => update('customization', e.target.value)} placeholder="Available on request" /></label>
            <label className="full">Additional notes
              <textarea value={form.additionalNotes || ''} onChange={(e) => update('additionalNotes', e.target.value)} rows={3} placeholder="What else should the customer know?" />
            </label>
          </div>
        </section>
        <section>
          <div className="form-section-heading">
            <span className="eyebrow">03 / Media & status</span>
            <p>JPG, PNG, WEBP up to 8MB; MP4, WEBM, MOV up to 40MB.</p>
          </div>
          <label className="dropzone">
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            <span className="upload-icon">＋</span>
            <strong>Drop images or videos here</strong>
            <small>or choose files from your device</small>
            {files.length > 0 && <em>{files.length} new file{files.length > 1 ? 's' : ''} selected</em>}
          </label>
          {existingMedia.length > 0 && (
            <div className="existing-media">
              <span className="eyebrow">Current media</span>
              <div>
                {existingMedia.map((media) =>
                  media.mediaType === 'image' ? <img key={media.id} src={media.fileUrl} alt="" /> : <span key={media.id} className="existing-video">Video</span>
                )}
              </div>
            </div>
          )}
          <label className="status-select">Availability
            <select value={form.status || 'available'} onChange={(e) => update('status', e.target.value)}>
              <option value="available">Available</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="sold">Sold</option>
            </select>
          </label>
        </section>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="button button-outline" type="button" onClick={() => go('/admin/listings')}>Cancel</button>
          <Button type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : 'Save listing'}</Button>
        </div>
      </form>
    </main>
  );
}

function App() {
  const path = usePath();
  useEffect(() => {
    if (path === '/') setPageMeta('Riwaayat Closet | Where Tradition Meets Elegance', 'A curated catalogue of Indian ethnic wear where tradition meets elegance.');
    else if (path === '/collection') setPageMeta('The Collection | Riwaayat Closet', 'Explore a considered edit of Indian occasion wear, selected for craft, colour, and quiet splendour.');
    else if (path === '/about') setPageMeta('About the Closet | Riwaayat Closet', 'Meet Riwaayat Closet, a considered catalogue of Indian occasion wear.');
  }, [path]);

  if (path === '/admin/login') return <AdminLogin />;
  if (path === '/admin' || path === '/admin/') return <AdminFrame active="dashboard"><DashboardPage /></AdminFrame>;
  if (path === '/admin/listings') return <AdminFrame active="listings"><AdminListingsPage /></AdminFrame>;
  if (path === '/admin/listings/new') return <AdminFrame active="new"><ListingEditorPage /></AdminFrame>;
  if (path.startsWith('/admin/listings/') && path.endsWith('/edit')) return <AdminFrame active="listings"><ListingEditorPage id={path.split('/')[3]} /></AdminFrame>;
  if (path === '/collection') return <CollectionPage />;
  if (path.startsWith('/collection/')) return <DetailPage slug={path.split('/')[2]} />;
  if (path === '/about') return <AboutPage />;
  return <HomePage />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
