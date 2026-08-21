import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  })
);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const videoPath = path.resolve(
  projectRoot,
  args.get("video") || "public/video.mp4"
);
const siteUrl = (args.get("site-url") || process.env.STABLON_SITE_URL || "").replace(
  /\/$/,
  ""
);
const privacyStatus = args.get("privacy") || "public";
const dryRun = args.has("dry-run");

if (!["public", "unlisted", "private"].includes(privacyStatus)) {
  throw new Error("--privacy must be public, unlisted, or private");
}
if (!siteUrl) {
  throw new Error(
    "Provide the production website URL with --site-url=https://example.com"
  );
}

const metadata = {
  snippet: {
    title: "Stablon Product Demo | Invoicing and Business Payments",
    description: [
      "See how Stablon helps businesses create professional invoices, manage clients, automate recurring billing, and connect invoice workflows with supported payment options.",
      "",
      "Create itemized invoices, choose from 15 professional templates, generate polished PDFs, share secure invoice links, and track payment status from one platform.",
      "",
      `Learn more: ${siteUrl}`,
      `Free invoice generator: ${siteUrl}/invoice-generator`,
      "",
      "Payment features require provider onboarding and depend on jurisdiction and route availability.",
      "",
      "#Stablon #Invoicing #BusinessPayments",
    ].join("\n"),
    tags: [
      "stablon",
      "invoice software",
      "invoice generator",
      "business payments",
      "recurring invoices",
      "client management",
      "invoice PDF",
      "accounts receivable",
      "payment collection",
      "ACH payments",
      "SEPA payments",
      "stablecoin payments",
      "USDC payments",
      "USDT payments",
      "fintech",
      "SaaS",
    ],
    categoryId: "28",
    defaultLanguage: "en",
    defaultAudioLanguage: "en",
  },
  status: {
    privacyStatus,
    selfDeclaredMadeForKids: false,
    embeddable: true,
    publicStatsViewable: true,
  },
};

const video = await stat(videoPath);
if (!video.isFile()) throw new Error(`Video not found: ${videoPath}`);

console.log(
  JSON.stringify(
    {
      video: videoPath,
      sizeMB: Number((video.size / 1024 / 1024).toFixed(2)),
      ...metadata,
    },
    null,
    2
  )
);

if (dryRun) {
  console.log("Dry run complete. No YouTube request was made.");
  process.exit(0);
}

const accessToken = await readAccessToken(args.get("token-file"));
const initiationUrl = new URL(
  "https://www.googleapis.com/upload/youtube/v3/videos"
);
initiationUrl.searchParams.set("uploadType", "resumable");
initiationUrl.searchParams.set("part", "snippet,status");

const initiation = await fetch(initiationUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Length": String(video.size),
    "X-Upload-Content-Type": "video/mp4",
  },
  body: JSON.stringify(metadata),
});

if (!initiation.ok) {
  throw await youtubeError("Could not start the YouTube upload", initiation);
}

const uploadUrl = initiation.headers.get("location");
if (!uploadUrl) {
  throw new Error("YouTube did not return a resumable upload URL");
}

console.log(`Uploading ${Number((video.size / 1024 / 1024).toFixed(2))} MB...`);
const upload = await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    "Content-Length": String(video.size),
    "Content-Type": "video/mp4",
  },
  body: createReadStream(videoPath),
  duplex: "half",
});

if (!upload.ok) {
  throw await youtubeError("YouTube upload failed", upload);
}

const result = await upload.json();
const effectivePrivacy = result.status?.privacyStatus || "unknown";
console.log(`Uploaded: https://youtu.be/${result.id}`);
console.log(`YouTube privacy status: ${effectivePrivacy}`);

if (privacyStatus === "public" && effectivePrivacy !== "public") {
  console.warn(
    "YouTube did not publish the video publicly. New unaudited API projects force API uploads to private."
  );
}

async function readAccessToken(tokenFile) {
  if (process.env.YOUTUBE_ACCESS_TOKEN?.trim()) {
    return process.env.YOUTUBE_ACCESS_TOKEN.trim();
  }
  if (!tokenFile) {
    throw new Error(
      "Set YOUTUBE_ACCESS_TOKEN or provide --token-file=C:\\path\\youtube-access-token.txt"
    );
  }

  const raw = (await readFile(path.resolve(tokenFile), "utf8")).trim();
  if (!raw) throw new Error("The YouTube access-token file is empty");

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.access_token === "string" && parsed.access_token.trim()) {
      return parsed.access_token.trim();
    }
  } catch {
    // A plain-text OAuth access token is also supported.
  }
  return raw;
}

async function youtubeError(prefix, response) {
  const body = await response.text();
  let message = body;
  try {
    const parsed = JSON.parse(body);
    message = parsed.error?.message || parsed.error_description || body;
  } catch {
    // Preserve a non-JSON response for diagnostics.
  }
  return new Error(`${prefix} (${response.status}): ${message}`);
}
