(function () {
  var mapEl = document.getElementById("locations-map");
  var dataEl = document.getElementById("locations-map-data");
  if (!mapEl || !dataEl || typeof L === "undefined") return;

  var places;
  try {
    places = JSON.parse(dataEl.textContent);
  } catch (err) {
    return;
  }

  places = (places || []).filter(function (place) {
    return (
      place &&
      typeof place.lat === "number" &&
      typeof place.lng === "number" &&
      place.slug
    );
  });
  if (!places.length) return;

  var locale = mapEl.getAttribute("data-locale") || "en";
  var detailsLabel = locale === "es" ? "Ver detalles" : "View details";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function groupPlaces(list) {
    var groups = {};
    list.forEach(function (place) {
      var key = place.lat.toFixed(4) + "," + place.lng.toFixed(4);
      if (!groups[key]) {
        groups[key] = { lat: place.lat, lng: place.lng, places: [] };
      }
      groups[key].places.push(place);
    });
    return Object.keys(groups).map(function (key) {
      return groups[key];
    });
  }

  function placeTitle(place, grouped) {
    var title = place.city || "";
    if (place.region) title += ", " + place.region;
    if (grouped && place.language === "es") {
      title += locale === "es" ? " (español)" : " (Spanish)";
    } else if (grouped && place.language === "en") {
      title += " (English)";
    }
    return title;
  }

  function popupHtml(group) {
    var grouped = group.places.length > 1;
    return group.places
      .map(function (place) {
        var date = place.date
          ? '<p class="locations-map__popup-date">' +
            escapeHtml(place.date) +
            "</p>"
          : "";
        var note = place.locationNote
          ? '<p class="locations-map__popup-note">' +
            escapeHtml(place.locationNote) +
            "</p>"
          : "";
        var venue = place.venueName
          ? '<p class="locations-map__popup-venue">' +
            escapeHtml(place.venueName) +
            "</p>"
          : "";
        return (
          '<div class="locations-map__popup-item">' +
          "<strong>" +
          escapeHtml(placeTitle(place, grouped)) +
          "</strong>" +
          date +
          note +
          venue +
          '<a class="locations-map__popup-link" href="/local-presentations/' +
          escapeHtml(place.slug) +
          '/">' +
          escapeHtml(detailsLabel) +
          "</a>" +
          "</div>"
        );
      })
      .join("");
  }

  var map = L.map(mapEl, {
    scrollWheelZoom: false,
    attributionControl: true,
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  var pinIcon = L.divIcon({
    className: "locations-map__pin",
    html: '<span class="locations-map__pin-dot" aria-hidden="true"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -8],
  });

  var bounds = [];
  groupPlaces(places).forEach(function (group) {
    var marker = L.marker([group.lat, group.lng], { icon: pinIcon }).addTo(map);
    marker.bindPopup(popupHtml(group), { maxWidth: 280 });
    bounds.push([group.lat, group.lng]);
  });

  if (bounds.length === 1) {
    map.setView(bounds[0], 10);
  } else {
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8 });
  }

  map.on("click", function () {
    map.scrollWheelZoom.enable();
  });
  map.on("mouseout", function () {
    map.scrollWheelZoom.disable();
  });

  requestAnimationFrame(function () {
    map.invalidateSize();
  });
})();
