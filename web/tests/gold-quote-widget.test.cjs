const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '../..');
const goldUtilsSource = fs.readFileSync(
  path.join(rootDir, 'web/src/components/widgets/goldQuoteUtils.ts'),
  'utf8',
);
const goldWidgetSource = fs.readFileSync(
  path.join(rootDir, 'web/src/components/widgets/GoldQuoteWidget.tsx'),
  'utf8',
);
const widgetDockSource = fs.readFileSync(
  path.join(rootDir, 'web/src/components/widgets/WidgetDock.tsx'),
  'utf8',
);
const ordersSource = fs.readFileSync(
  path.join(rootDir, 'web/src/pages/Orders.tsx'),
  'utf8',
);
const settingsSource = fs.readFileSync(
  path.join(rootDir, 'web/src/pages/Settings.tsx'),
  'utf8',
);
const widgetsSettingsSource = fs.readFileSync(
  path.join(rootDir, 'web/src/pages/WidgetsSettings.tsx'),
  'utf8',
);
const appSource = fs.readFileSync(
  path.join(rootDir, 'web/src/App.tsx'),
  'utf8',
);

test('goldQuoteUtils exposes 4 karats, 3 pricing modes, enabled flag, and /settings persistence', () => {
  for (const karat of ['10K', '14K', '18K', '24K']) {
    assert.match(goldUtilsSource, new RegExp(`['"]${karat}['"]`));
  }
  assert.match(goldUtilsSource, /MARGIN_PERCENT/);
  assert.match(goldUtilsSource, /MARGIN_FIXED/);
  assert.match(goldUtilsSource, /MANUAL/);
  assert.match(goldUtilsSource, /enabled:\s*p\.enabled !== false/);
  assert.match(goldUtilsSource, /gold_quote_config/);
  assert.match(goldUtilsSource, /\/settings/);
  assert.match(goldUtilsSource, /\/settings\/gold-quote/);
  assert.match(goldUtilsSource, /pricingMode:\s*'MANUAL'/);
  assert.match(goldUtilsSource, /31\.1034768/);
});

test('gold settings become locally visible only after server persistence succeeds', () => {
  const saveFunctionStart = goldUtilsSource.indexOf('export async function saveGoldConfigToServer');
  const saveFunctionEnd = goldUtilsSource.indexOf('export function readCachedMarket', saveFunctionStart);
  const saveFunction = goldUtilsSource.slice(saveFunctionStart, saveFunctionEnd);
  const serverWrite = saveFunction.indexOf("await api.post('/settings'");
  const localPublish = saveFunction.indexOf('saveLocalGoldConfig(nextConfig)');

  assert.ok(serverWrite >= 0, 'must persist the official configuration on the server');
  assert.ok(localPublish > serverWrite, 'must not publish an unconfirmed configuration locally');
});

test('GoldQuoteWidget separates Seller workshop calculator from Admin market/margin controls', () => {
  assert.match(goldWidgetSource, /createPortal/);
  assert.match(goldWidgetSource, /isAdmin/);
  assert.match(goldWidgetSource, /Calculadora de Oro · Precios de Taller/);
  assert.match(goldWidgetSource, /calculate/);
  assert.match(goldWidgetSource, /if \(!config\.enabled\)/);
  assert.match(goldWidgetSource, /\{isAdmin && \(/);
});

test('WidgetDock hosts GoldQuoteWidget, respects visibility, and supports extensible widgets', () => {
  assert.match(widgetDockSource, /GoldQuoteWidget/);
  assert.match(widgetDockSource, /WidgetDefinition/);
  assert.match(widgetDockSource, /extraWidgets/);
  assert.match(widgetDockSource, /goldEnabled/);
  assert.match(widgetDockSource, /snap-x/);
  assert.match(widgetDockSource, /snap-mandatory/);
});

test('Orders mounts WidgetDock inside the responsive board header', () => {
  assert.match(ordersSource, /components\/widgets\/WidgetDock/);
  assert.match(ordersSource, /<WidgetDock\s*\/>/);
});

test('Admin can access widget visibility & parameter settings from Settings -> /settings/widgets', () => {
  assert.match(settingsSource, /Widgets del Tablero/);
  assert.match(settingsSource, /\/settings\/widgets/);
  assert.match(widgetsSettingsSource, /GoldQuoteAdminControls/);
  assert.match(widgetsSettingsSource, /enabled:\s*!config\.enabled/);
  assert.match(appSource, /path="\/settings\/widgets"/);
  assert.match(appSource, /WidgetsSettings/);
});
