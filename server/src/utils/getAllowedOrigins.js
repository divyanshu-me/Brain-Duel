import { DEFAULT_CLIENT_ORIGIN } from "../constants.js";

// CORS_ORIGIN can hold one URL or many, separated by commas.
// Used by BOTH Express (cors) and Socket.io (cors option).
const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN || DEFAULT_CLIENT_ORIGIN;
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

export { getAllowedOrigins };
