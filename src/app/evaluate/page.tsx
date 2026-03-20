"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Question {
  questionIndex: number;
  videoUrl: string;
  question: string;
  choices: string[];
  answeredCount: number;
  totalQuestions: number;
}

type FeedbackState = null | "submitted";

function EvaluateContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") ?? "";

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [submitting, setSubmitting] = useState(false);
  const questionLoadTime = useRef<number>(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchNextQuestion = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/next-question?username=${encodeURIComponent(username)}`
      );
      const data = await res.json();
      setTotalQuestions(data.totalQuestions ?? 0);
      if (data.done) {
        setDone(true);
        setTotalAnswered(data.totalAnswered ?? 0);
      } else {
        setTotalAnswered(data.answeredCount ?? 0);
        setQuestion(data);
        questionLoadTime.current = Date.now();
      }
    } catch (err) {
      console.error("Failed to fetch question:", err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (username) {
      fetchNextQuestion();
    }
  }, [username, fetchNextQuestion]);

  const handleSelect = async (selectedOption: number) => {
    if (!question || submitting) return;
    setSubmitting(true);

    const timeSpentMs = Date.now() - questionLoadTime.current;

    try {
      const res = await fetch("/api/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          questionIndex: question.questionIndex,
          selectedOption,
          timeSpentMs,
        }),
      });
      await res.json();
      setFeedback("submitted");

      setTimeout(() => {
        setSubmitting(false);
        fetchNextQuestion();
      }, 800);
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setSubmitting(false);
    }
  };

  if (!username) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
        <div className="text-center text-gray-600">
          <p className="text-lg">No username provided.</p>
          <a href="/" className="text-indigo-600 hover:underline mt-2 inline-block">
            Go back to start
          </a>
        </div>
      </main>
    );
  }

  if (loading && !feedback) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading question...</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-indigo-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            All questions completed!
          </h1>
          <p className="text-gray-600 mb-4">
            Thank you for participating.
          </p>
          <div className="bg-indigo-50 rounded-lg p-4 inline-block">
            <p className="text-sm text-indigo-800">
              Total answered:{" "}
              <span className="font-bold text-indigo-600">{totalAnswered}</span>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!question) return null;

  return (
    <main className="flex-1 flex flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-50 min-h-0">
      {/* Top bar */}
      <div className="bg-white border-b border-indigo-100 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">User:</span>
            <span className="font-medium text-gray-900">{username}</span>
          </div>
          <div className="text-sm font-semibold text-indigo-600">
            {totalAnswered}/{totalQuestions}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-indigo-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: totalQuestions > 0 ? `${(totalAnswered / totalQuestions) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Video */}
          <div className="bg-black rounded-xl overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              key={question.videoUrl}
              controls
              autoPlay
              className="w-full max-h-[450px] object-contain"
              src={question.videoUrl}
            />
          </div>

          {/* Question and options */}
          <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {question.question}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.choices.map((option, idx) => {
                let cardStyle =
                  "border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer";

                if (feedback) {
                  cardStyle =
                    "border border-gray-200 bg-gray-50 cursor-not-allowed opacity-60";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={submitting}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-start gap-3 ${cardStyle}`}
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-gray-800 text-sm">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="mt-4 px-4 py-3 rounded-lg text-center font-semibold text-white bg-indigo-500">
                Answer submitted! Loading next question...
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
          <div className="text-center">
            <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      }
    >
      <EvaluateContent />
    </Suspense>
  );
}
