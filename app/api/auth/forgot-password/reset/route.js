import connectDb from "@/db/connectDb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();

    // ✅ normalize email and read username (case-insensitive)
    const email = body.email?.trim().toLowerCase();
    const usernameRaw = body.username?.trim();
    const username = usernameRaw ? usernameRaw.toLowerCase() : undefined;
    const { otp, newPassword } = body;

    console.log("RAW EMAIL:", JSON.stringify(email), "USERNAME:", JSON.stringify(usernameRaw));

    // ✅ Basic validation
    if (!email || !username || !otp || !newPassword) {
      return Response.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectDb();

    // helper to escape regex
    const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ✅ Check OTP and that it was issued for this username (case-insensitive)
    let record = await Otp.findOne({ email, username, otp });
    console.log("OTP RECORD FOUND (email+username):", !!record);

    // fallback: if we didn't find a record that included username (legacy), try without username
    if (!record) {
      record = await Otp.findOne({ email, otp });
      console.log("OTP RECORD FOUND (fallback by email+otp):", !!record);

      if (record && record.username && record.username.toLowerCase() !== username) {
        return Response.json({ error: "Invalid OTP or username/email mismatch" }, { status: 400 });
      }

      if (!record) {
        return Response.json({ error: "Invalid OTP or username/email mismatch" }, { status: 400 });
      }
    }

    if (record.expiresAt < new Date()) {
      return Response.json({ error: "OTP expired" }, { status: 400 });
    }

    // ✅ Check user exists with matching email + username (case-insensitive)
    const user = await User.findOne({
      email,
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    });
    console.log("USER FOUND (email+username):", !!user);

    if (!user) {
      return Response.json({ error: "User not found with provided email and username" }, { status: 400 });
    }

    // ✅ Hash password
    const hashed = await bcrypt.hash(newPassword, 10);

    // ✅ Update password (match both email and username case-insensitive)
    await User.updateOne({
      email,
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    }, { password: hashed });

    // ✅ Remove OTPs for this email (and username if present)
    await Otp.deleteMany({ email });

    return Response.json({ success: true });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return Response.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
