(function () {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function nowInTimeZone(timeZone) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    var get = function (type) {
      var part = parts.find(function (p) {
        return p.type === type;
      });
      return part ? part.value : "00";
    };

    var hour = get("hour");
    if (hour === "24") hour = "00";

    return (
      get("year") +
      "-" +
      get("month") +
      "-" +
      get("day") +
      "T" +
      pad(hour) +
      ":" +
      get("minute") +
      ":" +
      get("second")
    );
  }

  function isPast(endsAt, timeZone) {
    if (!endsAt) return false;
    return nowInTimeZone(timeZone) > endsAt;
  }

  function stampPast(el) {
    var endsAt = el.getAttribute("data-ends-at");
    var timeZone = el.getAttribute("data-timezone") || "America/Los_Angeles";
    if (!isPast(endsAt, timeZone)) return false;
    el.classList.add("is-past");
    return true;
  }

  function sortByEnd(items) {
    return items.slice().sort(function (a, b) {
      var aPast = a.classList.contains("is-past");
      var bPast = b.classList.contains("is-past");
      if (aPast !== bPast) return aPast ? 1 : -1;

      var aEnd = a.getAttribute("data-ends-at") || "";
      var bEnd = b.getAttribute("data-ends-at") || "";
      if (aPast) {
        // Most recently completed first among past items.
        return aEnd < bEnd ? 1 : aEnd > bEnd ? -1 : 0;
      }
      // Soonest upcoming first.
      return aEnd < bEnd ? -1 : aEnd > bEnd ? 1 : 0;
    });
  }

  function reorderList(list, items) {
    sortByEnd(items).forEach(function (item) {
      list.appendChild(item);
    });
  }

  function closeLocationCardRegistration(card) {
    var actions = card.querySelector("[data-register-action]");
    if (!actions) return;
    actions.outerHTML =
      '<span class="location-card__closed" data-register-action>Registration closed</span>';
  }

  function markLocationCards() {
    var list = document.querySelector(".locations__list");
    if (!list) return;

    var cards = Array.prototype.slice.call(
      list.querySelectorAll(".location-card[data-ends-at]")
    );
    if (!cards.length) return;

    cards.forEach(function (card) {
      if (stampPast(card)) closeLocationCardRegistration(card);
    });

    reorderList(list, cards);
  }

  function markCityModal() {
    var list = document.querySelector(".city-modal__list");
    if (!list) return;

    var items = Array.prototype.slice.call(
      list.querySelectorAll(".city-modal__item[data-ends-at]")
    );
    if (!items.length) return;

    items.forEach(function (item) {
      if (!stampPast(item)) return;
      var choice = item.querySelector(".city-modal__choice");
      if (!choice) return;
      choice.classList.add("is-past");
      if (!choice.querySelector(".city-modal__choice-status")) {
        var status = document.createElement("span");
        status.className = "city-modal__choice-status";
        status.textContent = "Completed";
        choice.appendChild(status);
      }
    });

    reorderList(list, items);
  }

  function markCityPage() {
    var page = document.querySelector(".city-page[data-ends-at]");
    if (!page || !stampPast(page)) return;

    var form = page.querySelector(".contact-form");
    var notice = page.querySelector("[data-registration-closed]");
    var intro = page.querySelector(".city-page__contact .section__head p");
    var privacy = page.querySelector("[data-registration-privacy]");

    if (notice) notice.hidden = false;
    if (intro) intro.hidden = true;
    if (privacy) privacy.hidden = true;
    if (form) {
      form.hidden = true;
      form.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(
        form.querySelectorAll("input, textarea, button, select"),
        function (field) {
          field.disabled = true;
        }
      );
    }

    Array.prototype.forEach.call(
      page.querySelectorAll(".city-page__session"),
      function (session) {
        session.classList.add("is-past");
      }
    );
  }

  markLocationCards();
  markCityModal();
  markCityPage();
})();
