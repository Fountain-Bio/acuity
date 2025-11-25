# Acuity Scheduling Appointments & Availability API Notes

All endpoints live under `https://acuityscheduling.com/api/v1` and require HTTP Basic Auth where the username is the Acuity user ID and the password is the API key. Include `calendarID` whenever you need to target a specific calendar; omit it to let Acuity auto-assign based on standard routing rules.

## Error Handling

All endpoints return JSON error envelopes shaped like:

```json
{
  "status_code": 400,
  "error": "bad_request",
  "message": "Expected a JSON object."
}
```

Core status codes to plan around:

- `400 Bad Request` – malformed JSON, invalid IDs or timestamps, or other validation issues. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 Unauthorized` – Basic Auth missing/incorrect. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `403 Forbidden` – authenticated but attempting to touch another user’s resource. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `404 Not Found` – endpoint or resource ID not recognized. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `405 Method Not Allowed` – wrong HTTP verb for the path. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `429 Too Many Requests` – rate limit of 10 req/s (20 concurrent connections) exceeded; back off and retry. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `500 Internal Server Error` – retry with backoff; contact Acuity if persistent. (Source: https://developers.acuityscheduling.com/reference/api-errors)

Unless a path documents additional behaviors, assume these statuses plus descriptive `error`/`message` pairs.

SDK note: configuring `requestTimeoutMs` on the `Acuity` client enforces a per-request timeout. When Acuity does not respond before that threshold, the client throws `AcuityTimeoutError` (status `0`, code `timeout`) so you can differentiate timeouts from API or transport failures.

## Appointments

### `GET /appointments`

Returns upcoming appointments for the authenticated account.

| Query | Type | Description |
| --- | --- | --- |
| `calendarID` | integer | Restrict to a specific calendar. |
| `categoryID` | integer | Filter by appointment category. |
| `appointmentTypeID` | integer | Filter by appointment type. |
| `clientID` | integer | Filter by client. |
| `max` | integer | Limit total results. |
| `minDate` / `maxDate` | date | Bound by date. |
| `minTime` / `maxTime` | datetime | Bound by timestamp. |
| `canceled` | boolean | `true` => only canceled appointments. |
| `showall` | boolean | `true` => canceled and scheduled. |
| `direction` | asc/desc | Sort order (defaults to `asc`). |
| `excludeForms` | boolean | Drop form answers. |
| `timezone` | string | Force timezone on returned fields. |
| `page` / `limit` | integer | Pagination (limit default 20, max 200). |

Canceled appointment payloads include the `noShow` flag that differentiates admin-marked no-shows vs. standard cancellations.

#### Response

Returns an array of appointment objects. Each appointment includes:

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Appointment identifier. |
| `firstName` / `lastName` | string | Client name captured at booking. |
| `email` / `phone` | string | Contact info echoed from the client form. |
| `date` / `endDate` | string | Human-readable dates (e.g., `September 5, 2014`). |
| `time` / `endTime` | ISO 8601 string | Start/end timestamps localized to the calendar timezone. |
| `type` | string | Appointment type name. |
| `appointmentTypeID` | integer | Numeric appointment type id. |
| `calendar` / `calendarID` | string / integer | Name and id of the calendar that owns the appointment. |
| `calendarTimeZone` | string | IANA timezone of the selected calendar. |
| `price` / `paid` | string | Price quoted and total amount paid. |
| `notes` | string | Client-entered notes. |
| `forms` | array | Intake form answers. Each object contains `id`, `fieldID`, `name`, `value`, `isMultiple`, and `sortOrder`. |
| `noShow` | boolean | Present on canceled payloads to differentiate no-shows from standard cancellations. |

`GET /appointments` supports pagination, so expect arrays even when a single appointment matches the filters.

#### Errors

- `400 bad_request` when filters fail validation (e.g., malformed ISO date or mutually exclusive params). (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 unauthorized` if the Basic Auth pair is missing or wrong. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `403 forbidden` when trying to read another user’s calendars/types. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `404 not_found` if the path is typoed; `GET /appointments` itself does not emit 404 for empty lists (returns `[]`). (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `429 too_many_requests` once the 10 req/s or 20 concurrent connection limits are exceeded. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `GET /appointments/{id}`

Retrieve a single appointment.

- Path parameter: `id` (integer)
- Optional query: `pastFormAnswers=true` to include archived form answers

#### Response

Returns a single appointment object with the same fields described under `GET /appointments`.

#### Errors

- `400 bad_request` for invalid `id` values that cannot be coerced into integers. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 unauthorized` when Basic Auth fails. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `403 forbidden` if the appointment belongs to a different user account. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `404 appointment_not_found` when the `id` does not exist or was deleted. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `POST /appointments`

Create an appointment as a client booking. Supported JSON body keys:

| Field | Required | Description |
| --- | --- | --- |
| `datetime` | ✔ | ISO datetime in the business timezone. |
| `appointmentTypeID` | ✔ | Appointment type to schedule. |
| `firstName` / `lastName` | ✔ | Client name. |
| `email` | ✔ | Client email. |
| `phone` | ✔ | Client phone number (API rejects payloads without it). |
| `calendarID` | ✖ | Force placement on a specific calendar. |
| `notes` | ✖ | Client notes. |
| `fields` | ✖ | Array of `{fieldID, value}` form answers. |
| `certificate` / `packageID` / `coupon` | ✖ | Redemption artifacts. |
| `formID` | ✖ | Explicit intake form to attach. |
| `smsOptIn` | ✖ | Whether the client opted into SMS reminders. |

When double-booking protection blocks the slot, the API returns HTTP 422 with `time_unavailable`. For admin-side scheduling that can override certain restrictions, append `?admin=true` to the endpoint. Append `?noEmail=true` whenever you need to suppress the confirmation email/SMS blast for this booking while still creating the appointment.

#### Response

Returns the created appointment object, identical in shape to `GET /appointments`.

#### Errors

- `400 bad_request` – malformed JSON or body not an object. (Source: https://developers.acuityscheduling.com/reference/post-appointments)
- `401 unauthorized` – missing/invalid Basic Auth header. (Source: https://developers.acuityscheduling.com/reference/post-appointments)
- `403 forbidden` – only the admin user can create appointments via the API. (Source: https://developers.acuityscheduling.com/reference/post-appointments)
- `404 not_found` – typoed endpoint. (Source: https://developers.acuityscheduling.com/reference/post-appointments)
- `409 conflict` – slot already booked, returns `{"error":"double_booked"}`. (Source: https://developers.acuityscheduling.com/reference/post-appointments)
- `422 invalid_data` – validation failures such as `time_unavailable` when the slot disappeared between availability lookup and booking. (Source: https://developers.acuityscheduling.com/reference/post-appointments)

### `PUT /appointments/{id}`

Update mutable fields for an existing appointment.

| Field | Description |
| --- | --- |
| `firstName`, `lastName`, `email`, `phone`, `notes` | Update client and note fields. |
| `fields` | Replace form answers array. |
| `calendarID` | Move to a new calendar (same start time). |

#### Response

Returns the updated appointment object.

#### Errors

- `400 bad_request` – invalid field names or payload types (e.g., `calendarID` not numeric). (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 unauthorized` – Basic Auth failure. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `403 forbidden` – attempting to update another user’s appointment. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `404 not_found` – unknown appointment ID. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `429 too_many_requests` – throttled; retry with backoff. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `PUT /appointments/{id}/cancel`

Cancel or mark a no-show.

| Field | Description |
| --- | --- |
| `noShow` | Boolean to mark as no-show. |
| `cancelNote` | Internal note explaining why it was canceled. |

**Query parameters.** `admin=true` forces the cancel to run with admin privileges (same semantics as other endpoints), and `noEmail=true` skips Acuity’s cancellation emails/SMS entirely so you can perform internal-only cancellations.

#### Response

Returns the canceled appointment object (same schema) with `canceled=true` and, when applicable, `noShow=true`.

#### Errors

- `401 unauthorized` – missing/invalid Basic Auth header. (Source: https://developers.acuityscheduling.com/reference/put-appointments-id-cancel)
- `404 appointment_not_found` – cancellation ID does not exist. (Source: https://developers.acuityscheduling.com/reference/put-appointments-id-cancel)
- Standard `400/403/429` errors from the API Errors list may also occur when parameters are invalid or cross-account access is attempted. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `PUT /appointments/{id}/reschedule`

Move the appointment to a new time.

| Field | Description |
| --- | --- |
| `datetime` | Required ISO datetime for the new slot. |
| `calendarID` | Optional calendar override. |

**Query parameters.** `admin=true` performs the reschedule with admin privileges, and `noEmail=true` suppresses reschedule notices so you can shuffle a booking without notifying the client (pair this with internal outreach if needed).

#### Response

Returns the rescheduled appointment object reflecting the new `datetime` and `calendarID`.

#### Errors

- `401 unauthorized` – missing/invalid Basic Auth header. (Source: https://developers.acuityscheduling.com/reference/put-appointments-id-reschedule)
- `404 appointment_not_found` – unknown appointment ID. (Source: https://developers.acuityscheduling.com/reference/put-appointments-id-reschedule)
- `422 invalid_data` – new slot is unavailable or fails validation; payload contains `{"error":"invalid_data","message":"time_unavailable"}`. (Source: https://developers.acuityscheduling.com/reference/put-appointments-id-reschedule)
- Standard `400/403/429` errors from the global list apply for malformed requests or forbidden cross-account access. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `GET /appointment-types`

Returns every appointment type configured in the account; there are no query parameters, so a simple `acuity.appointments.types()` call yields the full catalog. (Source: https://developers.acuityscheduling.com/reference/appointment-types)

#### Response

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Unique appointment type ID. |
| `active` | boolean | `false` indicates the type has been deleted or deactivated. |
| `name` | string | Display name of the type. |
| `description` | string | Long-form description (often `null`). |
| `duration` | integer | Length of the appointment in minutes. |
| `price` | string | Price quoted in the account’s currency. |
| `category` | string | Category label. |
| `color` | string | Hex color used in Acuity. |
| `private` | boolean | `true` when the type is only visible to admins/direct links. |
| `type` | string | One of `service`, `class`, or `series`. |
| `classSize` | integer/null | For classes/series, the maximum capacity; `null` for services. |
| `paddingAfter` | integer | Minutes of enforced padding after each booking. |
| `paddingBefore` | integer | Minutes of enforced padding before each booking. |
| `calendarIDs` | integer[] | IDs of calendars that offer the type. |

## Availability

Recommended flow: fetch available dates, fetch times for a date, optionally validate via `check-times`, then call `POST /appointments`.

### `GET /availability/dates`

Returns dates with at least one open slot.

| Query | Required | Description |
| --- | --- | --- |
| `month` | ✔ | Month in `YYYY-MM`. |
| `appointmentTypeID` | ✔ | Appointment type to evaluate. |
| `calendarID` | ✖ | Limit to a calendar. |
| `timezone` | ✖ | Force timezone. |

#### Response

Returns an array of lightweight objects containing only a `date` key (e.g., `{ "date": "2016-02-04" }`). Every entry represents a day within the month that still exposes at least one bookable time.

#### Errors

- `400 bad_request` – missing `month`/`appointmentTypeID` or malformed values. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 unauthorized` – Basic Auth missing/incorrect. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `403 forbidden` – appointment type or calendar belongs to another account. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `404 not_found` – typoed endpoint. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `429 too_many_requests` – back off when rate limits hit. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `GET /availability/times`

Returns precise start times for a date.

| Query | Required | Description |
| --- | --- | --- |
| `date` | ✔ | `YYYY-MM-DD`, must come from `/availability/dates`. |
| `appointmentTypeID` | ✔ | Appointment type. |
| `calendarID` | ✖ | Restrict to a calendar. |
| `timezone` | ✖ | Force timezone for readability. |

Each returned slot object only exposes a `time` field in ISO 8601 format (with the timezone offset baked in). Use `/availability/check-times` when you need metadata such as timezone labels, calendar names, or pricing.

#### Response

Example payload:

```json
[
  { "time": "2016-02-04T13:00:00-0800" },
  { "time": "2016-02-04T14:00:00-0800" },
  { "time": "2016-02-04T15:00:00-0800" }
]
```

#### Errors

- `400 bad_request` – `date` must be `YYYY-MM-DD` and `appointmentTypeID` must be supplied. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 unauthorized` – Basic Auth failure. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `403 forbidden` – appointment type/calendar not owned by the authenticated account. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `429 too_many_requests` – rate limit exceeded. (Source: https://developers.acuityscheduling.com/reference/api-errors)

### `POST /availability/check-times`

Validates a proposed slot and returns canonical slot metadata.

| Field | Required | Description |
| --- | --- | --- |
| `datetime` | ✔ | ISO datetime being checked. |
| `appointmentTypeID` | ✔ | Appointment type. |
| `calendarID` | ✖ | Restrict to calendar. |
| `timezone` | ✖ | Timezone for rendering. |
| `duration` | ✖ | Override duration in minutes. |
| `price` | ✖ | Override price for admin bookings. |

The response echoes normalized `datetime`, `calendarID`, pricing, duration, package/certificate references, and an `available` boolean you can rely on before calling `POST /appointments`.

#### Response

Returns a single slot verification object:

| Field | Type | Description |
| --- | --- | --- |
| `datetime` | ISO 8601 string | Canonical slot start in the business timezone. |
| `timezone` | string | IANA timezone that was evaluated. |
| `appointmentTypeID` | integer | Appointment type validated. |
| `calendarID` | integer | Calendar the slot maps to. |
| `available` | boolean | Whether the slot can be booked. |
| `multipleClientsAllowed` | boolean | True when the slot supports group bookings. |
| `duration` | integer | Duration in minutes that will be reserved. |
| `price` / `deposit` | string | Price the client will see and any required deposit. |
| `calendar` / `appointmentType` | string | Human-readable calendar and appointment type labels. |
| `firstName` / `lastName` / `email` / `phone` | string | Echoes any client details provided for validation (often `null`). |
| `location` | string | Location tied to the appointment type, if any. |
| `certificate` / `package` | object | Applied redemption artifacts; `null` when none supplied. |
| `addons`, `labels`, `forms` | arrays | Detailed metadata to reuse when posting the appointment. |

#### Errors

- `400 bad_request` – missing `datetime`/`appointmentTypeID` or malformed ISO datetimes. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `401 unauthorized` / `403 forbidden` – auth failures or cross-account access. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `404 not_found` – typoed endpoint. (Source: https://developers.acuityscheduling.com/reference/api-errors)
- `422 invalid_data` – slot fails validation; response body keeps HTTP 200 but sets `available:false` with a `message` describing why (e.g., `time_unavailable`). (Source: https://developers.acuityscheduling.com/reference/availability-check-times)
- `429 too_many_requests` – throttle/backoff. (Source: https://developers.acuityscheduling.com/reference/api-errors)

## Calendars

Calendars encapsulate the staff/resource schedule metadata that `calendarID` references across appointments and availability calls.

### `GET /calendars`

Returns every calendar the authenticated user can access. There are no query parameters—just send the standard Basic Auth headers and receive the full list for local caching. (Source: https://developers.acuityscheduling.com/reference/get-calendars)

#### Response

Array of calendar objects:

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Identifier used as `calendarID` elsewhere in the API. |
| `name` | string | Human-readable calendar label shown to clients. |
| `timezone` | string | IANA timezone tied to the calendar's availability window. |
| `email` | string | Notification address used for confirmations. |
| `replyTo` | string | Reply-To email configured for outbound client emails. |
| `description` | string | Optional blurb shown on the booking page. |
| `location` | string | Free-form location text for the appointment. |
| `image` / `thumbnail` | string | CDN URLs for the calendar avatar displayed in client flows. |

Additional account-specific metadata (color, scheduling URLs, form references, etc.) may appear as extra keys; treat unknown keys as pass-through values.

#### Errors

- `401 unauthorized` – Basic Auth missing/incorrect. (Source: https://developers.acuityscheduling.com/reference/get-calendars)
- `403 forbidden` – attempting to read calendars that belong to another account. (Source: https://developers.acuityscheduling.com/reference/get-calendars)
- `429 too_many_requests` – same 10 req/s limit as the rest of the API. (Source: https://developers.acuityscheduling.com/reference/api-errors)

## Static Webhooks

Static webhooks are configured under the Acuity dashboard and send `application/x-www-form-urlencoded` payloads that always include `action` plus identifiers such as `id`, `calendarID`, and `appointmentTypeID` for appointment-related events. The `action` field arrives as the full event name (e.g., `appointment.scheduled`, `appointment.rescheduled`, `appointment.canceled`, `appointment.changed`). The SDK forwards that `action` verbatim on the parsed event—there is no extra `type` or `scope` field. (Source: https://developers.acuityscheduling.com/docs/webhooks#static-webhooks)
- Each delivery contains an `X-Acuity-Signature` header with a Base64-encoded HMAC-SHA256 hash of the exact request body computed with your API key as the secret. Always compute the HMAC over the raw bytes before parsing and compare it to the header to reject tampered payloads. (Source: https://developers.acuityscheduling.com/docs/webhooks#verifying-webhooks)
- The SDK exposes `createWebhookHandler`, which binds your webhook secret and lets you call the returned function with `(body, headers, handler)` for each request. Signature verification is on by default but can be disabled for development, and parsing/verification utilities (`parseWebhookEvent`, `verifyWebhookSignature`) are exported separately when you want to orchestrate the steps yourself. Dynamic webhooks handle the same appointment events but are configured via the REST helpers below.

## Dynamic Webhooks

Dynamic webhooks let you register callback URLs at runtime via the REST API so you can enable or disable subscriptions without touching the Acuity dashboard. Each subscription targets a single event and HTTP endpoint. (Source: https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks)

### `POST /webhooks`

Create a subscription by sending `event` plus the HTTPS `target` URL that should receive deliveries. Supported events mirror the static appointment notifications (`appointment.scheduled`, `appointment.rescheduled`, `appointment.canceled`, `appointment.changed`). The response echoes back the new webhook record with its numeric `id`, `event`, `target`, and `status` fields—no signing secret is returned, so rely on the API key that created the webhook when verifying requests. Acuity enforces a hard limit of 25 dynamic webhooks per account and returns `400` when the limit is exceeded. (Source: https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks)

### `GET /webhooks`

Returns all active subscriptions so you can audit which URLs are receiving events. Each object includes the `id`, `event`, `target`, and `status` fields so you can determine whether a hook is active before updating or deleting it. The API enforces a soft cap of 25 dynamic webhooks per account, so delete unused subscriptions before creating new ones. (Source: https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks)

### `DELETE /webhooks/{id}`

Removes the subscription with the supplied numeric `id` and returns `204 No Content` on success. Use this endpoint when rotating infrastructure or cleaning up hooks created for short-lived experiments. (Source: https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks)

### Verifying deliveries

Webhook notifications are signed with a Base64-encoded HMAC-SHA256 hash of the exact request body. For static webhooks the shared secret is the main admin’s API key, while dynamic webhooks use the API key belonging to the authenticated user that created the subscription. Compare the calculated signature to the `x-acuity-signature` header and reject the request if they differ. (Source: https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks)

### SDK integration

Call `acuity.webhooks.create({ event, target })` to register a hook, `acuity.webhooks.list()` to enumerate them, and `acuity.webhooks.delete(id)` to remove obsolete subscriptions. Provide the corresponding API key to `createWebhookHandler` (or to `verifyWebhookSignature` if you are wiring the pieces manually) when you want signature enforcement, and set `verifySignature: false` for development flows that need to bypass checks. (Source: https://developers.acuityscheduling.com/page/webhooks-webhooks-webhooks)
