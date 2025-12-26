import connectDb from "@/db/connectDb";
import Otp from "@/models/Otp";
import bcrypt from "bcryptjs";
import User from "@/models/User";

export async function POST(req) {
  const { email, otp, username, password } = await req.json();
  await connectDb();

  const record = await Otp.findOne({ email, otp });

  if (!record || record.expiresAt < new Date()) {
    return Response.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  // 🔴 THIS IS YOUR EXISTING SIGNUP LOGIC (UNCHANGED)
  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    email,
    username, // untouched
    password: hashed,
  });

  await Otp.deleteMany({ email });

  return Response.json({ success: true });
}
