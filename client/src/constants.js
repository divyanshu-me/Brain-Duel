// Backend URL. Set VITE_SOCKET_URL in client/.env (local) or in the Vercel dashboard (production).
// Vite only exposes variables that start with VITE_ and reads them at BUILD time.
const rawUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

// remove any trailing slash so "<url>/ttt" never becomes "<url>//ttt"
export const SERVER_URL = rawUrl.replace(/\/+$/, "");

// must match NAMESPACES in server/src/constants.js
export const TTT_NAMESPACE = "/ttt";
export const QUIZ_NAMESPACE = "/quiz";
