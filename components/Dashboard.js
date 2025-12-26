"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchuser, updateProfile } from "@/actions/useractions";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Bounce } from "react-toastify";

const Dashboard = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [form, setform] = useState({});

  useEffect(() => {
    if (!session) {
      router.push("/login");
    } else {
      getData();
    }
  }, [session]);

  const getData = async () => {
    const u = await fetchuser(session.user.name);
    if (u) setform(u);
  };

  const handleChange = (e) => {
    setform({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    console.log("Dashboard - file selected", { field: e.target.name, name: file?.name, size: file?.size, type: file?.type });
    if (!file) return;

    setform({ ...form, [e.target.name]: file });
  };

  const saveProfile = async () => {
    // Build a plain object payload (server action serialization is more reliable with plain objects)
    const payload = {};

    try {
      // upload profile pic
      if (form.profilepic instanceof File) {
        const profileUrl = await uploadImage(form.profilepic);
        payload.profilepic = profileUrl;
      } else if (typeof form.profilepic === 'string') {
        payload.profilepic = form.profilepic;
      }

      // upload cover pic
      if (form.coverpic instanceof File) {
        const coverUrl = await uploadImage(form.coverpic);
        payload.coverpic = coverUrl;
      } else if (typeof form.coverpic === 'string') {
        payload.coverpic = form.coverpic;
      }
    } catch (err) {
      toast.error(err.message || "Image upload failed");
      return { error: err.message || "Image upload failed" };
    }

    // append other fields (skip File objects)
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'profilepic' || key === 'coverpic') return; // already handled
      if (value instanceof File) return;
      payload[key] = value;
    });

    console.log('saveProfile - payload to send', payload);

    const res = await updateProfile(payload, session.user.name);

    if (res?.error) {
      toast.error(res.error);
      return res;
    }

    toast.success("Profile updated");
    // update local form state with saved user so profile/cover URLs display immediately
    if (res?.user) setform(res.user);
    return res;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveProfile();
  };

  // Resize images over 1MB to avoid upload timeouts (client-side)
  const resizeImage = async (file, maxWidth = 1200, quality = 0.8) => {
    try {
      if (!file || !(file instanceof File)) return file;
      if (file.size <= 1024 * 1024) return file; // keep small files as is

      // Use createImageBitmap when available for performance
      let imgBitmap;
      if (typeof createImageBitmap === "function") {
        imgBitmap = await createImageBitmap(file);
      } else {
        imgBitmap = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => {
            // draw to canvas
            const cvs = document.createElement("canvas");
            cvs.width = img.width;
            cvs.height = img.height;
            const ctx = cvs.getContext("2d");
            ctx.drawImage(img, 0, 0);
            createImageBitmap(cvs)
              .then(res)
              .catch(rej);
          };
          img.onerror = rej;
          img.src = URL.createObjectURL(file);
        });
      }

      const ratio = Math.min(1, maxWidth / imgBitmap.width);
      if (ratio === 1) return file;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(imgBitmap.width * ratio);
      canvas.height = Math.round(imgBitmap.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((res) => canvas.toBlob(res, file.type, quality));
      if (!blob) return file;
      return new File([blob], file.name, { type: file.type });
    } catch (err) {
      // On any failure, just return the original file
      console.warn("resizeImage failed, using original file", err);
      return file;
    }
  };

  const uploadImage = async (file) => {
    const toUpload = await resizeImage(file);

    const fd = new FormData();
    fd.append("file", toUpload);

    // Try multiple attempts from client as well
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log("uploadImage - attempt", attempt, { name: toUpload.name, size: toUpload.size });
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      }).catch((err) => {
        console.warn("uploadImage fetch failed", { attempt, err });
        return { ok: false, _clientError: err };
      });

      if (!res || !res.ok) {
        // get body if possible
        let data = null;
        try {
          data = res ? await res.json() : null;
        } catch (e) {
          console.warn("uploadImage - invalid JSON response", e);
        }

        console.warn("uploadImage - server error", { attempt, status: res?.status, body: data });

        const message = data?.error || (res && res._clientError && res._clientError.message) || `Upload failed (attempt ${attempt})`;

        // if last attempt, throw
        if (attempt === MAX_ATTEMPTS) throw new Error(message);

        // small backoff
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue; // retry
      }

      const data = await res.json();
      console.log("uploadImage - success", { attempt, url: data?.url });
      if (!data || !data.url) throw new Error(data?.error || "No URL returned");
      return data.url;
    }
  };

  return (
    <>
      <ToastContainer />

      <div className="container mx-auto py-5 px-6">
        <h1 className="text-center my-5 text-3xl font-bold">
          Welcome to your Dashboard
        </h1>

        <form className="max-w-2xl mx-auto" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">Name</label>
            <input
              value={form.name || ""}
              onChange={handleChange}
              type="text"
              name="name"
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Email */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">Email</label>
            <input
              value={form.email || ""}
              onChange={handleChange}
              type="email"
              name="email"
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Username */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">Username</label>
            <input
              value={form.username || ""}
              onChange={handleChange}
              type="text"
              name="username"
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Profile Pic */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">
              Profile Picture
            </label>
            <input
              type="file"
              name="profilepic"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Cover Pic */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">
              Cover Picture
            </label>
            <input
              type="file"
              name="coverpic"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Razorpay ID */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">
              Razorpay Id
            </label>
            <input
              value={form.razorpayid || ""}
              onChange={handleChange}
              type="text"
              name="razorpayid"
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Razorpay Secret */}
          <div className="my-2">
            <label className="block mb-2 text-sm font-medium">
              Razorpay Secret
            </label>
            <input
              value={form.razorpaysecret || ""}
              onChange={handleChange}
              type="text"
              name="razorpaysecret"
              className="block w-full p-2 text-xs border rounded-lg bg-gray-900"
            />
          </div>

          {/* Save */}
          <div className="my-6">
            <button
              type="submit"
              className="block w-full p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
          </div>

          {/* View Page */}
          <div className="my-2">
            <button
              type="button"
              onClick={async () => {
                const res = await saveProfile();
                if (!res?.error) {
                  router.push(`/${res.user.username}`);
                }
              }}
              className="block w-full p-2 bg-gray-500 rounded-lg hover:bg-gray-600"
            >
              View your page
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default Dashboard;
