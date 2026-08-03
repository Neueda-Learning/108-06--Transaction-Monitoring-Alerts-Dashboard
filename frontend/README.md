# Transaction Monitoring Frontend

Professional React 19 UI for the Transaction Monitoring & Alerts Dashboard. Built with **TypeScript** and **Vite**.

## 🎯 Overview

This is the frontend application that connects to the Spring Boot backend to provide:
- Real-time transaction monitoring dashboard
- Alert management and filtering
- Transaction search and creation
- Monitoring rules management
- Interactive charts and metrics

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite 8** - Lightning-fast build tool
- **React Router 7** - Client-side routing
- **Recharts** - Chart library for dashboards
- **Lucide React** - Icon library
- **Vitest** - Unit testing framework
- **ESLint** - Code quality

## ✨ Features

### Dashboard
- Metrics from live backend data (`/api/transactions`, `/api/alerts`, `/api/rules`)
- Interactive charts and status overview
- Real-time updates

### Transactions
- View all transactions (`GET /api/transactions`)
- Create new transactions (`POST /api/transactions`)
- Search and filter capabilities
- Transaction detail view

### Alerts
- List all alerts (`GET /api/alerts`)
- Filter by status and severity
- View alert details (`GET /api/alerts/{id}`)
- Update alert status (`PATCH /api/alerts/{id}/status`)

### Rules
- List monitoring rules (`GET /api/rules`)
- Create new rules (`POST /api/rules`)
- Update existing rules (`PUT /api/rules/{id}`)
- Delete rules (`DELETE /api/rules/{id}`)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Backend running on `http://localhost:8080`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at **http://localhost:5173/**

The Vite proxy automatically forwards `/api/*` requests to `http://localhost:8080`.

## 📦 Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run linter to check code quality
npm run lint

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 🔌 API Integration

The frontend connects to the backend using a typed API client:

```
Frontend API Layer:
├── /api/transactions.ts   - Transaction endpoints
├── /api/alerts.ts         - Alert endpoints
├── /api/rules.ts          - Rules endpoints
└── /api/client.ts         - Base HTTP client
```

### API Base URL Configuration

By default, the app uses Vite's proxy to forward requests to the backend.

**Optional**: Create `.env.local` to customize:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## 📁 Project Structure

```
src/
├── components/           # Reusable React components
│   ├── Layout.tsx
│   ├── PageHeader.tsx
│   └── StatusBadge.tsx
├── pages/               # Page-level components
│   ├── DashboardPage.tsx
│   ├── AlertsPage.tsx
│   ├── AlertDetailPage.tsx
│   ├── TransactionsPage.tsx
│   └── RulesPage.tsx
├── api/                 # API client code
│   ├── client.ts
│   ├── transactions.ts
│   ├── alerts.ts
│   ├── rules.ts
│   └── types.ts
├── utils/               # Utility functions
│   ├── format.ts
│   └── format.test.ts
├── App.tsx              # Main app component
└── main.tsx             # Application entry point
```

## 🧪 Testing

Run the test suite:

```bash
npm run test
```

Watch mode for development:

```bash
npm run test:watch
```

## ✅ Code Quality

Check code with ESLint:

```bash
npm run lint
```

The project uses:
- **ESLint** for code quality
- **TypeScript** for type safety
- **Prettier** formatting (via ESLint)

## 🔧 Configuration Files

- `vite.config.ts` - Vite build configuration with API proxy
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint rules
- `vitest.config.ts` - Testing configuration
- `.env.example` - Environment variables template

## 📊 Build Output

Production build creates optimized files:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Main bundle
│   └── index-[hash].css     # Styles
```

Build size: ~600KB (optimized)

## 🚀 Performance

- **React Compiler enabled** - automatic performance optimizations
- **Code splitting** - dynamic imports for lazy loading
- **Vite HMR** - instant hot module replacement in dev
- **Tree-shaking** - removed unused code

## 🔗 Related Documentation

- **[Parent README](../README.md)** - Full project overview
- **[Setup Guide](../SETUP.md)** - Detailed environment setup
- **[React Documentation](https://react.dev)**
- **[Vite Documentation](https://vitejs.dev)**
- **[TypeScript Handbook](https://www.typescriptlang.org/docs)**

## 🐛 Troubleshooting

### Port 5173 Already in Use

```powershell
# Find process using port
netstat -ano | findstr :5173

# Kill the process
taskkill /PID <PID> /F
```

### API Requests Failing

- Ensure backend is running on `http://localhost:8080`
- Check browser DevTools Network tab for failed requests
- Verify proxy configuration in `vite.config.ts`

### Dependencies Issues

```bash
# Clean reinstall
rm -r node_modules package-lock.json
npm install
```

## 📝 Notes

- The app expects the backend to be running during development
- API responses are fully typed via TypeScript interfaces in `api/types.ts`
- All API calls use the centralized client in `api/client.ts`
