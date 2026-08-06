# Transaction Monitoring & Alerts Dashboard

A comprehensive full-stack application for monitoring financial transactions and managing automated alert rules. Built with **Spring Boot 3** backend and **React 19** frontend.

## 🎯 Overview

This application provides:
- **Transaction Monitoring**: Real-time tracking and visualization of financial transactions
- **Alert Management**: Automated alerts based on configurable monitoring rules
- **Rule Engine**: Create and manage complex transaction monitoring rules
- **Dashboard**: Interactive UI for monitoring and analysis
- **REST API**: Comprehensive API for integrations

## 🏗️ Architecture

### Backend
- **Framework**: Spring Boot 3.3.2
- **Language**: Java 17
- **Database**: MySQL
- **Location**: Root directory `/src`

### Frontend
- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite 8
- **Routing**: React Router 7
- **Charts**: Recharts
- **Location**: `/frontend` directory

## ⚡ Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8.0+
- Maven 3.9+ (or use included `mvnw`)

### Running Locally

**Full setup instructions**: See [SETUP.md](./SETUP.md)

**Quick version:**

```bash
# Terminal 1: Backend (from project root)
mvnw.cmd spring-boot:run

# Terminal 2: Frontend (from project root)
cd frontend && npm install && npm run dev
```

Then visit:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8080](http://localhost:8080)

## 📁 Project Structure

```
.
├── src/                           # Java backend source code
│   ├── main/java/com/fbi/        # Application code
│   │   ├── controller/            # REST endpoints
│   │   ├── service/               # Business logic
│   │   ├── repository/            # Database access
│   │   ├── dto/                   # Data transfer objects
│   │   ├── model/                 # JPA entities
│   │   └── config/                # Configuration classes
│   ├── main/resources/
│   │   └── application.properties  # Backend configuration
│   └── test/                      # Unit and integration tests
│
├── frontend/                      # React TypeScript frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                 # Page components
│   │   ├── api/                   # API client code
│   │   ├── utils/                 # Utilities
│   │   └── App.tsx                # Main app component
│   ├── package.json               # Frontend dependencies
│   └── vite.config.ts             # Vite configuration
│
├── pom.xml                        # Maven configuration
├── SETUP.md                       # Detailed setup guide
└── README.md                      # This file
```

## 🔌 API Endpoints

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create new transaction

### Alerts
- `GET /api/alerts` - List all alerts
- `GET /api/alerts/{id}` - Get alert details
- `PATCH /api/alerts/{id}/status` - Advance alert lifecycle status

### Rules
- `GET /api/rules` - List all rules
- `GET /api/rules/{id}` - Get rule details
- `POST /api/rules` - Create new rule
- `PUT /api/rules/{id}` - Update rule
- `DELETE /api/rules/{id}` - Delete rule

### SDN Screening
- `GET /api/sdn/search?name={name}&threshold={threshold}` - Fuzzy search the loaded SDN list
- `GET /api/sdn/count` - Get the number of loaded SDN entries

## 🧪 Testing

### Backend Tests
```bash
mvnw.cmd test
# or
./mvnw test
```

### Frontend Tests
```bash
cd frontend
npm run test        # Run tests once
npm run test:watch  # Run tests in watch mode
```

### Linting
```bash
# Frontend
cd frontend
npm run lint        # Check for linting issues
npm run lint -- --fix  # Fix issues automatically
```

## 🔧 Development Commands

### Backend
```bash
# Clean build
mvnw.cmd clean compile

# Run with live reload
mvnw.cmd spring-boot:run

# Build JAR
mvnw.cmd clean package

# Run tests with coverage
mvnw.cmd test
```

### Frontend
```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Watch tests
npm run test:watch

# Lint code
npm run lint
```

## 🗄️ Database Configuration

The application uses MySQL. Shared defaults live in `src/main/resources/application.properties`, while credentials should be provided through environment variables or a local profile override.

```properties
DB_URL=jdbc:mysql://localhost:3306/transaction_management?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
DB_USERNAME=root
DB_PASSWORD=your-local-password
```

For profile-based local setup, copy `src/main/resources/application-local.properties.example` to `src/main/resources/application-local.properties`, update the values for your machine, and run Spring Boot with the `local` profile.

## 🚀 Deployment

For production deployment instructions and Docker setup, please refer to the deployment documentation (coming soon).

## 📚 Documentation

- **[Setup Guide](./SETUP.md)** - Detailed local development setup
- **[Java Code Reference](./FBI_Team_Reference_Part1.md)** - Backend technical reference
- **[Project Reference](./FBI_Team_Reference_Part2.md)** - Additional project documentation

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly (run both backend and frontend tests)
4. Commit with clear messages
5. Push to your branch
6. Create a Pull Request

## 📋 Code Style

- **Backend**: Follows Spring Boot conventions and Java best practices
- **Frontend**: Uses ESLint configuration for TypeScript/React
- Run `npm run lint` in frontend to check code style

##  Troubleshooting

For common issues and solutions, see [SETUP.md - Troubleshooting](./SETUP.md#-troubleshooting)

##  Support

For issues or questions, please refer to the project documentation or create an issue in the repository.



---

**Ready to get started?** → See [SETUP.md](./SETUP.md) for detailed setup instructions.

