#!/usr/bin/env node

import yargs from "yargs/yargs";
import type { Argv, ArgumentsCamelCase } from "yargs";
import { hideBin } from "yargs/helpers";

import { Acuity } from "./client.js";
import { AcuityError } from "./errors.js";
import type {
  CheckTimesPayload,
  AvailabilityTimesParams,
  AvailabilityDatesParams,
  ListAppointmentsParams,
  WebhookEventType,
} from "./types.js";

type GlobalArgs = {
  userId?: string | number;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  compact?: boolean;
};

type AppointmentsListArgs = GlobalArgs & {
  calendarId?: ListAppointmentsParams["calendarID"];
  categoryId?: ListAppointmentsParams["categoryID"];
  appointmentTypeId?: ListAppointmentsParams["appointmentTypeID"];
  clientId?: ListAppointmentsParams["clientID"];
  max?: ListAppointmentsParams["max"];
  minDate?: ListAppointmentsParams["minDate"];
  maxDate?: ListAppointmentsParams["maxDate"];
  minTime?: ListAppointmentsParams["minTime"];
  maxTime?: ListAppointmentsParams["maxTime"];
  canceled?: ListAppointmentsParams["canceled"];
  showall?: ListAppointmentsParams["showall"];
  direction?: ListAppointmentsParams["direction"];
  excludeForms?: ListAppointmentsParams["excludeForms"];
  timezone?: ListAppointmentsParams["timezone"];
  page?: ListAppointmentsParams["page"];
  limit?: ListAppointmentsParams["limit"];
  firstName?: ListAppointmentsParams["firstName"];
  lastName?: ListAppointmentsParams["lastName"];
  email?: ListAppointmentsParams["email"];
  phone?: ListAppointmentsParams["phone"];
  field?: string | string[];
};

type AvailabilityDatesArgs = GlobalArgs & {
  month: AvailabilityDatesParams["month"];
  appointmentTypeId: AvailabilityDatesParams["appointmentTypeID"];
  calendarId?: AvailabilityDatesParams["calendarID"];
  timezone?: AvailabilityDatesParams["timezone"];
};

type AvailabilityTimesArgs = GlobalArgs & {
  date: AvailabilityTimesParams["date"];
  appointmentTypeId: AvailabilityTimesParams["appointmentTypeID"];
  calendarId?: AvailabilityTimesParams["calendarID"];
  timezone?: AvailabilityTimesParams["timezone"];
  ignore?: string | string[];
};

type AvailabilityCheckArgs = GlobalArgs & {
  datetime: CheckTimesPayload["datetime"];
  appointmentTypeId: CheckTimesPayload["appointmentTypeID"];
  calendarId?: CheckTimesPayload["calendarID"];
  timezone?: CheckTimesPayload["timezone"];
  duration?: CheckTimesPayload["duration"];
  price?: CheckTimesPayload["price"];
};

type WebhookCreateArgs = GlobalArgs & {
  event: WebhookEventType;
  target: string;
};

function parseEnvNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumberList(value: unknown, errorMessage: string): number[] | undefined {
  if (value === undefined) return undefined;

  const inputs = Array.isArray(value) ? value : [value];
  const tokens = inputs
    .flatMap((entry) => String(entry).split(","))
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return undefined;

  const numbers = tokens.map((token) => Number(token));
  const invalid = numbers.find((num) => !Number.isFinite(num));
  if (invalid !== undefined) {
    throw new Error(errorMessage);
  }

  return numbers;
}

function parseFieldFilters(
  input: string | string[] | undefined,
): Record<number, string> | undefined {
  if (!input) return undefined;
  const entries = Array.isArray(input) ? input : [input];
  const result: Record<number, string> = {};
  for (const entry of entries) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(`Invalid field filter: ${entry} (expected format: id=value)`);
    }
    const idStr = entry.slice(0, eqIndex);
    const value = entry.slice(eqIndex + 1);
    if (!idStr.trim()) {
      throw new Error(`Invalid field filter: ${entry} (field ID cannot be empty)`);
    }
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid field filter: ${entry} (field ID must be a positive integer)`);
    }
    result[id] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function createClient(argv: GlobalArgs): Acuity {
  const userId = argv.userId ?? process.env.ACUITY_USER_ID;
  const apiKey = argv.apiKey ?? process.env.ACUITY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error(
      "Missing credentials. Set ACUITY_USER_ID and ACUITY_API_KEY or pass --user-id/--api-key.",
    );
  }

  return new Acuity({
    userId,
    apiKey,
    baseUrl: argv.baseUrl ?? process.env.ACUITY_BASE_URL,
    requestTimeoutMs: argv.timeoutMs ?? parseEnvNumber("ACUITY_TIMEOUT_MS"),
  });
}

function printJson(payload: unknown, compact = false): void {
  const space = compact ? 0 : 2;
  console.log(JSON.stringify(payload, null, space));
}

function handleError(error: unknown): never {
  if (error instanceof AcuityError) {
    console.error(`[${error.code ?? "acuity_error"}] ${error.message}`);
    if (error.payload !== undefined) {
      console.error(JSON.stringify(error.payload, null, 2));
    }
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exit(1);
}

async function main(): Promise<void> {
  const parser = yargs(hideBin(process.argv))
    .scriptName("acuity")
    .strict()
    .help()
    .fail((msg, err, yargs) => {
      const missingCommand = msg.includes("Choose a subcommand to run.");
      yargs.showHelp();
      if (!missingCommand) {
        if (msg) {
          console.error(msg);
        } else if (err instanceof Error) {
          console.error(err.message);
        }
      }
      process.exit(missingCommand ? 0 : 1);
    })
    .demandCommand(1, "Choose a subcommand to run.")
    .option("user-id", {
      type: "string",
      describe: "Acuity user ID (or ACUITY_USER_ID).",
    })
    .option("api-key", {
      type: "string",
      describe: "Acuity API key (or ACUITY_API_KEY).",
    })
    .option("base-url", {
      type: "string",
      describe: "Override the Acuity REST base URL (or ACUITY_BASE_URL).",
    })
    .option("timeout-ms", {
      type: "number",
      describe: "Request timeout applied to each call in milliseconds (or ACUITY_TIMEOUT_MS).",
    })
    .option("compact", {
      type: "boolean",
      default: false,
      describe: "Print JSON without indentation.",
    })
    .command("appointments", "Manage appointments", (yargs: Argv) =>
      yargs
        .command(
          "list",
          "List appointments with optional filters",
          (yargs: Argv) =>
            yargs
              .option("calendar-id", {
                type: "number",
                describe: "Filter by calendar ID.",
              })
              .option("category-id", {
                type: "number",
                describe: "Filter by category ID.",
              })
              .option("appointment-type-id", {
                type: "number",
                describe: "Filter by appointment type ID.",
              })
              .option("client-id", {
                type: "number",
                describe: "Filter by client ID.",
              })
              .option("max", {
                type: "number",
                describe: "Maximum number of appointments to return.",
              })
              .option("min-date", {
                type: "string",
                describe: "Earliest appointment date (YYYY-MM-DD).",
              })
              .option("max-date", {
                type: "string",
                describe: "Latest appointment date (YYYY-MM-DD).",
              })
              .option("min-time", {
                type: "string",
                describe: "Earliest appointment timestamp (ISO 8601).",
              })
              .option("max-time", {
                type: "string",
                describe: "Latest appointment timestamp (ISO 8601).",
              })
              .option("canceled", {
                type: "boolean",
                describe: "Include only canceled appointments if true.",
              })
              .option("showall", {
                type: "boolean",
                describe: "Include inactive appointments as well.",
              })
              .option("direction", {
                choices: ["asc", "desc"] as const,
                describe: "Sort direction for appointment listings.",
              })
              .option("exclude-forms", {
                type: "boolean",
                describe: "Omit form answers from the response payload.",
              })
              .option("timezone", {
                type: "string",
                describe: "IANA timezone used for display fields.",
              })
              .option("page", {
                type: "number",
                describe: "Results page (if the account enables pagination).",
              })
              .option("limit", {
                type: "number",
                describe: "Page size when pagination is enabled.",
              })
              .option("first-name", {
                type: "string",
                describe: "Filter by client first name.",
              })
              .option("last-name", {
                type: "string",
                describe: "Filter by client last name.",
              })
              .option("email", {
                type: "string",
                describe: "Filter by client email address.",
              })
              .option("phone", {
                type: "string",
                describe: "Filter by client phone number.",
              })
              .option("field", {
                type: "string",
                array: true,
                describe: "Filter by form field (format: id=value, repeatable).",
              }),
          async (argv: ArgumentsCamelCase<AppointmentsListArgs>) => {
            const client = createClient(argv);
            const appointments = await client.appointments.list({
              calendarID: argv.calendarId,
              categoryID: argv.categoryId,
              appointmentTypeID: argv.appointmentTypeId,
              clientID: argv.clientId,
              max: argv.max,
              minDate: argv.minDate,
              maxDate: argv.maxDate,
              minTime: argv.minTime,
              maxTime: argv.maxTime,
              canceled: argv.canceled,
              showall: argv.showall,
              direction: argv.direction,
              excludeForms: argv.excludeForms,
              timezone: argv.timezone,
              page: argv.page,
              limit: argv.limit,
              firstName: argv.firstName,
              lastName: argv.lastName,
              email: argv.email,
              phone: argv.phone,
              fields: parseFieldFilters(argv.field),
            });

            printJson(appointments, argv.compact);
          },
        )
        .command(
          "get <id>",
          "Fetch a single appointment by ID",
          (yargs: Argv) =>
            yargs
              .positional("id", {
                type: "number",
                describe: "Appointment ID to fetch.",
                demandOption: true,
              })
              .option("past-form-answers", {
                type: "boolean",
                default: false,
                describe: "Include historical form answers in the response.",
              }),
          async (
            argv: ArgumentsCamelCase<GlobalArgs & { id: number; pastFormAnswers?: boolean }>,
          ) => {
            const client = createClient(argv);
            const appointment = await client.appointments.get(argv.id, {
              pastFormAnswers: argv.pastFormAnswers,
            });
            printJson(appointment, argv.compact);
          },
        )
        .command(
          "types",
          "List appointment types configured on the account",
          (yargs: Argv) => yargs,
          async (argv: ArgumentsCamelCase<GlobalArgs>) => {
            const client = createClient(argv);
            const types = await client.appointments.types();
            printJson(types, argv.compact);
          },
        )
        .demandCommand(1, "Choose an appointments subcommand to run.")
        .strict(),
    )
    .command("availability", "Inspect availability", (yargs: Argv) =>
      yargs
        .command(
          "dates",
          "Show days with availability for a given month",
          (yargs: Argv) =>
            yargs
              .option("month", {
                type: "string",
                demandOption: true,
                describe: "Target month formatted as YYYY-MM.",
              })
              .option("appointment-type-id", {
                type: "number",
                demandOption: true,
                describe: "Appointment type to evaluate.",
              })
              .option("calendar-id", {
                type: "number",
                describe: "Optional calendar filter.",
              })
              .option("timezone", {
                type: "string",
                describe: "IANA timezone for display fields.",
              }),
          async (argv: ArgumentsCamelCase<GlobalArgs & AvailabilityDatesArgs>) => {
            const client = createClient(argv);
            const dates = await client.availability.dates({
              month: argv.month,
              appointmentTypeID: argv.appointmentTypeId,
              calendarID: argv.calendarId,
              timezone: argv.timezone,
            });
            printJson(dates, argv.compact);
          },
        )
        .command(
          "times",
          "List timeslots for a specific date",
          (yargs: Argv) =>
            yargs
              .option("date", {
                type: "string",
                demandOption: true,
                describe: "Target date formatted as YYYY-MM-DD.",
              })
              .option("appointment-type-id", {
                type: "number",
                demandOption: true,
                describe: "Appointment type to evaluate.",
              })
              .option("calendar-id", {
                type: "number",
                describe: "Optional calendar filter.",
              })
              .option("timezone", {
                type: "string",
                describe: "IANA timezone for display fields.",
              })
              .option("ignore", {
                type: "string",
                array: true,
                describe: "Comma-separated appointment IDs to ignore (useful when rescheduling).",
              }),
          async (argv: ArgumentsCamelCase<GlobalArgs & AvailabilityTimesArgs>) => {
            const client = createClient(argv);
            const ignoreAppointmentIds = parseNumberList(
              argv.ignore,
              "--ignore must be a comma-separated list of numbers",
            );
            const times = await client.availability.times({
              date: argv.date,
              appointmentTypeID: argv.appointmentTypeId,
              calendarID: argv.calendarId,
              timezone: argv.timezone,
              ignoreAppointmentIDs: ignoreAppointmentIds,
            });
            printJson(times, argv.compact);
          },
        )
        .command(
          "check",
          "Confirm whether a specific datetime is bookable",
          (yargs: Argv) =>
            yargs
              .option("datetime", {
                type: "string",
                demandOption: true,
                describe: "ISO datetime string to validate (e.g., 2025-01-15T14:30:00-05:00).",
              })
              .option("appointment-type-id", {
                type: "number",
                demandOption: true,
                describe: "Appointment type to evaluate.",
              })
              .option("calendar-id", {
                type: "number",
                describe: "Optional calendar filter.",
              })
              .option("timezone", {
                type: "string",
                describe: "IANA timezone used for the response payload.",
              })
              .option("duration", {
                type: "number",
                describe: "Override appointment duration in minutes.",
              })
              .option("price", {
                type: "number",
                describe: "Override price used for availability calculation.",
              }),
          async (argv: ArgumentsCamelCase<GlobalArgs & AvailabilityCheckArgs>) => {
            const client = createClient(argv);
            const result = await client.availability.checkTimes({
              datetime: argv.datetime,
              appointmentTypeID: argv.appointmentTypeId,
              calendarID: argv.calendarId,
              timezone: argv.timezone,
              duration: argv.duration,
              price: argv.price,
            });
            printJson(result, argv.compact);
          },
        )
        .demandCommand(1, "Choose an availability subcommand to run.")
        .strict(),
    )
    .command(
      "calendars list",
      "List calendars on the account",
      (yargs: Argv) => yargs,
      async (argv: ArgumentsCamelCase<GlobalArgs>) => {
        const client = createClient(argv);
        const calendars = await client.calendars.list();
        printJson(calendars, argv.compact);
      },
    )
    .command("webhooks", "Manage dynamic webhook subscriptions", (yargs: Argv) =>
      yargs
        .command(
          "list",
          "List dynamic webhook subscriptions",
          (yargs: Argv) => yargs,
          async (argv: ArgumentsCamelCase<GlobalArgs>) => {
            const client = createClient(argv);
            const hooks = await client.webhooks.list();
            printJson(hooks, argv.compact);
          },
        )
        .command(
          "create",
          "Create a dynamic webhook subscription",
          (yargs: Argv) =>
            yargs
              .option("event", {
                type: "string",
                choices: [
                  "appointment.scheduled",
                  "appointment.rescheduled",
                  "appointment.canceled",
                  "appointment.changed",
                ] as const,
                demandOption: true,
                describe: "Event name to subscribe to.",
              })
              .option("target", {
                type: "string",
                demandOption: true,
                describe: "HTTPS endpoint that should receive webhook deliveries.",
              }),
          async (argv: ArgumentsCamelCase<WebhookCreateArgs>) => {
            const client = createClient(argv);
            const hook = await client.webhooks.create({
              event: argv.event,
              target: argv.target,
            });
            printJson(hook, argv.compact);
          },
        )
        .command(
          "delete <id>",
          "Delete a dynamic webhook subscription",
          (yargs: Argv) =>
            yargs.positional("id", {
              type: "number",
              demandOption: true,
              describe: "Webhook ID to delete.",
            }),
          async (argv: ArgumentsCamelCase<GlobalArgs & { id: number }>) => {
            const client = createClient(argv);
            await client.webhooks.delete(argv.id);
            printJson({ deleted: argv.id }, argv.compact);
          },
        )
        .demandCommand(1, "Choose a webhooks subcommand to run.")
        .strict(),
    );

  await parser.parseAsync();
}

void main().catch(handleError);
