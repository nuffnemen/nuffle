const { spawn } = require("child_process");

const port = process.env.PORT || 3000;

console.log("Starting Next.js on port", port);

spawn(
  "npx",
  ["next", "start", "-p", port],
  { stdio: "inherit" }
);
