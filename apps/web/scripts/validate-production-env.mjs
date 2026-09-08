import process from "node:process";

const message =
  "MIRROR_DEV_AUTH=true is not allowed during a production build. Set it to false or unset it.";

export function productionAuthConfigError(env = process.env) {
  return env.MIRROR_DEV_AUTH === "true" ? message : null;
}

const error = productionAuthConfigError();

if (error) {
  process.stderr.write(`${error}\n`);
  process.exitCode = 1;
}
