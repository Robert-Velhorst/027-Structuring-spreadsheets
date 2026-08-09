# HAI connector

Sheet Shaper exposes a bearer-authenticated OpenAPI surface under `/hai/v1`.
The connector is read-and-preview only by default. It can list documents, read a
bounded spreadsheet window, analyze quality, and create an exact preview.

To connect HAI:

1. Start Sheet Shaper with `scripts/windows/start-ngrok.ps1`.
2. Replace `REPLACE_WITH_NGROK_HOST` in a private copy of `connector.json` with
   the printed HTTPS endpoint. Do not commit a live endpoint or token.
3. Give HAI the token copied to the Windows clipboard by the launcher through
   its secure secret configuration as `SHEET_SHAPER_TOKEN`.
4. Fetch `/hai/v1/manifest` and `/openapi.json`, then verify
   `readOnlyByDefault` is `true` before enabling the connector.

Mutation endpoints are omitted from the advertised capability set until the
operator explicitly sets `SS_HAI_MUTATIONS_ENABLED=true`. Even then, apply
requires an unexpired preview token, explicit acknowledgement, an idempotency
key, a durable hashed backup, and readback validation. Restore is subject to
the same opt-in and stale-version protection.
