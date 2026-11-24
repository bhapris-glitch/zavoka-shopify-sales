# HIOX deployment notes

This deployment layout is for a HIOX VPS or other HIOX plan where you have permission to run a persistent Node.js process and configure Apache as a reverse proxy. I could not verify HIOX's current plan features from this workspace. Confirm Node.js version, SSH/process-manager access, Apache proxy-module access, outbound HTTPS access, and firewall rules with HIOX before choosing a plan. Shared hosting may not provide the controls this setup needs.

## Layout

```text
HIOX VPS
├── public_html/                 # Static website document root
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── ...                      # Other public HTML and assets
├── apps/zavoka/backend/         # Node app; keep outside public_html
│   ├── server.js
│   ├── firestore-db.js
│   └── package.json
└── protected-secrets/           # Not web-accessible; restrict filesystem access
    └── firebase-service-account.json

Apache: public_html serves the site; /api/* is proxied to 127.0.0.1:8080.
Database: Google Cloud Firestore, accessed remotely by the Node backend.
```

Keep the repository's `backend/` directory together when deploying: `server.js` imports `firestore-db.js`. Do not put the backend, `.env`, service-account credentials, or database credentials inside `public_html`. Do not upload `node_modules`; install the dependencies on the server from `backend/package.json` using the hosting provider's supported Node workflow.

## Frontend and API routing

1. Upload the root-level website files and the `css/` and `js/` folders into the domain's document root (`public_html` in the example). Preserve the folder structure and use HTTPS.
2. Configure Apache to serve the static site and proxy `/api/` to the Node process on `127.0.0.1:8080`. The example `apache-vhost.conf.example` is a starting point for VPS administrators with Apache virtual-host access and the required proxy modules. Replace every placeholder and use the certificate paths supplied by your TLS setup.
3. Run the Node service under a dedicated, unprivileged account with a process manager or service manager so it restarts after a reboot. Bind it to localhost, set `PORT=8080`, and do not expose port 8080 publicly.
4. Set `FRONTEND_URL` to the exact public HTTPS origin (for example, `https://example.com`). Keep Shopify's OAuth callback and Stripe webhook URLs on that same public origin at `/api/shopify/callback` and `/api/stripe/webhook`.
5. Check `https://example.com/api/health`; then verify Shopify OAuth, Stripe webhooks, email delivery, and scheduled tasks in the live environment.

If your HIOX plan does not allow Apache proxy configuration, ask HIOX for its supported Node application and reverse-proxy method. Do not make the backend public by simply exposing its port as a substitute for a properly configured HTTPS route.

## Backend and database

The current application uses Firestore through `firebase-admin` and `backend/firestore-db.js`. It does not use a local MySQL database, and adding a MySQL database in the HIOX control panel will not make this backend use it. Keep Firestore enabled in the Firebase project and allow outbound HTTPS from the backend host.

The backend initializes Firebase with Application Default Credentials. On a self-managed VPS, provide a Firebase service-account JSON file outside the web root, restrict its permissions to the backend service account, and set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path in the service's environment. Keep `FIREBASE_PROJECT_ID` and the other values in `backend/.env.example` in the private service environment; never commit real credentials or expose them through a web-accessible `.env` file. Use a dedicated Firebase service account with only the required database access.

The API also needs its Stripe, Shopify, email, and (if enabled) AI credentials. Configure real production values in the server environment, not in frontend JavaScript. Confirm that background timers remain active under your process manager: this backend performs cart recovery, trial notifications, and product synchronization in-process.

## Apache VPS example

`apache-vhost.conf.example` is a template, not a HIOX-provided configuration. Apache proxy modules and virtual-host changes may require VPS/root access and may be unavailable on shared hosting. Have the server administrator review it before enabling it. The existing `firebase.json` is for Firebase Hosting and Cloud Run; this HIOX example does not use that rewrite configuration.
