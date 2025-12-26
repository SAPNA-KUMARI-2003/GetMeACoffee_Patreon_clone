"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const Donate = () => {
	const [username, setUsername] = useState("");
	const router = useRouter();

	const handleSubmit = (e) => {
		e.preventDefault();
		const u = username.trim();
		if (!u) {
			alert("Please enter a username");
			return;
		}
		// remove leading @ if user included it, keep casing as-is
		const clean = u.replace(/^@+/, "");
		router.push(`/${encodeURIComponent(clean)}`);
	};

	return (
		<div className="w-full flex items-center justify-center p-6 ">
			<div className="max-w-xl w-full bg-white/5 backdrop-blur-md rounded-2xl shadow-md border border-white/5 p-6">
				<div className="flex items-start gap-4 flex-col md:flex-row">
					<div className="flex-shrink-0 mt-1">
						<img src="tea.gif" width={64} alt="logo" className="rounded-full border border-white/10 p-1" />
					</div>
					<div className="flex-1">
						<h2 className="text-2xl font-semibold">Support a creator ☕</h2>
						<p className="text-sm text-slate-300 mt-1">{"Enter the creator's username to go to their payment page."}</p>
						<form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
							<label htmlFor="donate-username" className="sr-only">Username</label>
							<div className="flex items-center bg-white/3 rounded-md border border-white/6 px-3 py-2 flex-1">
								<span className="text-slate-200 mr-2">@</span>
								<input
									autoFocus
									id="donate-username"
									type="text"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="username (e.g. alice)"
									className="w-full bg-transparent outline-none text-white placeholder:text-slate-400"
								/>
							</div>
							<button
								type="submit"
								className="mt-2 sm:mt-0 inline-flex items-center gap-2 bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-full shadow hover:scale-105 transition transform"
							>
								<span>Go to page</span>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
									<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
								</svg>
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Donate;
