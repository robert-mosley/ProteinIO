# ProteinIO Frontend

This is the frontend MVP for ProteinIO — a React + TypeScript app using Vite and Tailwind.

Install dependencies and run:

```bash
cd web
npm install
npm run dev
```

The frontend expects the backend to expose the following endpoints on the same origin (or adjust `src/services/api.ts`):

- `GET /proteins/{query}`
- `POST /chat` with JSON `{ message: string }`
