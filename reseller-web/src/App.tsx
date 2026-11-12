import { Component, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelResellerSale,
  createResellerSale,
  errorMessage,
  getResellerCatalog,
  getResellerInventory,
  getResellerProfile,
  getResellerSales,
  login,
  resellerSession,
} from './services/api';
import { useTheme } from './context/ThemeContext';
import type {
  ResellerCatalogItem,
  ResellerInventoryAvailabilityStatus,
  ResellerInventoryResponse,
  ResellerProfile,
  ResellerSale,
  ResellerSaleStatus,
} from './types';

const currency = (amount: number, code: string) => {
  const numericAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code || 'MXN',
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `$${numericAmount.toFixed(2)} ${code || 'MXN'}`;
  }
};

const inventoryStatusLabel: Record<ResellerInventoryAvailabilityStatus, string> = {
  AVAILABLE: 'Disponible',
  LOW_STOCK: 'Stock bajo',
  RESERVED: 'Reservado',
  OUT_OF_STOCK: 'Agotado',
};

const saleStatusMeta: Record<ResellerSaleStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Borrador', tone: 'neutral' },
  PENDING_PAYMENT: { label: 'Pendiente de cobro', tone: 'pending' },
  PAID: { label: 'Pagada', tone: 'paid' },
  CANCELLED: { label: 'Cancelada', tone: 'cancelled' },
  EXPIRED: { label: 'Expirada', tone: 'expired' },
};

const createIdempotencyKey = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `rs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const themeOptions = [
  { id: 'cared', name: 'Cared', description: 'Corporativo oscuro' },
  { id: 'pitaya', name: 'Pitaya', description: 'Premium' },
  { id: 'notion', name: 'Notion', description: 'Minimalista' },
] as const;

function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { variant, mode, setVariant, toggleMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={compact ? 'theme-selector compact-theme-selector' : 'theme-selector'}>
      <button
        type="button"
        className="theme-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">palette</span>
        <span className="theme-trigger-label">Apariencia</span>
        <span className="material-symbols-outlined theme-trigger-chevron" aria-hidden="true">expand_more</span>
      </button>
      {isOpen && (
        <div className="theme-menu" role="menu" aria-label="Seleccionar apariencia">
          <p>Personalización visual</p>
          {themeOptions.map((option) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={variant === option.id}
              className={variant === option.id ? 'theme-option selected' : 'theme-option'}
              key={option.id}
              onClick={() => {
                setVariant(option.id);
                setIsOpen(false);
              }}
            >
              <span className={`theme-preview ${option.id}`} aria-hidden="true" />
              <span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </span>
              {variant === option.id && <span className="material-symbols-outlined theme-check" aria-hidden="true">check_circle</span>}
            </button>
          ))}
          {variant !== 'cared' && (
            <button type="button" className="theme-mode-toggle" onClick={toggleMode}>
              <span className="material-symbols-outlined" aria-hidden="true">{mode === 'light' ? 'dark_mode' : 'light_mode'}</span>
              {mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type ResellerSection = 'dashboard' | 'inventory' | 'catalog' | 'cart' | 'sales';

const NAV_SECTIONS: ReadonlyArray<{
  id: ResellerSection;
  label: string;
  icon: string;
  hash: string;
}> = [
  { id: 'dashboard', label: 'Panel', icon: 'dashboard', hash: '#panel' },
  { id: 'inventory', label: 'Inventario', icon: 'inventory_2', hash: '#inventario' },
  { id: 'catalog', label: 'Catálogo', icon: 'grid_view', hash: '#catalogo' },
  { id: 'cart', label: 'Venta en preparación', icon: 'shopping_bag', hash: '#venta' },
  { id: 'sales', label: 'Mis ventas', icon: 'receipt_long', hash: '#mis-ventas' },
];

function sectionFromHash(hash: string): ResellerSection {
  const match = NAV_SECTIONS.find((section) => section.hash === hash.toLowerCase());
  return match ? match.id : 'dashboard';
}

function ResellerNavigation({
  profile,
  activeSection,
  itemCount,
  onSelectSection,
  onSignOut,
}: {
  profile: ResellerProfile;
  activeSection: ResellerSection;
  itemCount: number;
  onSelectSection: (section: ResellerSection) => void;
  onSignOut: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const initials = (profile.name || profile.role || 'R')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const navigateTo = (section: ResellerSection) => {
    onSelectSection(section);
    setIsOpen(false);
  };

  return (
    <aside className="reseller-navigation" aria-label="Navegación de Revendedores">
      <div className="nav-rail">
        <button
          type="button"
          className="nav-rail-button menu-toggle"
          aria-label="Abrir menú"
          aria-expanded={isOpen}
          aria-controls="reseller-menu"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">menu</span>
        </button>
        <button type="button" className="nav-rail-brand" onClick={() => navigateTo('catalog')} aria-label="Ir al catálogo">
          C
        </button>
        <nav className="nav-rail-links" aria-label="Accesos rápidos">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? 'nav-rail-button active' : 'nav-rail-button'}
              onClick={() => navigateTo(section.id)}
              aria-label={section.label}
              aria-current={activeSection === section.id ? 'page' : undefined}
              title={section.label}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>
              {section.id === 'cart' && itemCount > 0 && <span className="nav-count">{itemCount}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-rail-bottom">
          <ThemeSelector compact />
          <button type="button" className="nav-rail-button" onClick={onSignOut} aria-label="Cerrar sesión" title="Salir">
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          <button type="button" className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setIsOpen(false)} />
          <section id="reseller-menu" className="nav-drawer" aria-label="Menú de Revendedores">
            <header className="nav-drawer-header">
              <div>
                <p className="nav-logo">CARED</p>
                <p className="nav-drawer-subtitle">REVENDEDORES</p>
              </div>
              <button type="button" className="drawer-close" onClick={() => setIsOpen(false)} aria-label="Cerrar menú">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>
            <nav className="nav-drawer-content">
              <p className="nav-section-label">Principal</p>
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={activeSection === section.id ? 'nav-menu-item active' : 'nav-menu-item'}
                  onClick={() => navigateTo(section.id)}
                  aria-current={activeSection === section.id ? 'page' : undefined}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>
                  {section.label}
                  {section.id === 'cart' && itemCount > 0 && <span className="drawer-count">{itemCount}</span>}
                </button>
              ))}
            </nav>
            <footer className="nav-drawer-footer">
              <ThemeSelector />
              <button type="button" className="reseller-profile" onClick={onSignOut}>
                <span className="profile-initials">{initials}</span>
                <span>
                  <strong>{profile.name || 'Revendedor'}</strong>
                  <small>Salir de la sesión</small>
                </span>
                <span className="material-symbols-outlined" aria-hidden="true">logout</span>
              </button>
            </footer>
          </section>
        </>
      )}
    </aside>
  );
}

function LoginForm({ onAuthenticated }: { onAuthenticated: (profile: ResellerProfile) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login(identifier, password);
      resellerSession.saveToken(response.access_token);
      const profile = await getResellerProfile();
      onAuthenticated(profile);
    } catch (requestError) {
      resellerSession.clear();
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <div className="login-theme-control"><ThemeSelector /></div>
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-lockup">
          <p className="eyebrow">CARED</p>
          <span aria-hidden="true" />
          <p className="brand-subtitle">ACCESO PROFESIONAL</p>
        </div>
        <h1 id="login-title">Revendedores</h1>
        <p className="login-copy">Accede al catálogo y a las operaciones autorizadas para tu cuenta.</p>
        <form onSubmit={submit} className="login-form">
          <label>
            Correo o usuario
            <input
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Validando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}

type CartLine = {
  item: ResellerCatalogItem;
  quantity: number;
};

function CatalogCard({
  item,
  quantityInCart,
  onAdd,
}: {
  item: ResellerCatalogItem;
  quantityInCart: number;
  onAdd: (item: ResellerCatalogItem) => void;
}) {
  const availableForCart = Math.max(0, item.availableQuantity - quantityInCart);
  const isAvailable = availableForCart > 0;
  return (
    <article className="catalog-card">
      <div className="product-art" aria-hidden="true">
        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="material-symbols-outlined">diamond</span>}
      </div>
      <div className="catalog-card-content">
        <p className="sku">{item.sku}</p>
        <h2>{item.name}</h2>
        <p className="description">{item.description || item.category || 'Pieza disponible por catálogo.'}</p>
        <div className="catalog-meta">
          <strong>{currency(item.unitPrice, item.currency)}</strong>
          <span className={isAvailable ? 'stock available' : 'stock'}>
            {isAvailable ? `${availableForCart} disponible${availableForCart === 1 ? '' : 's'}` : 'Sin disponibilidad'}
          </span>
        </div>
        <button
          type="button"
          className="add-to-cart"
          onClick={() => onAdd(item)}
          disabled={!isAvailable}
        >
          {isAvailable ? 'Agregar a la venta' : 'No disponible'}
        </button>
      </div>
    </article>
  );
}

function draftStorageKey(resellerId: string) {
  return `cared_reseller_order_draft_${resellerId}`;
}

function readSavedDraft(resellerId: string): {
  cart: CartLine[];
  customerName: string;
  customerPhone: string;
  orderNotes: string;
} {
  try {
    const raw = window.sessionStorage.getItem(draftStorageKey(resellerId));
    if (!raw) return { cart: [], customerName: '', customerPhone: '', orderNotes: '' };
    const parsed = JSON.parse(raw);
    return {
      cart: Array.isArray(parsed?.cart) ? parsed.cart : [],
      customerName: typeof parsed?.customerName === 'string' ? parsed.customerName : '',
      customerPhone: typeof parsed?.customerPhone === 'string' ? parsed.customerPhone : '',
      orderNotes: typeof parsed?.orderNotes === 'string' ? parsed.orderNotes : '',
    };
  } catch {
    return { cart: [], customerName: '', customerPhone: '', orderNotes: '' };
  }
}

function ResellerHome({ profile, onSignOut }: { profile: ResellerProfile; onSignOut: () => void }) {
  const initialDraft = useMemo(() => readSavedDraft(profile.id), [profile.id]);
  const [activeSection, setActiveSection] = useState<ResellerSection>(() =>
    sectionFromHash(window.location.hash),
  );
  const [items, setItems] = useState<ResellerCatalogItem[]>([]);
  const [inventory, setInventory] = useState<ResellerInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cartPickerQuery, setCartPickerQuery] = useState('');
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryStatus, setInventoryStatus] = useState<'ALL' | ResellerInventoryAvailabilityStatus>('ALL');
  const [inventoryCategory, setInventoryCategory] = useState('ALL');
  const [cart, setCart] = useState<CartLine[]>(initialDraft.cart);
  const [customerName, setCustomerName] = useState(initialDraft.customerName);
  const [customerPhone, setCustomerPhone] = useState(initialDraft.customerPhone);
  const [orderNotes, setOrderNotes] = useState(initialDraft.orderNotes);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastCreatedSale, setLastCreatedSale] = useState<ResellerSale | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sales, setSales] = useState<ResellerSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesFilter, setSalesFilter] = useState<'ALL' | ResellerSaleStatus>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const selectSection = useCallback((section: ResellerSection) => {
    setActiveSection(section);
    const targetHash = NAV_SECTIONS.find((item) => item.id === section)?.hash || '#panel';
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveSection(sectionFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const list = await getResellerSales();
      setSales(Array.isArray(list) ? list : []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalog, inventoryResponse] = await Promise.all([
        getResellerCatalog(),
        getResellerInventory(),
      ]);
      if (!Array.isArray(catalog?.items) || !inventoryResponse || !Array.isArray(inventoryResponse.items)) {
        throw new Error('Respuesta inesperada del servidor de revendedores.');
      }
      setItems(catalog.items);
      setInventory(inventoryResponse);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (cart.length === 0 && !customerName && !customerPhone && !orderNotes) {
        window.sessionStorage.removeItem(draftStorageKey(profile.id));
        return;
      }
      window.sessionStorage.setItem(
        draftStorageKey(profile.id),
        JSON.stringify({ cart, customerName, customerPhone, orderNotes }),
      );
    } catch {
      // ignore storage quota failures
    }
  }, [profile.id, cart, customerName, customerPhone, orderNotes]);

  useEffect(() => {
    void Promise.all([loadCatalog(), loadSales()]);
  }, [loadCatalog, loadSales]);

  const cartQuantity = useCallback(
    (productId: string) => cart.find((line) => line.item.id === productId)?.quantity || 0,
    [cart],
  );

  const addToCart = useCallback((item: ResellerCatalogItem) => {
    setCheckoutError(null);
    setLastCreatedSale(null);
    setIdempotencyKey(createIdempotencyKey());
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (!existing) return [...current, { item, quantity: 1 }];
      if (existing.quantity >= item.availableQuantity) return current;
      return current.map((line) =>
        line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
      );
    });
  }, []);

  const updateQuantity = useCallback((productId: string, nextQuantity: number) => {
    setCheckoutError(null);
    setIdempotencyKey(createIdempotencyKey());
    setCart((current) =>
      current.flatMap((line) => {
        if (line.item.id !== productId) return [line];
        if (nextQuantity <= 0) return [];
        return [{ ...line, quantity: Math.min(nextQuantity, line.item.availableQuantity) }];
      }),
    );
  }, []);

  const handlePrepareOrder = async () => {
    if (cart.length === 0 || submittingSale) return;
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    if (!trimmedName || !trimmedPhone) {
      setCheckoutError('Ingresa el nombre y teléfono del cliente para identificar la orden en Caja Cared.');
      return;
    }
    setCheckoutError(null);
    setSubmittingSale(true);
    try {
      const sale = await createResellerSale(
        {
          items: cart.map((line) => ({ productId: line.item.id, quantity: line.quantity })),
          customerName: trimmedName,
          customerPhone: trimmedPhone,
          ...(orderNotes.trim() ? { notes: orderNotes.trim() } : {}),
        },
        idempotencyKey,
      );
      setLastCreatedSale(sale);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setOrderNotes('');
      window.sessionStorage.removeItem(draftStorageKey(profile.id));
      setIdempotencyKey(createIdempotencyKey());
      await Promise.all([loadCatalog(), loadSales()]);
    } catch (requestError) {
      setCheckoutError(errorMessage(requestError));
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleCancelSale = async (saleId: string) => {
    setCancellingId(saleId);
    setError(null);
    try {
      await cancelResellerSale(saleId, 'Cancelada por el revendedor');
      await Promise.all([loadCatalog(), loadSales()]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setCancellingId(null);
    }
  };

  const copyHandoffCode = (code: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        window.setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 2200);
      });
    }
  };

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-MX');
    if (!normalized) return items;
    return items.filter((item) =>
      [item.name, item.sku, item.category, item.description]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('es-MX').includes(normalized)),
    );
  }, [items, query]);

  const quickPickerItems = useMemo(() => {
    const normalized = cartPickerQuery.trim().toLocaleLowerCase('es-MX');
    return items
      .filter((item) => item.availableQuantity > 0)
      .filter((item) => {
        if (!normalized) return true;
        return [item.name, item.sku, item.category, item.description]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase('es-MX').includes(normalized));
      })
      .slice(0, 12);
  }, [items, cartPickerQuery]);

  const inventoryCategories = useMemo(
    () => ['ALL', ...Array.from(new Set((inventory?.items || []).map((item) => item.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'es-MX'))],
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    const normalized = inventoryQuery.trim().toLocaleLowerCase('es-MX');
    return (inventory?.items || []).filter((item) => {
      if (inventoryStatus !== 'ALL' && item.availabilityStatus !== inventoryStatus) return false;
      if (inventoryCategory !== 'ALL' && item.category !== inventoryCategory) return false;
      if (!normalized) return true;
      return [item.sku, item.name, item.category]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('es-MX').includes(normalized));
    });
  }, [inventory, inventoryCategory, inventoryQuery, inventoryStatus]);

  const cartTotal = useMemo(
    () => cart.reduce((total, line) => total + line.item.unitPrice * line.quantity, 0),
    [cart],
  );

  const cartCurrency = cart[0]?.item.currency || 'MXN';
  const cartItemCount = useMemo(
    () => cart.reduce((count, line) => count + line.quantity, 0),
    [cart],
  );

  return (
    <div className="reseller-layout">
      <ResellerNavigation
        profile={profile}
        activeSection={activeSection}
        itemCount={cartItemCount}
        onSelectSection={selectSection}
        onSignOut={onSignOut}
      />
      <main className="app-shell">
        <header className="topbar">
          <div className="topbar-brand">
            <p className="eyebrow">CARED</p>
            <h1>Revendedores</h1>
          </div>
          <div className="account">
            <span className="account-name">{profile.name || profile.role}</span>
          </div>
        </header>

        {error && <p className="form-error catalog-error" role="alert">{error}</p>}

        {activeSection === 'dashboard' && (
          <section id="reseller-dashboard" className="section-view" aria-labelledby="dashboard-title">
            <div className="dashboard-overview">
              <div>
                <p className="eyebrow">PANEL</p>
                <h2 id="dashboard-title">Resumen de hoy</h2>
              </div>
              <div className="dashboard-metrics">
                <article>
                  <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
                  <div><strong>{inventory?.summary?.productCount ?? items.length}</strong><p>Piezas en catálogo</p></div>
                </article>
                <article>
                  <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
                  <div><strong>{inventory?.summary?.availableQuantity ?? 0}</strong><p>Piezas disponibles</p></div>
                </article>
                <article>
                  <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
                  <div><strong>{cartItemCount}</strong><p>Piezas en preparación</p></div>
                </article>
              </div>
            </div>
            <div className="dashboard-shortcuts" aria-label="Accesos por sección">
              <button type="button" className="shortcut-card" onClick={() => selectSection('inventory')}>
                <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
                <div>
                  <p className="eyebrow">INVENTARIO</p>
                  <h3>Consultar disponibilidad</h3>
                  <small>{inventory?.summary?.stockOnHandQuantity ?? 0} piezas físicas · {inventory?.summary?.lowStockCount ?? 0} en stock bajo</small>
                </div>
                <span className="material-symbols-outlined shortcut-arrow" aria-hidden="true">arrow_forward</span>
              </button>
              <button type="button" className="shortcut-card" onClick={() => selectSection('catalog')}>
                <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
                <div>
                  <p className="eyebrow">CATÁLOGO</p>
                  <h3>Explorar piezas para vender</h3>
                  <small>{items.length} piezas habilitadas para revendedor</small>
                </div>
                <span className="material-symbols-outlined shortcut-arrow" aria-hidden="true">arrow_forward</span>
              </button>
              <button type="button" className="shortcut-card" onClick={() => selectSection('cart')}>
                <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
                <div>
                  <p className="eyebrow">VENTA EN PREPARACIÓN</p>
                  <h3>Ver carrito</h3>
                  <small>{cartItemCount > 0 ? `${cartItemCount} piezas · ${currency(cartTotal, cartCurrency)}` : 'Sin piezas agregadas todavía'}</small>
                </div>
                <span className="material-symbols-outlined shortcut-arrow" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {activeSection === 'inventory' && (
          <section id="reseller-inventory" className="inventory-workspace section-view" aria-labelledby="inventory-title">
            <div className="inventory-heading">
              <div>
                <p className="eyebrow">INVENTARIO</p>
                <h2 id="inventory-title">Disponibilidad para Revendedores</h2>
                <p>Consulta existencias compartidas. Cared administra las altas, ajustes y reservas.</p>
              </div>
              <div className="hero-actions">
                <span className="read-only-badge"><span className="material-symbols-outlined" aria-hidden="true">visibility</span> Solo lectura</span>
                <button type="button" className="secondary" onClick={() => void loadCatalog()} disabled={loading}>
                  <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                  Actualizar
                </button>
              </div>
            </div>
            <div className="inventory-summary" aria-label="Resumen de inventario">
              <article><span>Existencia física</span><strong>{inventory?.summary?.stockOnHandQuantity ?? 0}</strong></article>
              <article><span>Reservadas</span><strong>{inventory?.summary?.reservedQuantity ?? 0}</strong></article>
              <article><span>Disponibles</span><strong>{inventory?.summary?.availableQuantity ?? 0}</strong></article>
              <article className={(inventory?.summary?.lowStockCount || 0) > 0 ? 'attention' : ''}><span>Stock bajo</span><strong>{inventory?.summary?.lowStockCount ?? 0}</strong></article>
            </div>
            <div className="inventory-toolbar" aria-label="Filtros de inventario">
              <label className="search-field">
                <span>Buscar inventario</span>
                <input value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} placeholder="Pieza, SKU o categoría" />
              </label>
              <label className="inventory-select">
                <span>Estado</span>
                <select value={inventoryStatus} onChange={(event) => setInventoryStatus(event.target.value as 'ALL' | ResellerInventoryAvailabilityStatus)}>
                  <option value="ALL">Todos los estados</option>
                  {Object.entries(inventoryStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="inventory-select">
                <span>Categoría</span>
                <select value={inventoryCategory} onChange={(event) => setInventoryCategory(event.target.value)}>
                  <option value="ALL">Todas las categorías</option>
                  {inventoryCategories.filter((category) => category !== 'ALL').map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            </div>
            <div className="inventory-table-wrap">
              {loading ? <p className="empty-state">Cargando inventario…</p> : filteredInventory.length === 0 ? <p className="empty-state">No hay piezas que coincidan con los filtros.</p> : (
                <table className="inventory-table">
                  <thead><tr><th>Pieza</th><th>Categoría</th><th>Física</th><th>Reservada</th><th>Disponible</th><th>Estado</th></tr></thead>
                  <tbody>{filteredInventory.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong><small>{item.sku}</small></td>
                      <td>{item.category || 'Sin categoría'}</td>
                      <td>{item.stockOnHand}</td><td>{item.reservedQuantity}</td><td>{item.availableQuantity}</td>
                      <td>
                        <span className={`inventory-status ${(item.availabilityStatus || 'AVAILABLE').toLocaleLowerCase()}`}>
                          {inventoryStatusLabel[item.availabilityStatus] || 'Disponible'}
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {activeSection === 'catalog' && (
          <section id="reseller-catalog" className="catalog-workspace section-view" aria-label="Catálogo disponible">
            <div className="hero">
              <div>
                <p className="eyebrow">CATÁLOGO</p>
                <h2>Piezas disponibles para vender</h2>
                <p>Precios y existencias sincronizados directamente con LuxuryOS.</p>
              </div>
              <div className="hero-actions">
                <span className="channel-badge">Canal Revendedores</span>
                {cartItemCount > 0 && (
                  <button type="button" className="secondary" onClick={() => selectSection('cart')}>
                    <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
                    Ver venta ({cartItemCount})
                  </button>
                )}
                <button type="button" className="secondary refresh-catalog" onClick={() => void loadCatalog()} disabled={loading}>
                  <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                  Actualizar catálogo
                </button>
              </div>
            </div>
            <div className="catalog-toolbar">
              <label className="search-field">
                <span>Buscar por pieza, SKU o categoría</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ej. anillo, RNG-001"
                />
              </label>
              <p>{filteredItems.length} {filteredItems.length === 1 ? 'pieza disponible' : 'piezas disponibles'}</p>
            </div>
            {loading ? (
              <p className="empty-state">Cargando catálogo…</p>
            ) : items.length === 0 ? (
              <p className="empty-state">No hay piezas habilitadas para Revendedores todavía.</p>
            ) : filteredItems.length === 0 ? (
              <p className="empty-state">No encontramos piezas que coincidan con tu búsqueda.</p>
            ) : (
              <section className="catalog-grid">
                {filteredItems.map((item) => (
                  <CatalogCard
                    key={item.id}
                    item={item}
                    quantityInCart={cartQuantity(item.id)}
                    onAdd={addToCart}
                  />
                ))}
              </section>
            )}
          </section>
        )}

        {activeSection === 'cart' && (
          <section id="reseller-cart" className="cart-workspace section-view" aria-label="Venta en preparación">
            <div className="hero">
              <div>
                <p className="eyebrow">VENTA EN PREPARACIÓN</p>
                <h2>Orden para Caja Cared</h2>
                <p>Prepara las piezas y genera una orden reservada por 30 minutos para cobrarla en Cared.</p>
              </div>
              <div className="hero-actions">
                <button type="button" className="secondary" onClick={() => selectSection('catalog')}>
                  <span className="material-symbols-outlined" aria-hidden="true">grid_view</span>
                  Ir al catálogo
                </button>
              </div>
            </div>

            {lastCreatedSale && (
              <section className="handoff-card" aria-live="polite">
                <div className="handoff-head">
                  <div>
                    <p className="eyebrow">ORDEN LISTA PARA COBRO EN CARED</p>
                    <h3>Folio {lastCreatedSale.handoffCode}</h3>
                    <p>Presenta este folio en caja de Cared para liquidar y liberar la entrega.</p>
                  </div>
                  <span className={`sale-status ${saleStatusMeta[lastCreatedSale.status]?.tone || 'pending'}`}>
                    {saleStatusMeta[lastCreatedSale.status]?.label || lastCreatedSale.status}
                  </span>
                </div>
                <div className="handoff-meta">
                  <div>
                    <small>Cliente</small>
                    <strong>
                      {lastCreatedSale.customerName || 'Sin especificar'}
                      {lastCreatedSale.customerPhone ? ` · ${lastCreatedSale.customerPhone}` : ''}
                    </strong>
                  </div>
                  <div>
                    <small>Total a cobrar</small>
                    <strong>{currency(lastCreatedSale.totalAmount, lastCreatedSale.currency)}</strong>
                  </div>
                  <div>
                    <small>Reserva vigente hasta</small>
                    <strong>{formatDateTime(lastCreatedSale.expiresAt)}</strong>
                  </div>
                </div>
                <div className="handoff-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => copyHandoffCode(lastCreatedSale.handoffCode)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                    {copiedCode === lastCreatedSale.handoffCode ? 'Folio copiado' : `Copiar ${lastCreatedSale.handoffCode}`}
                  </button>
                  <button type="button" className="secondary" onClick={() => selectSection('sales')}>
                    <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                    Ver en Mis ventas
                  </button>
                </div>
              </section>
            )}

            <aside className="cart-panel cart-panel-standalone">
              <div className="cart-heading">
                <div>
                  <p className="eyebrow">RESUMEN DE VENTA</p>
                  <h2>{cartItemCount} {cartItemCount === 1 ? 'pieza' : 'piezas'}</h2>
                </div>
                <span>{currency(cartTotal, cartCurrency)}</span>
              </div>
              <div className="cart-customer-fields">
                <p className="eyebrow full-span">1. Maestro · Datos del cliente</p>
                <label>
                  <span>Cliente / Referencia *</span>
                  <input
                    maxLength={150}
                    required
                    value={customerName}
                    onChange={(event) => {
                      setCheckoutError(null);
                      setCustomerName(event.target.value);
                      setIdempotencyKey(createIdempotencyKey());
                    }}
                    placeholder="Ej. Sofía Villalobos"
                  />
                </label>
                <label>
                  <span>Teléfono *</span>
                  <input
                    maxLength={40}
                    required
                    value={customerPhone}
                    onChange={(event) => {
                      setCheckoutError(null);
                      setCustomerPhone(event.target.value);
                      setIdempotencyKey(createIdempotencyKey());
                    }}
                    placeholder="Ej. 644 123 4567"
                  />
                </label>
                <label className="full-span">
                  <span>Notas para caja (opcional)</span>
                  <input
                    maxLength={500}
                    value={orderNotes}
                    onChange={(event) => {
                      setOrderNotes(event.target.value);
                      setIdempotencyKey(createIdempotencyKey());
                    }}
                    placeholder="Ej. Pasa a pagar en sucursal Centro / entrega en estuche"
                  />
                </label>
              </div>
              <div className="cart-quick-picker">
                <p className="eyebrow">2. Detalle · Agregar artículos a la orden</p>
                <label className="search-field cart-picker-search">
                  <span>Buscar pieza para agregar</span>
                  <input
                    type="search"
                    value={cartPickerQuery}
                    onChange={(event) => setCartPickerQuery(event.target.value)}
                    placeholder="Buscar por nombre, SKU o categoría para agregar..."
                  />
                </label>
                {loading && items.length === 0 ? (
                  <p className="cart-picker-empty">Cargando piezas disponibles…</p>
                ) : quickPickerItems.length === 0 ? (
                  <p className="cart-picker-empty">No hay piezas disponibles que coincidan con la búsqueda.</p>
                ) : (
                  <div className="cart-picker-list" role="list" aria-label="Piezas disponibles para agregar">
                    {quickPickerItems.map((item) => {
                      const inCart = cartQuantity(item.id);
                      const remaining = Math.max(0, item.availableQuantity - inCart);
                      return (
                        <div className="cart-picker-row" role="listitem" key={item.id}>
                          <div className="cart-picker-info">
                            <span className="sku">{item.sku}</span>
                            <strong>{item.name}</strong>
                            <small>
                              {currency(item.unitPrice, item.currency)} · {remaining} {remaining === 1 ? 'disponible' : 'disponibles'}
                              {inCart > 0 ? ` (${inCart} en orden)` : ''}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="secondary cart-picker-add"
                            disabled={remaining === 0}
                            onClick={() => addToCart(item)}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">add</span>
                            {inCart > 0 ? 'Agregar otra' : 'Agregar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {cart.length === 0 ? (
                <p className="cart-empty">Selecciona piezas arriba o desde el catálogo. La disponibilidad se reserva por 30 minutos al generar la orden.</p>
              ) : (
                <div className="cart-lines">
                  {cart.map((line) => (
                    <article className="cart-line" key={line.item.id}>
                      <div>
                        <p className="sku">{line.item.sku}</p>
                        <h3>{line.item.name}</h3>
                        <strong>{currency(line.item.unitPrice * line.quantity, line.item.currency)}</strong>
                      </div>
                      <div className="quantity-stepper" aria-label={`Cantidad de ${line.item.name}`}>
                        <button type="button" onClick={() => updateQuantity(line.item.id, line.quantity - 1)} aria-label={`Quitar una ${line.item.name}`}>−</button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(line.item.id, line.quantity + 1)}
                          disabled={line.quantity >= line.item.availableQuantity}
                          aria-label={`Agregar una ${line.item.name}`}
                        >+
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="cart-total">
                <span>Total de la orden</span>
                <strong>{currency(cartTotal, cartCurrency)}</strong>
              </div>
              {checkoutError && <p className="form-error checkout-error" role="alert">{checkoutError}</p>}
              <button
                type="button"
                className="checkout-button"
                disabled={cart.length === 0 || submittingSale}
                onClick={() => void handlePrepareOrder()}
              >
                <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                {submittingSale ? 'Reservando inventario…' : 'Preparar cobro con Cared'}
              </button>
              <p className="cart-disclaimer">Al confirmar, el inventario queda reservado 30 minutos para que Cared realice el cobro en POS.</p>
            </aside>
          </section>
        )}

        {activeSection === 'sales' && (
          <section id="reseller-sales" className="inventory-workspace section-view" aria-labelledby="sales-title">
            <div className="inventory-heading">
              <div>
                <p className="eyebrow">OPERACIÓN</p>
                <h2 id="sales-title">Mis órdenes de venta</h2>
                <p>Seguimiento en vivo de órdenes enviadas a caja de Cared, reservas activas y ventas liquidadas.</p>
              </div>
              <div className="hero-actions">
                <button type="button" className="secondary" onClick={() => selectSection('catalog')}>
                  <span className="material-symbols-outlined" aria-hidden="true">add</span>
                  Nueva venta
                </button>
                <button type="button" className="secondary" onClick={() => void Promise.all([loadSales(), loadCatalog()])} disabled={salesLoading}>
                  <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                  Actualizar
                </button>
              </div>
            </div>

            <div className="sales-filter-bar" role="tablist" aria-label="Filtrar mis ventas">
              {([
                { id: 'ALL', label: 'Todas' },
                { id: 'PENDING_PAYMENT', label: 'Pendientes de cobro' },
                { id: 'PAID', label: 'Pagadas' },
                { id: 'CANCELLED', label: 'Canceladas' },
                { id: 'EXPIRED', label: 'Expiradas' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={salesFilter === tab.id}
                  className={salesFilter === tab.id ? 'sales-filter-pill active' : 'sales-filter-pill'}
                  onClick={() => setSalesFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {salesLoading ? (
              <p className="empty-state">Cargando órdenes…</p>
            ) : (
              (() => {
                const visibleSales = salesFilter === 'ALL'
                  ? sales
                  : sales.filter((sale) => sale.status === salesFilter);
                if (visibleSales.length === 0) {
                  return <p className="empty-state">No hay órdenes registradas con ese filtro.</p>;
                }
                return (
                  <div className="sales-list">
                    {visibleSales.map((sale) => {
                      const meta = saleStatusMeta[sale.status] || { label: sale.status, tone: 'neutral' };
                      return (
                        <article key={sale.id} className="sale-card">
                          <div className="sale-card-head">
                            <div>
                              <p className="sku">{sale.handoffCode} · {formatDateTime(sale.createdAt)}</p>
                              <h3>{sale.customerName || 'Cliente mostrador revendedor'}</h3>
                              {sale.customerPhone && <small className="sale-sub">{sale.customerPhone}</small>}
                            </div>
                            <span className={`sale-status ${meta.tone}`}>{meta.label}</span>
                          </div>
                          <ul className="sale-items-list">
                            {sale.items.map((item) => (
                              <li key={item.id}>
                                <span>{item.quantity} × {item.nameSnapshot} ({item.skuSnapshot})</span>
                                <strong>{currency(item.lineTotal, sale.currency)}</strong>
                              </li>
                            ))}
                          </ul>
                          <div className="sale-card-foot">
                            <div className="sale-amounts">
                              <span>Total: <strong>{currency(sale.totalAmount, sale.currency)}</strong></span>
                              {sale.paidAmount > 0 && (
                                <span>Pagado: <strong>{currency(sale.paidAmount, sale.currency)}</strong></span>
                              )}
                              {sale.status === 'PENDING_PAYMENT' && sale.expiresAt && (
                                <span className="sale-expiry">Vence: {formatDateTime(sale.expiresAt)}</span>
                              )}
                            </div>
                            <div className="hero-actions">
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => copyHandoffCode(sale.handoffCode)}
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                                {copiedCode === sale.handoffCode ? 'Copiado' : 'Copiar folio'}
                              </button>
                              {sale.status === 'PENDING_PAYMENT' && sale.paidAmount === 0 && (
                                <button
                                  type="button"
                                  className="secondary sign-out"
                                  disabled={cancellingId === sale.id}
                                  onClick={() => void handleCancelSale(sale.id)}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">cancel</span>
                                  {cancellingId === sale.id ? 'Cancelando…' : 'Cancelar reserva'}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </section>
        )}
      </main>
    </div>
  );
}

class ResellerErrorBoundary extends Component<
  { children: ReactNode; onSignOut: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="login-shell">
          <section className="login-card" role="alert">
            <div className="brand-lockup">
              <p className="eyebrow">CARED</p>
              <span aria-hidden="true" />
              <p className="brand-subtitle">REVENDEDORES</p>
            </div>
            <h1>No fue posible mostrar el panel</h1>
            <p className="form-error">{this.state.error.message || 'Ocurrió un error al renderizar el portal.'}</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => this.setState({ error: null })}>
                Reintentar
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  this.setState({ error: null });
                  this.props.onSignOut();
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [profile, setProfile] = useState<ResellerProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(resellerSession.getToken()));

  useEffect(() => {
    if (!resellerSession.getToken()) return;
    void getResellerProfile()
      .then((loaded) => {
        if (loaded && typeof loaded === 'object' && 'id' in loaded) {
          setProfile(loaded);
        } else {
          resellerSession.clear();
        }
      })
      .catch(() => resellerSession.clear())
      .finally(() => setCheckingSession(false));
  }, []);

  const signOut = () => {
    resellerSession.clear();
    setProfile(null);
  };

  if (checkingSession) {
    return <main className="login-shell"><p className="empty-state">Cargando sesión…</p></main>;
  }

  return profile ? (
    <ResellerErrorBoundary onSignOut={signOut}>
      <ResellerHome profile={profile} onSignOut={signOut} />
    </ResellerErrorBoundary>
  ) : (
    <LoginForm onAuthenticated={setProfile} />
  );
}
