import connectDb from "@/db/connectDb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtpMail } from "@/lib/mailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const usernameRaw = body.username?.trim();
    const username = usernameRaw ? usernameRaw.toLowerCase() : undefined;

    if (!email || !username) {
      return Response.json({ error: "Email and username are required" }, { status: 400 });
    }

    await connectDb();

    // Check username availability
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return Response.json({ error: "Username already taken" }, { status: 409 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email, username });
    await Otp.create({
      email,
      username,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpMail(email, otp, "signup");

    return Response.json({ success: true });
  } catch (err) {
    console.error("SIGNUP OTP ERROR:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
