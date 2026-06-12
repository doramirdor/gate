import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

// Remotion normally downloads its own Chrome Headless Shell. When that download
// is unavailable (offline / restricted network), fall back to a system Chrome
// so `npm run render` works without passing --browser-executable by hand.
const SYSTEM_CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

if (SYSTEM_CHROME) {
  Config.setBrowserExecutable(SYSTEM_CHROME);
}
