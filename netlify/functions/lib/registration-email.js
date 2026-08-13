const nodemailer = require("nodemailer");

const cities = require("../../../src/_data/cities.json");
const templates = require("./email-templates");
const REGISTRATION_FORM_PREFIX = "local-contact-";
const DEFAULT_TIMEZONE = "America/Los_Angeles";

function parseSessionWhen(session) {
  if (!session) {
    return { seminarDate: "", seminarTime: "" };
  }

  if (session.date || session.time) {
    return {
      seminarDate: (session.date || "").trim(),
      seminarTime: (session.time || "").trim(),
    };
  }

  const when = session.when;
  if (!when) {
    return { seminarDate: "", seminarTime: "" };
  }

  const commaIndex = when.indexOf(",");
  if (commaIndex === -1) {
    return { seminarTime: when.trim(), seminarDate: "" };
  }

  return {
    seminarTime: when.slice(0, commaIndex).trim(),
    seminarDate: when.slice(commaIndex + 1).trim(),
  };
}

function findCity(citySlug) {
  return cities.find((city) => city.slug === citySlug);
}

function formatLocation(city) {
  if (!city) {
    return "";
  }

  return city.region ? `${city.city}, ${city.region}` : city.city;
}

function formatVenueAddress(city) {
  if (!city?.addressLines?.length) {
    return "";
  }

  return city.addressLines.join(", ");
}

function formatVenueLocation(city) {
  if (!city) {
    return "";
  }

  const parts = [city.venueName, formatVenueAddress(city)].filter(Boolean);
  return parts.join(", ");
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    return result.replace(pattern, value ?? "");
  }, template);
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line) {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const chunks = [line.slice(0, maxLength)];
  let remaining = line.slice(maxLength);
  while (remaining.length > 0) {
    chunks.push(` ${remaining.slice(0, maxLength - 1)}`);
    remaining = remaining.slice(maxLength - 1);
  }
  return chunks.join("\r\n");
}

function formatIcsUtc(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function parseLocalDateTime(localIso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localIso || "");
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
  };
}

function getTimeZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );
}

function zonedLocalToUtc(localIso, timeZone) {
  const local = parseLocalDateTime(localIso);
  if (!local) {
    return null;
  }

  const utcGuess = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  const parts = getTimeZoneParts(new Date(utcGuess), timeZone);
  const asLocalMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = asLocalMs - utcGuess;
  return new Date(utcGuess - offsetMs);
}

function buildEventUid(city, sessionIndex) {
  return `${city.slug}-${sessionIndex}@exposingthesatanmyth.org`;
}

function buildSessionEvent(city, session, sessionIndex, formData) {
  const timeZone = session.timezone || DEFAULT_TIMEZONE;
  const startUtc = zonedLocalToUtc(session.start, timeZone);
  const endUtc = zonedLocalToUtc(session.end, timeZone);

  if (!startUtc || !endUtc) {
    return null;
  }

  const location = formatVenueLocation(city);
  const summary = `Exposing the Satan Myth — ${formatLocation(city)}`;
  const descriptionParts = [
    session.title,
    session.speaker ? `Speaker: ${session.speaker}` : "",
    location,
  ].filter(Boolean);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${buildEventUid(city, sessionIndex)}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(startUtc)}`,
    `DTEND:${formatIcsUtc(endUtc)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\\n"))}`,
    `LOCATION:${escapeIcsText(location)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
  ];

  if (formData.email) {
    const attendeeName = [formData["first-name"], formData["last-name"]].filter(Boolean).join(" ");
    const cn = attendeeName ? `;CN=${escapeIcsText(attendeeName)}` : "";
    lines.push(`ATTENDEE${cn};RSVP=FALSE:mailto:${formData.email}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

function buildRegistrationIcs(city, formData) {
  if (!city?.sessions?.length) {
    return null;
  }

  const events = city.sessions
    .map((session, index) => buildSessionEvent(city, session, index, formData))
    .filter(Boolean);

  if (!events.length) {
    return null;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Exposing the Satan Myth//Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flat(),
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function buildRegistrationEmailValues(formData) {
  const city = findCity(formData["city-slug"]);
  const session = city?.sessions?.[0];
  const { seminarDate, seminarTime } = parseSessionWhen(session);

  return {
    FirstName: formData["first-name"] || "",
    LastName: formData["last-name"] || "",
    Location: formData["city-label"] || formatLocation(city),
    SeminarDate: seminarDate,
    SeminarTime: seminarTime,
    VenueName: city?.venueName || "",
    VenueAddress: formatVenueAddress(city),
    AttendeeCount: formData["how-many"] || "1",
  };
}

function createTransport() {
  const host = process.env.SMTP_HOST || "mail.privateemail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function isRegistrationForm(formName) {
  return typeof formName === "string" && formName.startsWith(REGISTRATION_FORM_PREFIX);
}

async function sendRegistrationEmail(formData) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured.");
  }

  const recipient = formData.email;
  if (!recipient) {
    throw new Error("Registration submission is missing an email address.");
  }

  const city = findCity(formData["city-slug"]);
  const values = buildRegistrationEmailValues(formData);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const icsContent = buildRegistrationIcs(city, formData);

  const message = {
    from,
    to: recipient,
    replyTo: process.env.SMTP_REPLY_TO || from,
    subject: "Registration Confirmed: Exposing the Satan Myth",
    html: renderTemplate(templates.html, values),
    text: renderTemplate(templates.text, values),
  };

  if (icsContent) {
    const slug = city?.slug || "event";
    message.attachments = [
      {
        filename: `exposing-the-satan-myth-${slug}.ics`,
        content: icsContent,
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        contentDisposition: "attachment",
      },
    ];
  }

  const transport = createTransport();
  await transport.sendMail(message);
}

module.exports = {
  isRegistrationForm,
  sendRegistrationEmail,
  buildRegistrationIcs,
};
