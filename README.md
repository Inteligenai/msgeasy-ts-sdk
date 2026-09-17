# msgeasy

The official Node.js and TypeScript client for the MsgEasy WhatsApp API.

Send WhatsApp OTPs, messages and media from your backend, with retries, idempotency keys and typed
errors handled for you.

---

## Install

```bash
npm install github:Inteligenai/msgeasy-ts-sdk#v0.1.0
```

Pin to a released tag, not `#main` — see [Inteligenai/msgeasy-ts-sdk](https://github.com/Inteligenai/msgeasy-ts-sdk) for the latest.

Inside this workspace, depend on it directly instead:

```json
{ "dependencies": { "msgeasy": "workspace:*" } }
```

Node 18 or newer — the client uses the built-in `fetch`, `Blob` and `FormData`. Developed and
tested on Node 22. The package ships both ESM and CommonJS.

```ts
import { MsgEasy } from "msgeasy";   // ESM
const { MsgEasy } = require("msgeasy");  // CommonJS
```

---

## Send your first OTP

You need an API key from **Settings → Console** in the dashboard. Use a `msg_test_` key while you
build — it runs the whole flow without sending a real WhatsApp message or charging anything.

```ts
import { MsgEasy } from "msgeasy";

const msg = new MsgEasy(process.env.MSGEASY_API_KEY);

const verification = await msg.verify.start({ phone: "+919812345678" });
// { verificationId: "vrf_...", status: "pending", expiresAt: Date, channel: "whatsapp" }

const result = await msg.verify.check({
  verificationId: verification.verificationId,
  code: "123456",
});
// { status: "approved" }
```

A test key returns the code on the `start` response as `code`, so you can complete the flow without
a phone. A live key never does.

**You do not need an approved template to do this.** That approval is usually the thing you are
waiting on Meta for, and a test key skips it.

---

## Client

```ts
const msg = new MsgEasy(apiKey, {
  baseUrl: "https://api.msgeasy.com",  // default
  timeoutMs: 30_000,                   // default
});
```

The key is required and comes first. Everything else is optional.

Every method takes a final optional `{ timeoutMs }` that replaces the client's for that one call —
useful when a single upload or send needs longer than the rest:

```ts
await msg.media.upload(file, "invoice.pdf", { timeoutMs: 120_000 });
```

A retry starts the clock again, so this is the ceiling per attempt, not for the call as a whole.

### Seeing what went over the wire

The methods return the parsed body and nothing else. `onResponse` is called once per attempt,
successful or not, with everything the return value cannot give you — the request id of a
*successful* call, the idempotency key that was sent, both bodies as they were, and whether a retry
happened at all:

```ts
const msg = new MsgEasy(apiKey, {
  onResponse: (e) => log.info(
    { method: e.method, url: e.url, status: e.status, requestId: e.requestId,
      attempt: e.attempt, elapsedMs: e.elapsedMs },
    "msgeasy",
  ),
});
```

| Field | |
|---|---|
| `method`, `url` | The request, `/v1` included. |
| `status` | `null` when nothing came back — see `transportError`. |
| `requestBody`, `responseBody` | Parsed JSON, or the raw text when it would not parse. A media upload reports the file's name, type and size rather than its bytes. |
| `requestId` | From `X-Request-Id`. The only way to get it on a success. |
| `idempotencyKey` | The key actually sent. `null` on reads. |
| `rateLimit`, `retryAfterSeconds` | As that response reported them. |
| `elapsedMs`, `attempt` | `attempt` is 1-based, so a retry is a second event. |
| `transportError` | Why nothing came back, when nothing did. |

Two things worth knowing. An exception thrown by your handler is swallowed — a logging hook must
not be able to fail a send. And registering one makes us read each response body a second time;
leave it off and that costs nothing.

---

## Verify

Sends a one-time code over WhatsApp and checks it.

```ts
await msg.verify.start({
  phone: "+919812345678",   // E.164, required
  channel: "whatsapp",      // optional
  ttlSeconds: 300,          // optional — how long the code is valid
  codeLength: 6,            // optional
});
```

Returns `verificationId`, `status`, `expiresAt`, `channel`, and — on a test key — `code` and
`testMode: true`.

```ts
await msg.verify.check({ verificationId, code });
```

Returns `status` and, when the code was wrong, `remainingAttempts`.

`status` is one of `pending`, `approved`, `invalid`, `expired` or `max_attempts`. A wrong code is
**not** an error — it comes back as `invalid` with a `200`, because the request itself was fine.

---

## Messages

```ts
// Free-form text. Only works inside the 24-hour window — see below.
await msg.messages.send({ to: "+919812345678", type: "text", text: "Your order shipped." });

// A template. Works any time, but Meta must have approved it.
await msg.messages.send({
  to: "+919812345678",
  type: "template",
  templateId: "tpl_...",
  variables: { name: "Asha", order: "A-1029" },
});

// Media you uploaded first.
await msg.messages.send({
  to: "+919812345678",
  type: "media",
  mediaId: "med_...",
  caption: "Your invoice",
});
```

Returns `id`, `status`, `to`, `type`, `whatsappMessageId`, `error`, `createdAt`, and `testMode` on a
test key.

```ts
await msg.messages.get("msg_...");
```

**The 24-hour window.** WhatsApp only lets you send free-form text within 24 hours of the recipient
last messaging you. Outside it, a `text` send fails with `window_expired` and you must send a
template instead. A test key ignores the window, so you can develop against a number that has never
messaged you.

---

## Media

```ts
const file = new Blob([bytes], { type: "image/jpeg" });
const media = await msg.media.upload(file, "invoice.jpg");
// { id: "med_...", filename, mimeType, sizeBytes, createdAt }
```

Then send it with `type: "media"` and `mediaId: media.id`.

A test key uploads for real — the file is stored and pushed to Meta, and it counts against your
plan's media allowance. Only sending is simulated.

**Uploads are idempotent.** The SDK sends an `Idempotency-Key` and reuses it on retry, and the API
hashes the file itself — so a retried upload replays the first result rather than storing a second
copy. The file still travels twice; only the storage and the Meta call are saved.

---

## Templates

```ts
await msg.templates.list({ limit: 20 });    // { data: [...], hasMore: boolean }
await msg.templates.get("tpl_...");
await msg.templates.create({ name, category: "UTILITY", language: "en_US", body });
await msg.templates.validate({ name, category: "UTILITY", language: "en_US", body });
await msg.templates.update("tpl_...", { body: "..." });
```

**Paging is handled for you.** `listAll` walks every page and yields one template at a time — you
never touch a cursor.

```ts
for await (const template of msg.templates.listAll({ status: "approved" })) {
  console.log(template.name);
}
```

Both take the same filters:

| Filter | |
|---|---|
| `limit` | 1-100, default 20 |
| `status` | `pending`, `processing`, `approved` or `rejected` |
| `updatedAfter` | A `Date` or an ISO string. Only templates changed since — this is what makes polling cheap |
| `startingAfter` | The previous page's last id. `list` only; `listAll` sets it for you |

```ts
// Poll for what Meta decided since your last check.
for await (const template of msg.templates.listAll({ updatedAfter: lastCheckedAt })) {
  await recordStatus(template.id, template.status, template.rejectionReason);
}
```

A template's `status` is `pending`, `processing`, `approved` or `rejected`. Only `approved`
templates send. A rejected one carries `rejectionReason`.

`create` and `update` accept **`UTILITY` only**. Marketing templates exist and you can list and send
them, but they are not creatable through the API.

**A test key cannot create or update a template.** Creating one permanently claims that name in your
WhatsApp account, which a sandbox key must not be able to spend — so it returns
`test_key_not_allowed`.

---

## Errors

Every failure throws something under `MsgEasyError`. Branch on `code`, never on the HTTP status —
two different problems can share a status.

```ts
import { MsgEasy, APIError, ErrorCode } from "msgeasy";

try {
  await msg.messages.send({ to, type: "text", text });
} catch (error) {
  if (error instanceof APIError) {
    switch (error.code) {
      case ErrorCode.WindowExpired:
        return sendTemplateInstead();
      case ErrorCode.KeyLimitReached:
        return alertOps(error.details);   // { limit: "monthly", used, cap, resetsAt }
      default:
        throw error;
    }
  }
  throw error;
}
```

Every `APIError` carries:

| Field | What it is |
|---|---|
| `code` | The machine-readable reason. This is what you branch on. |
| `status` | The HTTP status. |
| `message` | A human-readable explanation. |
| `requestId` | From `X-Request-Id`. **Quote this in any support ticket** — it is the key into our request log. |
| `details` | Extra context, varies by code. |
| `retryAfterSeconds` | When the API told us how long to wait. |
| `rateLimit` | The rate-limit state on that response, or `null`. |

### The shape of the tree

`catch (e) { if (e instanceof MsgEasyError) }` catches everything this SDK throws. Beneath it:

```
MsgEasyError                base; catches all of it
  APIError                  a refusal we described. Has `code`.
    AuthenticationError       invalid_api_key
    PermissionDeniedError     insufficient_scope
    RateLimitError            rate_limited
    QuotaError                quota_exceeded, key_limit_reached, spend_cap_reached
    SetupRequiredError        verify_not_configured, no_sender, whatsapp_not_connected
    NotFoundError             not_found
    InvalidRequestError       invalid_request, unsupported_media_type, media_too_large
    IdempotencyError          idempotency_conflict
    WindowExpiredError        window_expired
    TemplateError             template_not_approved, template_name_taken, …
    MetaError                 meta_error
    ServiceUnavailableError   service_unavailable
    TestKeyError              test_key_not_allowed
  APIConnectionError        nothing came back: DNS, reset connection, timeout
  BadEnvelopeError          a non-2xx whose body was not ours — usually a proxy
  ValidationError           refused before anything was sent
```

The subclasses are a convenience; `code` is still the thing to branch on, and a code we add after
your release arrives as a plain `APIError` rather than throwing. `BadEnvelopeError` has no `code`
at all — you should never be handed an absence where a code belongs.

### The codes you will actually hit

| Code | Status | What to do |
|---|---|---|
| `invalid_api_key` | 401 | The key is wrong, expired or revoked. |
| `insufficient_scope` | 403 | Valid key, but it lacks permission for this call. |
| `rate_limited` | 429 | Too fast. **The SDK retries this for you.** |
| `key_limit_reached` | 403 | This key is out of monthly allowance. Raise the key's limit; waiting will not help. |
| `quota_exceeded` | 403 | Your plan is out of allowance. Upgrade or free something up. |
| `spend_cap_reached` | 403 | The key hit its own spend ceiling for the cycle. |
| `window_expired` | 409 | Outside the 24-hour window. Send a template. |
| `template_not_approved` | 409 | Meta has not approved that template yet. |
| `no_sender` | 409 | No active sending number. Fix it in the console. |
| `verify_not_configured` | 409 | No Verify template or sender set up yet. |
| `idempotency_conflict` | 409 | The same key was reused for a different body, or the first request is still running. |
| `not_found` | 404 | The id does not exist, or is not yours. |
| `invalid_request` | 400 | The request is malformed; `message` says how. |
| `media_too_large` | 400 | Over WhatsApp's size limit for that file type. |
| `unsupported_media_type` | 400 | WhatsApp will not carry that file type. |
| `test_key_not_allowed` | 403 | That write reaches Meta, so a test key cannot do it. |
| `meta_error` | 502 | Meta rejected the operation; `details` has their code and trace id. |
| `service_unavailable` | 503 | Briefly unavailable. **The SDK retries this for you.** |
| `whatsapp_not_connected` | 400 | This account has no WhatsApp connection. Connect it in the dashboard; retrying will not help. |
| `template_name_taken` | 409 | That name is already claimed in your WhatsApp account. Meta reserves a deleted name for about 30 days. |
| `template_not_editable` | 409 | Only a never-submitted or rejected template can be edited. Approved and in-review ones are frozen by Meta. |
| `template_category_not_allowed` | 409 | The template is `MARKETING`, which cannot be sent from `/v1`. |

---

## Retries

Three attempts total, with 0.5s then 1s backoff. When the API sends a `Retry-After`, that wins.

**Retried:** `rate_limited`, `service_unavailable`, network faults, and an `idempotency_conflict`
where the first request is still in flight.

**Not retried:** anything you have to fix yourself — a bad request, a missing scope, an exhausted
quota. And never `meta_error` on a write: Meta may already have taken the message, so retrying could
send it twice.

---

## Idempotency

Every write gets an `Idempotency-Key` automatically, and **the same key is reused across retries of
that call**. If a retry lands after the original succeeded, the API replays the first result instead
of sending a second message.

You do not have to do anything for this — within one call.

Across calls is different. Our key protects the retries inside a single `send`; it is gone the
moment that call returns. If your process can die between sending and recording the result, hold
your own key and pass it, so the retry replays the first send rather than sending a second message:

```ts
const key = randomUUID();
await db.recordPending({ key, to });
await msg.messages.send({ to, type: "text", text }, { idempotencyKey: key });
```

Available on every write. Max 255 characters, and not empty — either throws `ValidationError`
before the request goes out, rather than quietly sending without one.

---

## Rate limits

When your key has a per-minute limit, the API returns its state on every response and the SDK
records it:

```ts
await msg.templates.list();
msg.rateLimit;  // { limit: 100, remaining: 99, resetSeconds: 1 }
```

`msg.rateLimit` is `null` on a key with no limit set — absent or complete, never partly filled in,
because the API sends the three headers together or not at all. It is also on any `APIError`, so you
can see the state at the moment you were refused.

It is whatever the most recent response reported, whichever call that was — a pacing signal, not a
per-call fact. With several calls in flight, read `rateLimit` off the `onResponse` event instead.

---

## Webhooks

We POST events to your endpoint and sign every delivery. Verify the signature before trusting it.

```ts
import { verifyWebhookSignature } from "msgeasy";

app.post("/webhooks/msgeasy", express.raw({ type: "application/json" }), (req, res) => {
  const result = verifyWebhookSignature(
    req.body.toString("utf8"),
    req.headers,
    process.env.MSGEASY_WEBHOOK_SECRET,
  );
  if (!result.ok) {
    log.warn({ reason: result.reason }, "refused a delivery");
    return res.sendStatus(400);
  }

  const event = JSON.parse(req.body.toString("utf8"));
  // handle event.type
  res.sendStatus(200);
});
```

**Pass the raw body**, not a parsed-and-re-serialised object. Re-serialising changes the bytes and
the signature will not match. In Express that means `express.raw`, before `express.json`.

The signature covers a timestamp, so a captured delivery cannot be replayed later. Anything older
than 5 minutes is rejected.

**Pass the whole headers object**, not the extracted value. The lookup is case-insensitive and we
do it for you — which matters, because Node lower-cases inbound header names, so looking the header
up yourself under its canonical casing silently finds nothing and refuses every delivery.

It never throws. A delivery that omits the header, or sends it twice — as a list value or
comma-joined into one string — comes back refused like any other, so one `if (!result.ok)` covers
every case. `result.reason` says which:
`no_secret_configured`, `missing_header`, `malformed_header`, `stale_timestamp` or `bad_signature`
— worth logging, since a clock-skew problem and a wrong secret need different fixes.

Events: `message.sent`, `message.delivered`, `message.read`, `message.failed`, `inbound.received`,
`verify.approved`, `verify.delivered`, `verify.failed`, `template.status_changed`,
`usage.threshold`.

Register your endpoint in the console — there is no API for it.

---

## Test mode

A `msg_test_` key runs the same code as a live key, with four things skipped.

| | Test key | Live key |
|---|---|---|
| Verify needs an approved template | no | yes |
| Sends reach WhatsApp | no | yes |
| The 24-hour window applies | no | yes |
| Counts against your message quota | no | yes |
| Stores a contact | no | yes |
| Returns the OTP code in the response | yes | no |
| Can create templates | no | yes |
| Media upload really uploads | yes | yes |

Responses carry `testMode: true`. Going live is swapping the key — no code changes.

---

## TypeScript

Every request and response type is exported and generated from the API's own OpenAPI document, so
they cannot drift from the live API.

```ts
import type { SendMessageInput, Verification } from "msgeasy";
```

---

## Development

```bash
pnpm --filter msgeasy generate    # regenerate the core from the OpenAPI document
pnpm --filter msgeasy build       # dist/, both module formats
pnpm --filter msgeasy test        # the conformance suite
```

`src/generated/` is generated output — never edit it. The hand-written layer is `client.ts`,
`errors.ts`, `http.ts` and `webhooks.ts`.
