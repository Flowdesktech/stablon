import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

const A4_VIEWPORT = {
  width: 794,
  height: 1123,
  deviceScaleFactor: 1,
};

function localBrowserPath(): string | undefined {
  const configured = process.env.CHROME_EXECUTABLE_PATH?.trim();
  if (configured) return configured;
  if (process.platform !== "win32") return undefined;

  const candidates = [
    process.env.PROGRAMFILES
      ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
      : "",
    process.env["PROGRAMFILES(X86)"]
      ? path.join(
          process.env["PROGRAMFILES(X86)"],
          "Google",
          "Chrome",
          "Application",
          "chrome.exe"
        )
      : "",
    process.env.LOCALAPPDATA
      ? path.join(
          process.env.LOCALAPPDATA,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe"
        )
      : "",
    process.env.PROGRAMFILES
      ? path.join(
          process.env.PROGRAMFILES,
          "Microsoft",
          "Edge",
          "Application",
          "msedge.exe"
        )
      : "",
    process.env["PROGRAMFILES(X86)"]
      ? path.join(
          process.env["PROGRAMFILES(X86)"],
          "Microsoft",
          "Edge",
          "Application",
          "msedge.exe"
        )
      : "",
  ];

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

export async function launchInvoiceBrowser(): Promise<Browser> {
  const localPath = localBrowserPath();
  const executablePath = localPath || (await chromium.executablePath());

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: localPath
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : chromium.args,
    defaultViewport: A4_VIEWPORT,
  });
}
