export const runtime = "nodejs";
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  try {
    // Basic env sanity check
    console.log("UPLOAD API - cloudinary config", {
      cloud: process.env.CLOUDINARY_CLOUD_NAME,
      key: !!process.env.CLOUDINARY_API_KEY,
      secret: !!process.env.CLOUDINARY_API_SECRET,
    });

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const msg = "Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.";
      console.error("UPLOAD API - missing cloudinary env:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("UPLOAD API - received file", { name: file.name, type: file.type, size: file.size });

    // simple size/type guards
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size && file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type (image required)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Retry helper: attempt upload up to N times on transient errors like timeouts
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const uploadOnce = () =>
      new Promise((resolve, reject) => {
        let settled = false;
        try {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "getmeacoffee" },
            (err, result) => {
              if (settled) return;
              settled = true;
              if (err) {
                console.error("CLOUDINARY UPLOAD ERROR (callback):", {
                  message: err?.message,
                  http_code: err?.http_code,
                  name: err?.name,
                });
                return reject(err);
              }
              resolve(result);
            }
          );

          stream.on("error", (streamErr) => {
            if (settled) return;
            settled = true;
            console.error("CLOUDINARY STREAM ERROR:", streamErr);
            reject(streamErr);
          });

          stream.end(buffer);
        } catch (e) {
          if (settled) return;
          settled = true;
          console.error("CLOUDINARY UPLOAD EXCEPTION:", e);
          reject(e);
        }
      });

    let uploadResponse = null;
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`UPLOAD API - cloudinary attempt ${attempt}`);
        uploadResponse = await uploadOnce();
        break;
      } catch (err) {
        // If final attempt, rethrow
        const isTimeout = err && (err.http_code === 499 || err.name === "TimeoutError");
        console.warn("CLOUDINARY attempt failed", { attempt, msg: err?.message, http_code: err?.http_code });
        if (attempt === MAX_ATTEMPTS) throw err;
        // Exponential backoff
        const backoff = 500 * Math.pow(2, attempt - 1);
        await sleep(backoff);
      }
    }

    if (!uploadResponse || !uploadResponse.secure_url) {
      const msg = 'Upload did not return a secure_url';
      console.error('UPLOAD API - no secure_url:', uploadResponse);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log("UPLOAD SUCCESS:", uploadResponse.secure_url);

    return NextResponse.json({ url: uploadResponse.secure_url });
  } catch (error) {
    console.error("UPLOAD API ERROR:", error?.message || error, error);
    const message = (error && (error.message || error.error || JSON.stringify(error))) || "Upload failed";
    // If cloudinary provides an http_code, forward it; otherwise use 500
    const status = (error && error.http_code && Number(error.http_code)) || 500;
    return NextResponse.json({ error: message }, { status });
  }
}
