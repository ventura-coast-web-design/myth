const { isRegistrationForm, sendRegistrationEmail } = require("./lib/registration-email");

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body);
    const formName = payload?.form_name;
    const formData = payload?.data || {};

    if (!isRegistrationForm(formName)) {
      return { statusCode: 200, body: "Skipped non-registration form." };
    }

    await sendRegistrationEmail(formData);
    return { statusCode: 200, body: "Registration email sent." };
  } catch (error) {
    console.error("Failed to send registration email:", error);
    return { statusCode: 200, body: "Registration email failed; submission retained." };
  }
};
