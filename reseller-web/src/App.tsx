import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  errorMessage,
  getResellerCatalog,
  getResellerProfile,
  login,
  resellerSession,
} from './services/api';
import type { ResellerCatalogItem, ResellerProfile } from './types';

const currency = (amount: number, code: string) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: code || 'MXN',
    maximumFractionDigits: 2,
  }).format(amount);

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
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">CARED</p>
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
        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>✦</span>}
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

function ResellerHome({ profile, onSignOut }: { profile: ResellerProfile; onSignOut: () => void }) {
  const [items, setItems] = useState<ResellerCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await getResellerCatalog();
      setItems(catalog.items);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const cartQuantity = useCallback(
    (productId: string) => cart.find((line) => line.item.id === productId)?.quantity || 0,
    [cart],
  );

  const addToCart = useCallback((item: ResellerCatalogItem) => {
    setCheckoutNotice(null);
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
    setCheckoutNotice(null);
    setCart((current) =>
      current.flatMap((line) => {
        if (line.item.id !== productId) return [line];
        if (nextQuantity <= 0) return [];
        return [{ ...line, quantity: Math.min(nextQuantity, line.item.availableQuantity) }];
      }),
    );
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-MX');
    if (!normalized) return items;
    return items.filter((item) =>
      [item.name, item.sku, item.category, item.description]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('es-MX').includes(normalized)),
    );
  }, [items, query]);

  const cartTotal = useMemo(
    () => cart.reduce((total, line) => total + line.item.unitPrice * line.quantity, 0),
    [cart],
  );

  const cartCurrency = cart[0]?.item.currency || 'MXN';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CARED</p>
          <h1>Revendedores</h1>
        </div>
        <div className="account">
          <span>{profile.name || profile.role}</span>
          <button type="button" className="secondary" onClick={onSignOut}>Salir</button>
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">CATÁLOGO</p>
          <h2>Piezas disponibles para vender</h2>
          <p>Precios y existencias sincronizados directamente con LuxuryOS.</p>
        </div>
        <div className="hero-actions">
          <span className="channel-badge">Canal Revendedores</span>
          <button type="button" className="secondary" onClick={() => void loadCatalog()} disabled={loading}>
            Actualizar catálogo
          </button>
        </div>
      </section>
      {error && <p className="form-error catalog-error" role="alert">{error}</p>}
      <div className="sales-workspace">
        <section className="catalog-workspace" aria-label="Catálogo disponible">
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

        <aside className="cart-panel" aria-label="Venta en preparación">
          <div className="cart-heading">
            <div>
              <p className="eyebrow">VENTA EN PREPARACIÓN</p>
              <h2>Carrito</h2>
            </div>
            <span>{cart.reduce((count, line) => count + line.quantity, 0)} piezas</span>
          </div>
          {cart.length === 0 ? (
            <p className="cart-empty">Agrega las piezas que desea comprar tu cliente. La disponibilidad se valida antes del cobro.</p>
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
            <span>Total estimado</span>
            <strong>{currency(cartTotal, cartCurrency)}</strong>
          </div>
          {checkoutNotice && <p className="checkout-notice" role="status">{checkoutNotice}</p>}
          <button
            type="button"
            className="checkout-button"
            disabled={cart.length === 0}
            onClick={() => setCheckoutNotice('El cobro será procesado por Cared. El checkout transaccional se habilitará en el siguiente bloque.')}
          >
            Preparar cobro con Cared
          </button>
          <p className="cart-disclaimer">El total es informativo hasta que Cared confirme el pago y LuxuryOS reserve el inventario.</p>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [profile, setProfile] = useState<ResellerProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(resellerSession.getToken()));

  useEffect(() => {
    if (!resellerSession.getToken()) return;
    void getResellerProfile()
      .then(setProfile)
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
    <ResellerHome profile={profile} onSignOut={signOut} />
  ) : (
    <LoginForm onAuthenticated={setProfile} />
  );
}
