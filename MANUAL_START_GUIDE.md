# Manual Start Guide for ChatE Application

This guide explains how to start the application manually, including how to handle common errors and access the application from other devices or the internet.

## Prerequisites
1.  **MySQL Database**: Ensure MySQL 8.0 is running (via Workbench or Service).
2.  **Node.js**: Installed on your system.
3.  **Internet**: Required for Cloudflare Tunnel (Remote Access).

## 0. First Time Setup (Only if moved to a new PC)
If you just copied this project to a new computer, run these commands first to install dependencies:
```powershell
cd C:\ChatE\server
npm install
cd ..\client
npm install
npm run build
```

---

## 1. Start the Server (Backend + Frontend)

The server now serves both the backend API and the frontend application (via the production build).

1.  Open a terminal (PowerShell or Command Prompt).
2.  Navigate to the project directory:
    ```powershell
    cd C:\ChatE
    ```
3.  Start the server:
    ```powershell
    cd server
    npm start
    ```
    *   **Note**: This command automatically cleans up port 5001 if it's stuck, preventing "EADDRINUSE" errors.
    *   **Success Message**: You should see "Server running on port 5001" and "Database connected successfully".

## 2. Accessing the Application

### Option A: Local Access (Same Wi-Fi Network)
Use this if both devices (Laptop & Mobile) are connected to the same Wi-Fi.

1.  Find your Laptop's IP Address:
    *   Open a new terminal and run: `ipconfig`
    *   Look for "IPv4 Address" under "Wireless LAN adapter Wi-Fi" (e.g., `192.168.43.206`).
2.  Open your mobile browser (Chrome/Safari).
3.  Enter the URL:
    ```
    http://<YOUR_IP_ADDRESS>:5001
    ```
    *   Example: `http://192.168.43.206:5001`

### Option B: Remote Access (Internet / Different Network)
Use this if the user is on a different network (e.g., Mobile Data).

1.  Open a **new** terminal window (keep the server running in the first one).
2.  Navigate to the project folder:
    ```powershell
    cd C:\ChatE
    ```
3.  Run the "Get Link" script:
    ```powershell
    .\get_link.ps1
    ```
4.  The script will automatically find and display the **Public Link** in BIG GREEN TEXT.
5.  Copy that link (e.g., `https://funny-name.trycloudflare.com`).
6.  Share this URL with anyone. They can access the full application securely over the internet.

---

## Troubleshooting

### "Server Error" or "Port In Use"
*   The application now includes an auto-fixer. Simply stop the server (Ctrl+C) and run `npm start` again. It will automatically kill any stuck process on port 5001.

### "Mobile Browser shows White Screen"
*   Ensure you are using `http://` and NOT `https://` for Local Access (Option A).
*   Ensure your firewall allows Node.js through (Private Networks).
*   If Local Access fails, use Option B (Cloudflare Tunnel) as a reliable backup.

### "Database Connection Failed"
*   Ensure MySQL Service is running.
*   Check if `server/.env` has the correct password (currently set to `2006`).
