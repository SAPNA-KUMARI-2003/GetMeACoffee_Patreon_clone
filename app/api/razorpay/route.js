export const runtime = "nodejs";

import connectDb from "@/db/connectDb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(req) {
  try {
    await connectDb();

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // Debug mode: enabled when DEBUG_RAZORPAY=true or not in production
    const debug = process.env.DEBUG_RAZORPAY === "true" || process.env.NODE_ENV !== "production";
    if (debug) console.log("RAZORPAY VERIFY REQUEST:", { body });

    // 1️⃣ Find payment
    const payment = await Payment.findOne({ oid: razorpay_order_id });
    if (!payment) {
      const resp = { success: false, message: "Order not found" };
      if (debug) resp.debug = { razorpay_order_id };
      return Response.json(resp, { status: 404 });
    }

    // 2️⃣ Get receiver's Razorpay secret
    const user = await User.findOne({ username: payment.to_user });
    if (!user) {
      const resp = { success: false, message: "User not found" };
      if (debug) resp.debug = { to_user: payment?.to_user };
      return Response.json(resp, { status: 404 });
    }

    // 3️⃣ Validate required fields and receiver secret
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const resp = { success: false, message: "Missing payment fields" };
      if (debug) resp.debug = { razorpay_order_id, razorpay_payment_id, razorpay_signature_present: Boolean(razorpay_signature) };
      return Response.json(resp, { status: 400 });
    }

    // Prefer the user's configured secret, fall back to global env for convenience/testing
    const receiverSecret = user.razorpaysecret || process.env.razorpaysecret;
    if (!receiverSecret) {
      console.error("PAYMENT VERIFY ERROR: missing receiver razorpay secret for user", user.username);
      const resp = { success: false, message: "Receiver missing razorpay secret" };
      if (debug) resp.debug = { to_user: user.username, env_has_secret: Boolean(process.env.razorpaysecret) };
      return Response.json(resp, { status: 400 });
    }

    // 4️⃣ Verify signature using HMAC SHA256 (order_id|payment_id)
    try {
      if (!user.razorpaysecret && process.env.razorpaysecret) {
        console.warn("PAYMENT VERIFY: using global env secret for user", user.username);
      }

      const generatedSignature = crypto
        .createHmac("sha256", receiverSecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.warn("PAYMENT VERIFY WARNING: signature mismatch for order", razorpay_order_id);
        const resp = { success: false, message: "Payment verification failed" };
        if (debug) resp.debug = { razorpay_order_id, to_user: user.username, used_secret: user.razorpaysecret ? 'user' : (process.env.razorpaysecret ? 'env' : 'none') };
        return Response.json(resp, { status: 400 });
      }
    } catch (e) {
      console.error("PAYMENT VERIFY ERROR (signature check):", e);
      return Response.json(
        { success: false, message: "Signature verification error" },
        { status: 500 }
      );
    }

    // Success: signature validated
    console.log("PAYMENT VERIFIED:", razorpay_order_id);

    // 5️⃣ Mark payment as done
    const updated = await Payment.findOneAndUpdate(
      { oid: razorpay_order_id },
      { done: true }
    );

    if (!updated) {
      console.error("PAYMENT VERIFY ERROR: failed to mark payment done for order", razorpay_order_id);
      const resp = { success: false, message: "Failed to update payment status" };
      if (debug) resp.debug = { razorpay_order_id, to_user: payment?.to_user };
      return Response.json(resp, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    const resp = { success: false, message: "Server error" };
    if (debug) resp.debug = { error: err.message }; 
    return Response.json(resp, { status: 500 });
  }
}
