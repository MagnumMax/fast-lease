const { spawnSync } = require("node:child_process");
const net = require("node:net");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function canBindLocalhost() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(0, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

run("npm", ["run", "build"]);

canBindLocalhost().then((canBind) => {
  if (!canBind) {
    console.warn("Skipping Playwright e2e: sandbox forbids binding to localhost.");
    process.exit(0);
  }

  run("npx", ["playwright", "test"]);
});
