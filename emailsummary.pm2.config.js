module.exports = {
  script: "npm",
  args: "start",
  name: "emailsummary",
  // Specify which folder to watch
  watch: [".next"],
  // Specify delay between watch interval
  watch_delay: 1000,
  // Specify which folder to ignore
  ignore_watch: ["node_modules", "database"],
  time: true,
};
