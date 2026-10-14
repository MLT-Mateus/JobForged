import { createRemoteJWKSet, jwtVerify } from "jose";
import { READ_SCOPE } from "./config.mjs";

export class AccessDenied extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function createVerifier(config, keySet = createRemoteJWKSet(new URL(config.jwksUrl), {
  timeoutDuration: 5000, cooldownDuration: 30000, cacheMaxAge: 600000,
})) {
  return async (authorization) => {
    if (typeof authorization !== "string" || !/^Bearer [A-Za-z0-9._~-]{1,8192}$/.test(authorization)) throw new AccessDenied(401, "invalid_token");
    let payload;
    try {
      ({ payload } = await jwtVerify(authorization.slice(7), keySet, {
        issuer: config.issuer, audience: config.resource,
        algorithms: ["RS256", "ES256"], requiredClaims: ["sub", "exp", "iat"], clockTolerance: 5,
      }));
    } catch { throw new AccessDenied(401, "invalid_token"); }
    const now = Math.floor(Date.now() / 1000);
    if (payload.typ && payload.typ !== "Bearer") throw new AccessDenied(401, "invalid_token");
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)
      || payload.iat > now + 5 || payload.exp <= payload.iat || payload.exp - payload.iat > 3600) throw new AccessDenied(401, "invalid_token");
    if (!config.subjects.has(payload.sub) || !config.clients.has(payload.azp ?? payload.client_id)) throw new AccessDenied(403, "access_denied");
    const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/) : Array.isArray(payload.scp) ? payload.scp : [];
    if (!scopes.includes(READ_SCOPE)) throw new AccessDenied(403, "insufficient_scope");
    return { scopes: [READ_SCOPE] };
  };
}
