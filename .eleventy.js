const sass = require("sass");

module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ "favicon/": "/" });
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");

  // Watch for CSS changes
  eleventyConfig.addWatchTarget("./src/css/main.css");

  eleventyConfig.addFilter("navIsActive", function (href, pageUrl) {
    if (!pageUrl || !href) return false;

    const hashIndex = href.indexOf("#");
    const path = hashIndex === -1 ? href : href.slice(0, hashIndex);

    if (path === "/" && hashIndex === -1) {
      return pageUrl === "/";
    }

    if (hashIndex !== -1) {
      return false;
    }

    return pageUrl === path || pageUrl.startsWith(path);
  });

  eleventyConfig.addFilter("mapsLinkUrl", function (city) {
    if (!city) return "";

    const query = city.mapEmbedQuery;
    if (query && typeof query === "string") {
      return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(query.trim())
      );
    }

    if (city.mapUrl && !city.mapUrl.includes("/embed")) {
      return city.mapUrl;
    }

    return "";
  });

  eleventyConfig.addFilter("mapsEmbedSrc", function (city) {
    if (!city) return "";

    if (city.mapUrl && city.mapUrl.includes("/embed")) {
      return city.mapUrl;
    }

    const query = city.mapEmbedQuery;
    if (query && typeof query === "string") {
      return (
        "https://www.google.com/maps?q=" +
        encodeURIComponent(query.trim()) +
        "&output=embed"
      );
    }

    return "";
  });

  // YouTube still requires its logo / “Watch on YouTube” link in embeds; these
  // params only reduce other ways viewers leave (e.g. unrelated end-screen videos).
  eleventyConfig.addFilter("youtubeEmbedSrc", function (videoId) {
    if (!videoId || typeof videoId !== "string") return "";

    const params = new URLSearchParams({
      rel: "0",
      playsinline: "1",
    });

    return (
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(videoId.trim()) +
      "?" +
      params.toString()
    );
  });

  eleventyConfig.addFilter("videoWatchHref", function (youtubeId, videos) {
    if (!youtubeId || !Array.isArray(videos)) return "";

    const match = videos.find((video) => video && video.youtubeId === youtubeId);
    if (match && match.slug) {
      return "/videos/" + match.slug + "/";
    }

    return "";
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    },
    templateFormats: ["html", "md", "njk"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}; 