import { describe, expect, test } from "bun:test";
import type { Appointment } from "./types.js";

/**
 * A real `GET /appointments` element, captured from a live account and scrubbed of
 * client details. Field names and JSON types are untouched.
 *
 * This exists because the appointment type once declared a `calendarTimeZone` that
 * Acuity never sends, and flattened `forms` into a bare answer list. Both mistakes
 * survived review: nothing in the SDK validates a response, so a wrong type only
 * surfaces downstream, where a consumer builds a schema from it and the encode fails.
 * Assigning a captured payload to `Appointment` turns that into a typecheck failure.
 */
const captured = {
  id: 1234567890,
  firstName: "Ada",
  lastName: "Lovelace",
  phone: "(555) 555-0100",
  email: "ada@example.com",
  date: "March 18, 2025",
  time: "2:00pm",
  endTime: "3:00pm",
  dateCreated: "March 1, 2025",
  datetimeCreated: "2025-03-01T09:12:44-0800",
  datetime: "2025-03-18T14:00:00-0700",
  price: "0.00",
  priceSold: "0.00",
  paid: "no",
  amountPaid: "0.00",
  type: "Donation Type O",
  appointmentTypeID: 12345678,
  classID: null,
  addonIDs: [],
  category: "",
  duration: "60",
  calendar: "Donation Type O",
  calendarID: 12817278,
  certificate: null,
  confirmationPage: "https://app.acuityscheduling.com/schedule.php?owner=00000000",
  confirmationPagePaymentLink: "",
  location: "3808 W Riverside Dr Suite 404, Burbank, CA 91505",
  notes: "",
  timezone: "America/Los_Angeles",
  calendarTimezone: "America/Los_Angeles",
  canceled: false,
  canClientCancel: false,
  canClientReschedule: false,
  labels: null,
  forms: [
    {
      id: 3198537,
      name: "",
      values: [
        {
          id: 987654321,
          fieldID: 15115857,
          fieldWidget: 1,
          value: "A friend",
          name: "Did someone refer you?",
        },
        // Acuity omits `fieldWidget` on some answers and sends `null` on others.
        {
          id: 987654322,
          fieldID: 15115857,
          value: "",
          name: "Did someone refer you?",
        },
      ],
    },
  ],
  formsText: "Did someone refer you?: A friend",
};

// Assigning from a variable rather than a literal on purpose: an inline literal would
// trip TypeScript's excess property check, and the point here is the opposite one, that
// every field `Appointment` requires is a field Acuity actually sends.
const appointment: Appointment = captured;

describe("Appointment", () => {
  test("reads the timezone Acuity sends", () => {
    expect(appointment.timezone).toBe("America/Los_Angeles");
    expect(appointment.calendarTimezone).toBe("America/Los_Angeles");
  });

  test("reads an intake answer through the form that holds it", () => {
    // Two levels down. An earlier version of this type put answers directly on `forms`.
    expect(appointment.forms[0]?.values[0]?.value).toBe("A friend");
    expect(appointment.forms[0]?.values[0]?.fieldID).toBe(15115857);
  });
});
