import nodemailer from "nodemailer";

export const sendOtpMail = async (email, otp, purpose) => {
  console.log("MAILER ENV CHECK:", {
    user: process.env.EMAIL_USER,
    passExists: !!process.env.EMAIL_PASS,
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Get Me A Coffee" <${process.env.EMAIL_USER}>`,
    to: email,
    subject:
      purpose === "signup" ? "Verify your email (OTP)" : "Reset password (OTP)",
    text: `Your OTP is ${otp}`,
  });
};
