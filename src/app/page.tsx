"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleStart = () => {
    if (username.trim()) {
      router.push(`/evaluate?username=${encodeURIComponent(username.trim())}`);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-indigo-100 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 mb-4">
            <svg
              className="w-7 h-7 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Human Evaluation Platform
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Welcome! In this study, we recorded social interaction scenarios
            where humans play the role of robots. You will watch short video
            clips and answer questions about what you observe — including
            emotions, intentions, and appropriate actions.
          </p>
        </div>

        <div className="bg-indigo-50 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide mb-3">
            Instructions
          </h2>
          <ol className="space-y-2 text-sm text-indigo-800">
            <li className="flex gap-2">
              <span className="font-bold text-indigo-600">1.</span>
              Enter your username below
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-indigo-600">2.</span>
              Watch each video carefully
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-indigo-600">3.</span>
              Select the best answer for each question
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-indigo-600">4.</span>
              Your responses are saved automatically
            </li>
          </ol>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStart();
              }}
              placeholder="Enter your username"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 placeholder-gray-400"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={!username.trim()}
            className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Start Evaluation
          </button>
        </div>
      </div>
    </main>
  );
}
