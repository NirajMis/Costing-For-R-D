const axios = require("axios");
const https = require("https");

// Thin client for SAP Business One Service Layer (REST/OData).
// Handles login + session-cookie renewal; every other module talks to
// SAP B1 only through client.get(path, params) so there's exactly one
// place that knows about sessions, retries, paging, and TLS settings.
class SapB1Client {
  constructor({ baseUrl, companyDB, username, password, rejectUnauthorized = true, pageSize = 500, timeoutMs = 60000 }) {
    if (!baseUrl || !companyDB || !username || !password) {
      throw new Error("SapB1Client requires baseUrl, companyDB, username, and password");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.companyDB = companyDB;
    this.username = username;
    this.password = password;
    this.pageSize = pageSize;
    this.sessionCookie = null;
    this.sessionExpiresAt = 0;
    this.loginPromise = null;
    this.http = axios.create({
      httpsAgent: new https.Agent({ rejectUnauthorized }),
      timeout: timeoutMs,
    });
  }

  // Concurrent callers (the routes fire several queries with Promise.all)
  // share one in-flight login instead of each opening its own B1 session.
  login() {
    if (!this.loginPromise) {
      this.loginPromise = this._doLogin().finally(() => {
        this.loginPromise = null;
      });
    }
    return this.loginPromise;
  }

  async _doLogin() {
    let res;
    try {
      res = await this.http.post(`${this.baseUrl}/Login`, {
        CompanyDB: this.companyDB,
        UserName: this.username,
        Password: this.password,
      });
    } catch (err) {
      throw wrapError(err, "SAP B1 login failed");
    }
    const setCookie = res.headers["set-cookie"] || [];
    if (!setCookie.length) throw new Error("SAP B1 login succeeded but returned no session cookie");
    // Keeps B1SESSION and, behind a load balancer, ROUTEID
    this.sessionCookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    // Service Layer reports its idle timeout in minutes (default 30) —
    // refresh a few minutes early so a long fetch never straddles expiry
    const timeoutMin = Number(res.data && res.data.SessionTimeout) || 30;
    this.sessionExpiresAt = Date.now() + Math.max(1, timeoutMin - 5) * 60 * 1000;
    return { sessionId: res.data && res.data.SessionId, version: res.data && res.data.Version, sessionTimeout: timeoutMin };
  }

  async ensureSession() {
    if (!this.sessionCookie || Date.now() > this.sessionExpiresAt) {
      await this.login();
    }
  }

  // path like "/Items", params like { $select: "ItemCode,ItemName", $filter: "..." }
  async get(path, params) {
    await this.ensureSession();
    const doRequest = () =>
      this.http.get(`${this.baseUrl}${path}`, {
        params,
        headers: { Cookie: this.sessionCookie, Prefer: `odata.maxpagesize=${this.pageSize}` },
      });
    try {
      const res = await doRequest();
      return res.data;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        this.sessionCookie = null;
        await this.login();
        try {
          const res = await doRequest();
          return res.data;
        } catch (retryErr) {
          throw wrapError(retryErr, `SAP B1 GET ${path} failed`);
        }
      }
      throw wrapError(err, `SAP B1 GET ${path} failed`);
    }
  }

  // Follows Service Layer's @odata.nextLink paging until every page is collected.
  async getAllPages(path, params) {
    let out = [];
    let nextPath = path;
    let nextParams = params;
    while (nextPath) {
      const data = await this.get(nextPath, nextParams);
      out = out.concat(data.value || []);
      const nextLink = data["odata.nextLink"] || data["@odata.nextLink"];
      if (!nextLink) break;
      // nextLink is relative to the service root, e.g. "Items?$skip=20" —
      // or, on some versions, an absolute path like "/b1s/v1/Items?$skip=20"
      const rootPath = new URL(this.baseUrl).pathname.replace(/\/$/, "");
      let rel = nextLink.replace(/^https?:\/\/[^/]+/, "");
      if (rootPath && rel.startsWith(rootPath + "/")) rel = rel.slice(rootPath.length);
      nextPath = "/" + rel.replace(/^\/+/, "");
      nextParams = undefined; // params are already encoded into nextLink
    }
    return out;
  }

  async logout() {
    if (!this.sessionCookie) return;
    try {
      await this.http.post(`${this.baseUrl}/Logout`, {}, { headers: { Cookie: this.sessionCookie } });
    } catch (e) {
      // best-effort — don't let logout failure surface as an app error
    }
    this.sessionCookie = null;
    this.sessionExpiresAt = 0;
  }
}

// Turns an axios error into one readable message, surfacing Service
// Layer's own error text (e.g. "Invalid session", "Property 'U_X' is
// invalid") instead of a bare "Request failed with status code 400".
function wrapError(err, prefix) {
  let detail = err.message;
  const data = err.response && err.response.data;
  const slMsg = data && data.error && (data.error.message?.value || data.error.message);
  if (slMsg) detail = `${typeof slMsg === "string" ? slMsg : JSON.stringify(slMsg)} (HTTP ${err.response.status})`;
  else if (err.code) detail = `${err.code}: ${err.message}`;
  const wrapped = new Error(`${prefix}: ${detail}`);
  wrapped.sapStatus = err.response ? err.response.status : undefined;
  return wrapped;
}

module.exports = SapB1Client;
