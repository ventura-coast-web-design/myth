module.exports = {
  eleventyComputed: {
    title: (data) => `${data.city.city} — Local Presentations`,
    description: (data) =>
      `Address, schedule, and contact for Myth of Satan presentations in ${data.city.city}.`,
    speaker: (data) => {
      const slug = data.city && data.city.speakerSlug;
      if (!slug) return null;
      return (data.speakers || []).find((s) => s.slug === slug) || null;
    },
  },
};
