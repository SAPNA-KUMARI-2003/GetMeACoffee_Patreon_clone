"use client";
import React, { useEffect, useState } from "react";
import Script from "next/script";
import { fetchuser, fetchpayments, initiate } from "@/actions/useractions";
import { useSearchParams, useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Bounce } from "react-toastify";

const PaymentPage = ({ username }) => {
  const [paymentform, setPaymentform] = useState({
    name: "",
    message: "",
    amount: "",
  });

  const [currentUser, setcurrentUser] = useState({});
  const [payments, setPayments] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  /* ---------- FETCH DATA ---------- */
  useEffect(() => {
    getData();
  }, []);

  /* ---------- REDIRECT ONLY AFTER PAYMENT ---------- */
  const paymentEnabled = Boolean(currentUser?.razorpayid);

  useEffect(() => {
    if (searchParams.get("paymentdone") === "true") {
      toast("Thanks for your donation!", { transition: Bounce });
      router.push(`/${currentUser?.username || username}`);
    }
  }, [searchParams, router, username, currentUser]);

  // If the page failed to load, show a clear message and stop rendering the rest
  if (loadError) {
    return (
      <>
        <ToastContainer />
        <div className="p-8 text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">{loadError}</h2>
          <p className="mb-4">This user page could not be loaded.</p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  const getData = async () => {
    try {
      const u = await fetchuser(username);
      if (!u) {
        setLoadError("User not found");
        return;
      }
      setcurrentUser(u);

      const dbpayments = await fetchpayments(username);
      setPayments(dbpayments);
    } catch (err) {
      console.error("Failed to load payment page data", err);
      setLoadError("Failed to load data");
    }
  };

  const handleChange = (e) => {
    setPaymentform({ ...paymentform, [e.target.name]: e.target.value });
  };

  /* ---------- PAY FUNCTION (LOGIC FIXED) ---------- */
  const pay = async (amount) => {
    if (!window.Razorpay) {
      toast.error("Payment SDK not loaded. Refresh page.");
      return;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (!currentUser?.razorpayid) {
      toast.error("Razorpay key missing");
      return;
    }

    let order;
    try {
      order = await initiate(amount, username, paymentform);
    } catch (err) {
      toast.error("Failed to create order");
      return;
    }

    if (!order?.id) {
      toast.error("Invalid order response");
      return;
    }

    const options = {
      key: currentUser.razorpayid,
      amount: amount,
      currency: "INR",
      name: "Get Me A Coffee",
      description: "Test Transaction",
      order_id: order.id,
      callback_url: `${process.env.NEXT_PUBLIC_URL}/api/razorpay`,
      theme: { color: "#3399cc" },
    };

    const rzp1 = new window.Razorpay(options);
    rzp1.open();
  };

  return (
    <>
      <ToastContainer />
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      {/* ---------------- UI ---------------- */}

      <div className="cover w-full bg-red-50 relative">
        <img
          className="object-cover w-full h-48 md:h-[350px] shadow-blue-700 shadow-sm"
          src={
            currentUser.coverpic ||
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350"><rect fill="%23e2e8f0" width="1200" height="350"/><text x="600" y="185" fill="%236b7280" font-family="Arial" font-size="36" text-anchor="middle">No Cover</text></svg>'
          }
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350"><rect fill="%23e2e8f0" width="1200" height="350"/><text x="600" y="185" fill="%236b7280" font-family="Arial" font-size="36" text-anchor="middle">No Cover</text></svg>';
          }}
          alt=""
        />
        <div className="absolute -bottom-20 right-[33%] md:right-[46%] border-white overflow-hidden border-2 rounded-full size-36">
          <img
            className="rounded-full object-cover size-36"
            src={currentUser.profilepic || "avatar.gif"}
            alt=""
          />
        </div>
      </div>

      <div className="info flex justify-center items-center my-24 mb-32 flex-col gap-2">
        <div className="font-bold text-lg">
          @{currentUser?.username || username}
        </div>
        <div className="text-slate-400">
          Lets help {currentUser?.username || username} get a Coffee!
        </div>
        <div className="text-slate-400">
          {payments.length} Payments · ₹
          {payments.reduce((a, b) => a + (b?.amount || 0), 0)} raised
        </div>

        <div className="payment flex gap-3 w-[80%] mt-11 flex-col md:flex-row">
          <div className="supporters w-full md:w-1/2 bg-slate-900 rounded-lg text-white px-2 md:p-10">
            <h2 className="text-2xl font-bold my-5">Top 10 Supporters</h2>
            <ul className="mx-5 text-lg">
              {payments.length === 0 && <li>No payments yet</li>}
              {payments.map((p, i) => (
                <li key={i} className="my-4 flex gap-2 items-center">
                  <img width={33} src="avatar.gif" alt="" />
                  <span>
                    {p.name} donated <b>₹{p.amount}</b> with message “
                    {p.message}”
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="makePayment w-full md:w-1/2 bg-slate-900 rounded-lg text-white px-2 md:p-10">
            <h2 className="text-2xl font-bold my-5">Make a Payment</h2>

            {!paymentEnabled && (
              <div className="text-yellow-400 mb-4">
                This user hasn't set up payments yet.
              </div>
            )}

            <div className="flex gap-2 flex-col">
              <input
                onChange={handleChange}
                value={paymentform.name}
                name="name"
                type="text"
                className="w-full p-3 rounded-lg bg-slate-800"
                placeholder="Enter Name"
              />

              <input
                onChange={handleChange}
                value={paymentform.message}
                name="message"
                type="text"
                className="w-full p-3 rounded-lg bg-slate-800"
                placeholder="Enter Message"
              />

              <input
                onChange={handleChange}
                value={paymentform.amount}
                name="amount"
                type="number"
                className="w-full p-3 rounded-lg bg-slate-800"
                placeholder="Enter Amount"
              />

              <button
                onClick={() => pay(Number(paymentform.amount) * 100)}
                disabled={!paymentEnabled}
                className={`text-white bg-gradient-to-br from-purple-900 to-blue-900 font-medium rounded-lg px-5 py-2.5 ${
                  !paymentEnabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Pay
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-2 mt-5">
              <button
                onClick={() => pay(1000)}
                disabled={!paymentEnabled}
                className={`bg-slate-800 p-3 rounded-lg ${
                  !paymentEnabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Pay ₹10
              </button>
              <button
                onClick={() => pay(2000)}
                disabled={!paymentEnabled}
                className={`bg-slate-800 p-3 rounded-lg ${
                  !paymentEnabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Pay ₹20
              </button>
              <button
                onClick={() => pay(3000)}
                disabled={!paymentEnabled}
                className={`bg-slate-800 p-3 rounded-lg ${
                  !paymentEnabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Pay ₹30
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
