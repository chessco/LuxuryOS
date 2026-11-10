# Revendedores

Frontend Vite + React para `revendedor.pitayacode.io`.

## Desarrollo local

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

El API debe estar disponible en `VITE_API_URL`. Por defecto usa `http://localhost:3002`.

## Contrato

El contrato HTTP autoritativo está en:

`../docs/contracts/reseller-pos.openapi.yaml`

No duplicar ni extender manualmente los payloads del API sin cambiar primero ese contrato y el módulo `api/src/reseller-pos`.
