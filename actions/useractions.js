"use server";

import Razorpay from "razorpay";
import connectDb from "@/db/connectDb";
import User from "@/models/User";
import Payment from "@/models/Payment";

/* ---------------- PAYMENT ---------------- */

export const initiate = async (amount, to_username, paymentform) => {
  try {
    await connectDb();

    // Use the robust lookup helper so we accept normalized, case-insensitive and email lookups
    const user = await fetchuser(to_username);
    console.log("initiate - lookup result for", to_username, user ? { username: user.username, razorpayid: user.razorpayid ? 'present' : 'missing' } : null);

    if (!user) {
      const msg = "Recipient user not found";
      console.error("initiate:", msg, { to_username });
      return { error: msg };
    }

    if (!user.razorpayid) {
      const msg = "Recipient has not configured Razorpay (missing key id)";
      console.error("initiate:", msg, { to_username, user });
      return { error: msg };
    }

    const key_secret = user.razorpaysecret || process.env.razorpaysecret;
    if (!key_secret) {
      const msg = "Recipient missing Razorpay secret";
      console.error("initiate:", msg, { to_username, user });
      return { error: msg };
    }

    const instance = new Razorpay({
      key_id: user.razorpayid,
      key_secret,
    });

    let order;
    try {
      order = await instance.orders.create({
        amount: Number(amount),
        currency: "INR",
      });
      console.log("initiate: created razorpay order", { order_id: order?.id, to_username });
    } catch (err) {
      console.error("initiate: razorpay order creation failed", err);
      return { error: "Razorpay order creation failed", detail: err?.message || String(err) };
    }

    try {
      await Payment.create({
        oid: order.id,
        amount: amount / 100,
        to_user: to_username,
        name: paymentform.name,
        message: paymentform.message,
      });
    } catch (err) {
      console.error("initiate: failed to persist payment record", err);
      return { error: "Failed to create payment record", detail: err?.message || String(err) };
    }

    return order;
  } catch (err) {
    console.error("initiate error:", err);
    return { error: "Server error while creating order", detail: err?.message };
  }
};

/* ---------------- FETCH USER ---------------- */

export const fetchuser = async (username) => {
  await connectDb();
  if (!username) return null;

  const raw = String(username).trim();
  const normalize = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase().replace(/\s+/g, '-')
  const normalized = normalize(raw);

  // Try normalized lookup first
  let u = await User.findOne({ username: normalized });
  if (!u && raw !== normalized) {
    // Try exact raw
    u = await User.findOne({ username: raw });
  }

  if (!u) {
    // case-insensitive exact match
    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    u = await User.findOne({ username: { $regex: `^${esc}$`, $options: 'i' } })
  }

  if (!u && raw.includes('@')) {
    u = await User.findOne({ email: raw });
  }

  if (!u && /^[0-9a-fA-F]{24}$/.test(raw)) {
    try {
      u = await User.findById(raw);
    } catch (e) {
      // ignore invalid id
    }
  }

  if (!u) return null;

  const obj = u.toObject ? u.toObject() : u;
  obj._id = String(obj._id);
  if (obj.createdAt) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt) obj.updatedAt = obj.updatedAt.toISOString();
  return obj;
};

/* ---------------- FETCH PAYMENTS ---------------- */

export const fetchpayments = async (username) => {
  await connectDb();
  const payments = await Payment.find({ to_user: username, done: true })
    .sort({ amount: -1 })
    .limit(10)
    .lean();
  // Convert ObjectId and Date instances to plain strings to avoid passing BSON objects to client
  return payments.map((p) => ({
    ...p,
    _id: String(p._id),
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : p.createdAt,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : p.updatedAt,
  }));
};

/* ---------------- UPDATE PROFILE (✅ CORRECTED) ---------------- */
/*
  IMPORTANT:
  - This function now ONLY receives STRINGS (URLs)
  - NO File handling
  - NO Cloudinary here
*/

export const updateProfile = async (data, oldusername) => {
  await connectDb();

  // Accept either a plain object (from client) or a FormData instance
  let ndata;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    ndata = Object.fromEntries(data);
  } else if (data && typeof data === 'object') {
    ndata = data;
  } else {
    ndata = {};
  }

  console.log("updateProfile - incoming profilepic:", ndata.profilepic);
  console.log("updateProfile - incoming coverpic:", ndata.coverpic);

  const updateObj = {
    name: ndata.name,
    email: ndata.email,
    username: ndata.username,
    profilepic: ndata.profilepic || undefined, // URL string
    coverpic: ndata.coverpic || undefined,     // URL string
    razorpayid: ndata.razorpayid,
    razorpaysecret: ndata.razorpaysecret,
  };

  // Username normalization & validation
  if (updateObj.username && updateObj.username !== oldusername) {
    updateObj.username = String(updateObj.username)
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/\s+/g, "-");

    const exists = await User.findOne({ username: updateObj.username });
    if (exists) return { error: "Username already exists" };
  }

  const updated = await User.findOneAndUpdate(
    { username: oldusername },
    { $set: updateObj },
    { new: true }
  );

  if (!updated) return { error: "User not found" };

  // Update payments if username changed
  if (updateObj.username && updateObj.username !== oldusername) {
    await Payment.updateMany(
      { to_user: oldusername },
      { to_user: updateObj.username }
    );
  }

  // Convert updated user to a plain object with simple values
  const userObj = updated.toObject ? updated.toObject() : updated;
  userObj._id = String(userObj._id);
  if (userObj.createdAt) userObj.createdAt = userObj.createdAt.toISOString();
  if (userObj.updatedAt) userObj.updatedAt = userObj.updatedAt.toISOString();

  console.log("updateProfile - saved for user:", {
    username: userObj.username,
    profilepic: userObj.profilepic,
    coverpic: userObj.coverpic,
  });

  return { success: true, user: userObj };
};
