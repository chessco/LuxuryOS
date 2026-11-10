import { FormEvent, useCallback, useEffect, useState } from 'react';
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

function CatalogCard({ item }: { item: ResellerCatalogItem }) {
  const isAvailable = item.availableQuantity > 0;
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
            {isAvailable ? `${item.availableQuantity} disponible${item.availableQuantity === 1 ? '' : 's'}` : 'Sin disponibilidad'}
          </span>
        </div>
      </div>
    </article>
  );
}

function ResellerHome({ profile, onSignOut }: { profile: ResellerProfile; onSignOut: () => void }) {
  const [items, setItems] = useState<ResellerCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <p>Los precios y existencias provienen directamente de LuxuryOS.</p>
        </div>
        <button type="button" className="secondary" onClick={() => void loadCatalog()} disabled={loading}>
          Actualizar catálogo
        </button>
      </section>
      {error && <p className="form-error catalog-error" role="alert">{error}</p>}
      {loading ? (
        <p className="empty-state">Cargando catálogo…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">No hay piezas habilitadas para Revendedores todavía.</p>
      ) : (
        <section className="catalog-grid" aria-label="Catálogo disponible">
          {items.map((item) => <CatalogCard key={item.id} item={item} />)}
        </section>
      )}
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
