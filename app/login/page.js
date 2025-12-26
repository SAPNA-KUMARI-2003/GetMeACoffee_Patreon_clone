"use client";
import React, { useEffect, useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const Login = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState("form"); // 'form' | 'otp'
  const [otp, setOtp] = useState("");

  const [forgot, setForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const requestSignupOtp = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    setSignupUsernameError("");

    if (!form.email?.trim() || !form.username?.trim()) {
      setSignupUsernameError("Please enter username and email");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, username: form.username }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (res.status === 409) {
          // username taken
          const errMsg = data.error || "Username already taken";
          setSignupUsernameError(errMsg);
          setMessage({ type: "error", text: errMsg });
          if (usernameRef?.current) usernameRef.current.focus();
        } else {
          setMessage({
            type: "error",
            text: data.error || "Failed to send OTP",
          });
        }
        setLoading(false);
        return;
      }

      setStep("otp");
      setResendTimer(30);
      setMessage({ type: "success", text: "OTP sent to your email" });
    } catch {
      setMessage({ type: "error", text: "Failed to send OTP" });
    }

    setLoading(false);
  };

  const [resendTimer, setResendTimer] = useState(0);
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer === 0) return;

    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (forgotResendTimer === 0) return;

    const interval = setInterval(() => {
      setForgotResendTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [forgotResendTimer]);

  useEffect(() => {
    document.title = "Login - Get Me A Coffee";
    if (session) router.push("/dashboard");
  }, [session, router]);

  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [form, setForm] = useState({
    email: "", // ✅ NEW
    username: "",
    password: "",
    confirm: "",
    razorpayid: "",
    razorpaysecret: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [signupUsernameError, setSignupUsernameError] = useState("");
  const usernameRef = useRef(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async () => {
    setMessage({ type: "", text: "" });

    if (!form.username || !form.password)
      return setMessage({ type: "error", text: "Please fill in both fields." });

    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      username: form.username,
      password: form.password,
    });
    setLoading(false);

    if (res?.ok) router.push("/dashboard");
    else
      setMessage({
        type: "error",
        text: res?.error || "Login failed. Check credentials.",
      });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setSignupUsernameError("");

    if (!form.username || !form.password || !form.confirm)
      return setMessage({ type: "error", text: "Please fill all fields." });
    if (form.password !== form.confirm)
      return setMessage({ type: "error", text: "Passwords do not match." });

    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          razorpayid: form.razorpayid,
          razorpaysecret: form.razorpaysecret,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setMessage({
          type: "success",
          text: "Account created — please log in.",
        });
        setMode("login");
        setForm({ username: form.username, password: "", confirm: "" });
      } else {
        // specifically handle username already taken
        if (r.status === 409) {
          const errMsg = data.message || "Username already taken";
          setSignupUsernameError(errMsg);
          setMessage({ type: "error", text: errMsg });
          // focus username input for ease of correction
          if (usernameRef?.current) usernameRef.current.focus();
        } else {
          setMessage({
            type: "error",
            text: data.message || "Sign up failed.",
          });
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: "Sign up failed." });
    }
    setLoading(false);
  };

  const verifyOtpAndSignup = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          otp,
          username: form.username,
          password: form.password,
          razorpayid: form.razorpayid,
          razorpaysecret: form.razorpaysecret,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessage({
          type: "error",
          text: data.error || "Invalid OTP",
        });
        setLoading(false);
        return;
      }

      setMessage({
        type: "success",
        text: "Signup successful. Please login.",
      });

      // reset state
      setMode("login");
      setStep("form");
      setOtp("");
      setForm({
        email: "",
        username: "",
        password: "",
        confirm: "",
        razorpayid: "",
        razorpaysecret: "",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: "Signup failed! Username is already taken",
      });
    }

    setLoading(false);
  };

  const requestForgotOtp = async () => {
    if (!forgotEmail.trim() || !forgotUsername.trim()) {
      alert("Please enter both your username and registered email");
      return false;
    }

    try {
      const r = await fetch("/api/auth/forgot-password/reset/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          username: forgotUsername.trim(),
        }),
      });

      const text = await r.text();
      let d = {};
      try {
        d = text ? JSON.parse(text) : {};
      } catch {
        d = { error: "Unexpected server response" };
      }

      if (!r.ok) {
        alert(d.error || "Failed to send OTP");
        return false;
      }

      setForgotResendTimer(30);
      return true;
    } catch {
      alert("Failed to send OTP");
      return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl w-full bg-white/5 backdrop-blur rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 md:p-12 text-white bg-gradient-to-b from-purple-700 to-blue-700">
          <h2 className="text-3xl font-bold mb-4">Welcome back ☕</h2>
          <p className="text-slate-100/90 mb-6">
            Sign in to support creators and make a difference — a Coffee at a
            time.
          </p>
          <ul className="text-sm space-y-2 opacity-90">
            <li>✅ Fast donations</li>
            <li>✅ Follow creators</li>
            <li>✅ Secure payments</li>
          </ul>
        </div>

        <div className="p-8 md:p-12 bg-white">
          <div className="max-w-md mx-auto">
            <h3 className="text-2xl font-bold mb-2 text-slate-900">
              {mode === "login" ? "Sign in" : "Create account"}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Use your username and password to continue.
            </p>

            {message.text && (
              <div
                className={`mb-4 p-3 rounded ${
                  message.type === "error"
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
                role="alert"
                aria-live="polite"
              >
                {message.text}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === "login") return handleLogin();
                if (step === "form") return requestSignupOtp();
                if (step === "otp") return verifyOtpAndSignup();
              }}
              className="space-y-4"
            >
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    type="email"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  ref={usernameRef}
                  name="username"
                  value={form.username}
                  onChange={(e) => {
                    setForm({ ...form, username: e.target.value });
                    setSignupUsernameError("");
                    setMessage({ type: "", text: "" });
                  }}
                  className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black ${
                    signupUsernameError ? "border-red-500" : ""
                  }`}
                  placeholder="your-username"
                />
                {mode === "signup" && signupUsernameError && (
                  <p className="text-sm text-red-600 mt-1">
                    {signupUsernameError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type="password"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                  placeholder="••••••••"
                />
              </div>

              {mode === "signup" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Confirm password
                    </label>
                    <input
                      name="confirm"
                      value={form.confirm}
                      onChange={handleChange}
                      type="password"
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                      placeholder="Repeat password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Razorpay Key (ID)
                    </label>
                    <input
                      name="razorpayid"
                      value={form.razorpayid}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                      placeholder="rzp_test_..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Razorpay Secret
                    </label>
                    <input
                      name="razorpaysecret"
                      value={form.razorpaysecret}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                      placeholder="secret"
                    />
                  </div>

                  {step === "otp" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Enter OTP
                      </label>
                      <input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
                        placeholder="6-digit OTP"
                      />
                    </div>
                  )}

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={requestSignupOtp}
                      disabled={resendTimer > 0 || loading}
                      className="text-sm text-indigo-600 hover:underline disabled:text-gray-400"
                    >
                      {resendTimer > 0
                        ? `Resend OTP in ${resendTimer}s`
                        : "Resend OTP"}
                    </button>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between flex-col md:flex-row gap-4 md:gap-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign in"
                    : "Create account"}
                </button>

                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode(mode === "login" ? "signup" : "login");
                    setMessage({ type: "", text: "" });
                  }}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {mode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </Link>
              </div>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </form>

            {forgot && (
              <div className="mt-6 space-y-4">
                {forgotStep === 1 && (
                  <>
                    <input
                      name="username"
                      placeholder="Enter your username"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      className="w-full border px-3 py-2 rounded text-black mb-2"
                    />

                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full border px-3 py-2 rounded text-black"
                    />
                    <button
                      onClick={async () => {
                        if (forgotResendTimer > 0) return;
                        if (!forgotEmail.trim() || !forgotUsername.trim()) {
                          alert(
                            "Please enter both your username and registered email"
                          );
                          return;
                        }

                        // start cooldown immediately to prevent rapid clicks
                        setForgotResendTimer(30);

                        const ok = await requestForgotOtp();
                        if (!ok) {
                          // reset timer on failure
                          setForgotResendTimer(0);
                          return;
                        }

                        setForgotStep(2);
                      }}
                      disabled={forgotResendTimer > 0}
                      className="w-full bg-indigo-600 text-white py-2 rounded disabled:opacity-60"
                    >
                      {forgotResendTimer > 0
                        ? `Send OTP (${forgotResendTimer}s)`
                        : "Send OTP"}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await requestForgotOtp();
                      }}
                      disabled={forgotResendTimer > 0}
                      className="text-sm text-indigo-600 hover:underline mt-2"
                    >
                      {forgotResendTimer > 0
                        ? `Resend OTP in ${forgotResendTimer}s`
                        : "Resend OTP"}
                    </button>
                  </>
                )}

                {forgotStep === 2 && (
                  <>
                    <input
                      placeholder="Enter OTP"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full border px-3 py-2 rounded text-black"
                    />

                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border px-3 py-2 rounded text-black"
                    />

                    <button
                      onClick={async () => {
                        const r = await fetch(
                          "/api/auth/forgot-password/reset",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: forgotEmail.trim().toLowerCase(),
                              username: forgotUsername.trim(),
                              otp: forgotOtp,
                              newPassword,
                            }),
                          }
                        );
                        const text = await r.text();

                        let d = {};
                        try {
                          d = text ? JSON.parse(text) : {};
                        } catch {
                          d = { error: "Unexpected server response" };
                        }

                        if (!r.ok) {
                          alert(d.error || "Failed to reset password");
                          return;
                        }

                        alert("Password updated. Please login.");
                        setForgot(false);
                        setForgotStep(1);
                      }}
                      className="w-full bg-green-600 text-white py-2 rounded"
                    >
                      Reset Password
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-500 hover:underline">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
