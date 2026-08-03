# Local Development Setup Guide

This guide explains how to set up and run the Transaction Monitoring & Alerts Dashboard application on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Java 17**: [Download Java 17 JDK](https://www.oracle.com/java/technologies/downloads/#java17)
- **Maven 3.9+**: [Download Maven](https://maven.apache.org/download.cgi) or use the included `mvnw`
- **Node.js 18+**: [Download Node.js](https://nodejs.org/)
- **MySQL Server**: [Download MySQL](https://www.mysql.com/downloads/)

### Verify Installations

```bash
java -version          # Should show Java 17
mvn -version          # or .\mvnw -v on Windows
node -v               # Should show 18+
npm -v                # Should show 9+
mysql --version       # Should show 8.0+
```

---

## 🗄️ Database Setup

### 1. Start MySQL Server

**Windows (MySQL installed via installer):**
```bash
net start MySQL80
```

**Windows (MySQL installed via Chocolatey):**
```bash
mysqld --console
```

**macOS (via Homebrew):**
```bash
brew services start mysql
```

**Linux:**
```bash
sudo systemctl start mysql
```

### 2. Create the Database

Connect to MySQL and create the database:

```bash
mysql -u root -p
# Enter password: n3u3da!
```

Then in the MySQL shell:

```sql
CREATE DATABASE IF NOT EXISTS transaction_management;
```

### 3. Verify Connection

```bash
mysql -u root -pn3u3da! -e "USE transaction_management; SELECT 1;"
```

---

## 🚀 Backend Setup (Java/Spring Boot)

### 1. Navigate to Project Root

```bash
cd path/to/108-06--Transaction-Monitoring-Alerts-Dashboard
```

### 2. Build the Backend

Using Maven wrapper (no Maven installation needed):

```bash
# Windows
mvnw.cmd clean compile

# macOS/Linux
./mvnw clean compile
```

Or if Maven is installed globally:

```bash
mvn clean compile
```

### 3. Run the Backend

```bash
# Windows
mvnw.cmd spring-boot:run

# macOS/Linux
./mvnw spring-boot:run
```

Or:

```bash
mvn spring-boot:run
```

**Expected Output:**
```
Started Transaction_Monitoring in 5.123 seconds
Application running at http://localhost:8080
```

### 4. Access Backend Documentation

Once running, visit:
- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **API Docs**: [http://localhost:8080/api-docs](http://localhost:8080/api-docs)

### Backend Database Configuration

The backend uses these credentials (in `src/main/resources/application.properties`):

```
Database: transaction_management
Username: root
Password: n3u3da!
Port: 3306
```

If you need to change these, edit `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/transaction_management
spring.datasource.username=root
spring.datasource.password=n3u3da!
```

---

## 🎨 Frontend Setup (React/TypeScript)

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

**Expected Output:**
```
  VITE v8.2.0  ready in 123 ms
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 4. Frontend Available at

- **Development**: [http://localhost:5173/](http://localhost:5173/)

### Useful Frontend Commands

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm run test

# Watch tests
npm run test:watch
```

---

## ▶️ Running Both Simultaneously (Recommended)

### Option 1: Two Terminal Windows

**Terminal 1 - Backend:**
```bash
cd path/to/108-06--Transaction-Monitoring-Alerts-Dashboard
mvnw.cmd spring-boot:run
# or: ./mvnw spring-boot:run
```

**Terminal 2 - Frontend:**
```bash
cd path/to/108-06--Transaction-Monitoring-Alerts-Dashboard/frontend
npm run dev
```

### Option 2: Using VS Code Tasks

Create a `.vscode/tasks.json` in the project root:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Backend",
      "type": "shell",
      "command": "mvnw.cmd spring-boot:run",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Frontend",
      "type": "shell",
      "command": "npm run dev",
      "cwd": "${workspaceFolder}/frontend",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "All",
      "dependsOn": ["Backend", "Frontend"],
      "problemMatcher": []
    }
  ]
}
```

Then run: `Ctrl+Shift+B` and select "All"

---

## 🔌 API Endpoints

Once both services are running:

### Base URLs
- **Backend API**: `http://localhost:8080`
- **Frontend Dashboard**: `http://localhost:5173`

### Main API Routes

```
GET    /api/transactions       - List all transactions
GET    /api/transactions/{id}  - Get transaction details
POST   /api/transactions       - Create new transaction

GET    /api/alerts             - List all alerts
GET    /api/alerts/{id}        - Get alert details
POST   /api/alerts             - Create new alert

GET    /api/rules              - List all monitoring rules
POST   /api/rules              - Create new rule

GET    /api-docs               - OpenAPI specification
GET    /swagger-ui.html        - Swagger UI documentation
```

---

## 🛠️ Troubleshooting

### Backend Issues

**Port 8080 Already in Use**
```bash
# Find process using port 8080
netstat -ano | findstr :8080

# Kill process (Windows)
taskkill /PID <PID> /F
```

**Database Connection Failed**
- Ensure MySQL is running
- Check credentials in `application.properties`
- Verify database exists: `mysql -u root -pn3u3da! -e "SHOW DATABASES;"`

**Compilation Errors**
```bash
# Clean and rebuild
mvnw.cmd clean install
```

### Frontend Issues

**Dependencies not installing**
```bash
# Clear npm cache and reinstall
rm -r node_modules package-lock.json
npm install
```

**Port 5173 Already in Use**
```bash
# Kill process using the port
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Build Errors**
```bash
# Run linter to check for issues
npm run lint

# Fix linting issues
npm run lint -- --fix
```

---

## ✅ Verification Checklist

- [ ] Java 17 installed and in PATH
- [ ] Node.js 18+ installed
- [ ] MySQL server installed and running
- [ ] `transaction_management` database created
- [ ] Backend builds without errors
- [ ] Backend runs on `http://localhost:8080`
- [ ] Swagger UI accessible at `http://localhost:8080/swagger-ui.html`
- [ ] Frontend dependencies installed (`npm install` completed)
- [ ] Frontend runs on `http://localhost:5173`
- [ ] Frontend can communicate with backend

---

## 📖 Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Vite Documentation](https://vitejs.dev)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## 🚢 Production Deployment

For deployment information, see separate deployment documentation.

**Happy coding! 🎉**

