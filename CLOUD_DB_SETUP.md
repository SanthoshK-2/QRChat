# How to Connect Aiven Cloud Database to Render

You are currently on the Aiven **Services** list. Here is exactly what to do next.

---

### Phase 1: Get the Database URL from Aiven

1.  **Click on the Service Name**:
    *   In your Aiven dashboard (the screen in your image), click specifically on the blue text **`mysql-1bc4faef`**.
    *   *Note: If it says "Rebuilding" or "Powering up", wait 1-2 minutes until it says "Running".*

2.  **Find Connection Info**:
    *   Once inside the service page, look for a section titled **Connection information** (usually on the top left or center).
    *   Look for the field labeled **Service URI**.
    *   It will look like this (hidden with dots): `mysql://avnadmin:password@host:port/defaultdb?ssl-mode=REQUIRED`
    *   Click the **Copy to clipboard** icon (📄) next to it.

---

### Phase 2: Add to Render

1.  Open your **Render Dashboard** in a new tab.
2.  Click on your web service: **`QRChat-1`** (or `qrchat-backend`).
3.  On the left sidebar menu, click **Environment**.
4.  Click the button **Add Environment Variable**.
5.  Enter these details:
    *   **Key**: `DATABASE_URL`
    *   **Value**: *[Paste the Service URI you copied from Aiven here]*
6.  **Important Cleanup**:
    *   Look for other variables named `DB_HOST`, `DB_USER`, `DB_PASSWORD`, or `DB_NAME`.
    *   If they exist, delete them (click the trash icon 🗑️) or clear their values. This ensures Render uses the new `DATABASE_URL`.
7.  Click **Save Changes** at the bottom.

---

### Phase 3: Final Sync (Don't skip!)

Render will automatically restart your app. Once it's running (about 2 minutes):

1.  Open your local VS Code terminal.
2.  Run this command to push your local data to the new Cloud DB:
    ```bash
    npm run sync
    ```
3.  Go to your website and refresh. Your data is now permanently safe!

---

### Phase 4: How to View Real-Time Data (MySQL Workbench)

Since Aiven is a cloud provider, the best way to view your live data is to connect your local **MySQL Workbench** to it.

1.  **Get Credentials from Aiven**:
    *   Go back to your Aiven Dashboard -> Click your service (**mysql-1bc4faef**).
    *   Find the **Connection Information** section.
    *   Note down: **Host**, **Port**, **User**, and **Password**.

2.  **Open MySQL Workbench** (on your computer):
    *   Click the **(+)** icon next to "MySQL Connections".

3.  **Enter Details**:
    *   **Connection Name**: `Aiven Cloud DB`
    *   **Hostname**: Paste the **Host** from Aiven.
    *   **Port**: Paste the **Port** (usually roughly 5 digits, e.g., 24628).
    *   **Username**: `avnadmin` (or whatever Aiven shows).
    *   **Password**: Click **Store in Vault...** and paste the password.

4.  **SSL Settings (Important)**:
    *   Click the **SSL** tab (next to Parameters).
    *   Set **Use SSL** to: `Require`.

5.  **Test & Connect**:
    *   Click **Test Connection**. It should say "Successfully made the MySQL connection".
    *   Click **OK**.
    *   Open the connection. You can now see your live tables (`Users`, `Messages`, etc.) under the `defaultdb` schema on the left.
