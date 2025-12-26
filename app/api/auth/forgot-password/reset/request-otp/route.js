import connectDb from "@/db/connectDb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtpMail } from "@/lib/mailer";

export async function POST(req) {
  try {
    const body = await req.json();

    // ✅ NORMALIZE EMAIL and read username (case-insensitive)
    const email = body.email?.trim().toLowerCase();
    const usernameRaw = body.username?.trim();
    const username = usernameRaw ? usernameRaw.toLowerCase() : undefined;

    console.log("FORGOT PASSWORD EMAIL:", JSON.stringify(email), "USERNAME:", JSON.stringify(usernameRaw));

    if (!email || !username) {
      return Response.json({ error: "Email and username are required" }, { status: 400 });
    }

    await connectDb();

    // helper to escape regex
    const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ✅ USER LOOKUP by email + username (case-insensitive)
    const user = await User.findOne({
      email,
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    });

    console.log("USER FOUND (email+username):", !!user);

    if (!user) {
      return Response.json({ error: "No user found with provided email and username" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email, username });

    await Otp.create({
      email,
      username,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpMail(email, otp, "forgot");

    return Response.json({ success: true });
  } catch (err) {
    console.error("FORGOT PASSWORD REQUEST OTP ERROR:", err);
    return Response.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
