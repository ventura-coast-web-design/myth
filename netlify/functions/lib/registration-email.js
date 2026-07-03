const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const cities = require("../../../src/_data/cities.json");

const TEMPLATE_DIR = path.join(__dirname, "../../../emails");
const REGISTRATION_FORM_PREFIX = "local-contact-";

function parseSessionWhen(when) {
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

function renderTemplate(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    return result.replace(pattern, value ?? "");
  }, template);
}

function buildRegistrationEmailValues(formData) {
  const city = findCity(formData["city-slug"]);
  const session = city?.sessions?.[0];
  const { seminarDate, seminarTime } = parseSessionWhen(session?.when);

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

function loadTemplates() {
  return {
    html: fs.readFileSync(path.join(TEMPLATE_DIR, "registration-confirmed.html"), "utf8"),
    text: fs.readFileSync(path.join(TEMPLATE_DIR, "registration-confirmed.txt"), "utf8"),
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

  const values = buildRegistrationEmailValues(formData);
  const templates = loadTemplates();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const transport = createTransport();

  await transport.sendMail({
    from,
    to: recipient,
    replyTo: process.env.SMTP_REPLY_TO || from,
    subject: "Registration Confirmed: Exposing the Satan Myth",
    html: renderTemplate(templates.html, values),
    text: renderTemplate(templates.text, values),
  });
}

module.exports = {
  isRegistrationForm,
  sendRegistrationEmail,
};
