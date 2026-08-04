# Quick Start Guide (Windows)

Get the Transaction Monitoring Dashboard running on Windows in 5 minutes.

## ✅ Prerequisites Check

Open PowerShell and verify you have installed:

```powershell
java -version           # Should show Java 17.x.x
mvn -version           # Should show Maven 3.9+
node -v               # Should show 18+
npm -v                # Should show 9+
mysql --version       # Should show 8.0+
```

If any are missing:
- [Java 17 JDK](https://www.oracle.com/java/technologies/downloads/#java17)
- [Maven](https://maven.apache.org/download.cgi)
- [Node.js](https://nodejs.org/)
- [MySQL](https://www.mysql.com/downloads/)

## 🚀 Start Database

Open PowerShell **as Administrator**:

```powershell
net start MySQL80
```

To verify MySQL is running:

```powershell
mysql -u root -p -e "SELECT 1;"
```

You should see a result with no errors.

## 🏃 Run Everything (Two PowerShell Windows)

### Window 1: Backend

```powershell
cd "C:\path\to\108-06--Transaction-Monitoring-Alerts-Dashboard"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your-local-password"
mvnw.cmd spring-boot:run
```

If you prefer a profile file, copy `src\main\resources\application-local.properties.example` to `src\main\resources\application-local.properties`, update the values, and run:

```powershell
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

Wait for output showing:
```
Started Transaction_Monitoring in X.XXX seconds
```

### Window 2: Frontend

```powershell
cd "C:\path\to\108-06--Transaction-Monitoring-Alerts-Dashboard\frontend"
npm install
npm run dev
```

Wait for output showing:
```
➜  Local:   http://localhost:5173/
```

## 🌐 Access the Application

Once both are running:

| Component | URL |
|-----------|-----|
| 🎨 **Frontend Dashboard** | http://localhost:5173 |
| 📡 **Backend API** | http://localhost:8080 |
| 📚 **API Documentation** | http://localhost:8080/swagger-ui.html |

## 🛑 Stop Everything

- **Backend**: Press `Ctrl+C` in PowerShell Window 1
- **Frontend**: Press `Ctrl+C` in PowerShell Window 2
- **MySQL**: `net stop MySQL80`

## ❌ Common Issues on Windows

### "Port 8080 already in use"

```powershell
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Or use a different port in: src\main\resources\application.properties
# Change: server.port=8080 to server.port=8081
```

### "Port 5173 already in use"

```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### "MySQL connection failed"

1. Ensure MySQL is running: `net start MySQL80`
2. Test connection:
   ```powershell
   mysql -u root -p -e "USE transaction_management; SELECT 1;"
   ```
3. If database doesn't exist:
   ```powershell
   mysql -u root -p -e "CREATE DATABASE transaction_management;"
   ```

### "mvnw command not found"

Use full path:
```powershell
cd "C:\path\to\108-06--Transaction-Monitoring-Alerts-Dashboard"
.\mvnw.cmd spring-boot:run
```

### "npm modules not installed"

In frontend directory:
```powershell
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

## 📖 Full Documentation

For detailed setup, troubleshooting, and configuration → See [SETUP.md](./SETUP.md)

## 💡 Tips

- Keep both PowerShell windows side-by-side for easier debugging
- Frontend auto-reloads when you save changes
- Backend requires restart to reload Java changes
- Use browser DevTools (F12) to check API calls in Network tab

---

**That's it!** 🎉 You're ready to develop. Check out the dashboard at http://localhost:5173

