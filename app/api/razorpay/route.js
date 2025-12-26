export const runtime = "nodejs";

import connectDb from "@/db/connectDb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

export async function POST(req) {
  try {
    await connectDb();

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // 1️⃣ Find payment
    const payment = await Payment.findOne({ oid: razorpay_order_id });
    if (!payment) {
      return Response.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Get receiver's Razorpay secret
    const user = await User.findOne({ username: payment.to_user });
    if (!user) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 3️⃣ Verify signature
    const isValid = validatePaymentVerification(
      {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      },
      razorpay_signature,
      user.razorpaysecret
    );

    if (!isValid) {
      return Response.json(
        { success: false, message: "Payment verification failed" },
        { status: 400 }
      );
    }

    // 4️⃣ Mark payment as done
    await Payment.findOneAndUpdate(
      { oid: razorpay_order_id },
      { done: true }
    );

    return Response.json({ success: true });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    return Response.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
