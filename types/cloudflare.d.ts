/// <reference types="@cloudflare/workers-types" />

// Describes the optional current Sites binding; does not activate a database.
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}
