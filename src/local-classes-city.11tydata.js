module.exports = {
  eleventyComputed: {
    title: (data) => `${data.city.city} — Local classes`,
    description: (data) =>
      `Address, schedule, and contact for Myth of Satan classes in ${data.city.city}.`,
  },
};
