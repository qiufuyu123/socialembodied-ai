"use client";

import { useCallback, useEffect, useState } from "react";

interface AccuracyEntry {
  correct: number;
  total: number;
  accuracy: number;
}

interface RecentResponse {
  username: string;
  questionIndex: number;
  isCorrect: boolean;
  timeSpentMs: number;
  createdAt: string;
}

interface Stats {
  totalQuestions: number;
  totalResponses: number;
  uniqueUsers: number;
  overallAccuracy: number;
  perTask: Record<string, AccuracyEntry>;
  perQuestionType: Record<string, AccuracyEntry>;
  perPerspective: Record<string, AccuracyEntry>;
  perScenario: Record<string, Record<string, AccuracyEntry>>;
  recentResponses: RecentResponse[];
  answerDistribution: Record<number, number>;
}

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const pct = Math.round(accuracy);
  const color =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-12 text-right">
        {pct}%
      </span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (error && !stats) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const questionsCovered = Object.keys(stats.answerDistribution).length;

  return (
    <main className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Responses" value={stats.totalResponses} />
          <SummaryCard label="Unique Users" value={stats.uniqueUsers} />
          <SummaryCard
            label="Overall Accuracy"
            value={`${Math.round(stats.overallAccuracy)}%`}
          />
          <SummaryCard
            label="Questions Covered"
            value={`${questionsCovered}/${stats.totalQuestions}`}
          />
        </div>

        {/* Accuracy by Task & Scenario */}
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Accuracy by Task &amp; Scenario
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Task</th>
                  <th className="px-5 py-3 font-medium">Scenario</th>
                  <th className="px-5 py-3 font-medium">Correct/Total</th>
                  <th className="px-5 py-3 font-medium w-64">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.perScenario).sort().map(([task, scenarios]) => {
                  const scenarioEntries = Object.entries(scenarios).sort();
                  return scenarioEntries.map(([scenario, data], idx) => (
                    <tr
                      key={`${task}-${scenario}`}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 font-medium text-indigo-700">
                        {idx === 0 ? task : ""}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{scenario}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {data.correct}/{data.total}
                      </td>
                      <td className="px-5 py-3">
                        <AccuracyBar accuracy={data.accuracy} />
                      </td>
                    </tr>
                  ));
                })}
                {/* Task subtotals */}
                {Object.entries(stats.perTask).sort().map(([task, data]) => (
                  <tr
                    key={`subtotal-${task}`}
                    className="border-t-2 border-gray-300 bg-gray-50 font-semibold"
                  >
                    <td className="px-5 py-2 text-gray-900">{task}</td>
                    <td className="px-5 py-2 text-gray-500 italic">Subtotal</td>
                    <td className="px-5 py-2 text-gray-900">
                      {data.correct}/{data.total}
                    </td>
                    <td className="px-5 py-2">
                      <AccuracyBar accuracy={data.accuracy} />
                    </td>
                  </tr>
                ))}
                {Object.keys(stats.perScenario).length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Accuracy by Question Type */}
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Accuracy by Question Type
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Correct/Total</th>
                  <th className="px-5 py-3 font-medium w-64">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.perQuestionType).sort().map(([type, data]) => (
                  <tr
                    key={type}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900 capitalize">
                      {type}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {data.correct}/{data.total}
                    </td>
                    <td className="px-5 py-3">
                      <AccuracyBar accuracy={data.accuracy} />
                    </td>
                  </tr>
                ))}
                {Object.keys(stats.perQuestionType).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Accuracy by Perspective */}
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Accuracy by Perspective
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Perspective</th>
                  <th className="px-5 py-3 font-medium">Correct/Total</th>
                  <th className="px-5 py-3 font-medium w-64">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.perPerspective).sort().map(([persp, data]) => (
                  <tr
                    key={persp}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900 capitalize">
                      {persp}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {data.correct}/{data.total}
                    </td>
                    <td className="px-5 py-3">
                      <AccuracyBar accuracy={data.accuracy} />
                    </td>
                  </tr>
                ))}
                {Object.keys(stats.perPerspective).length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Responses */}
        <section className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Responses
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Question #</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">Time Spent</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentResponses.map((r, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {r.username}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      #{r.questionIndex + 1}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.isCorrect
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {r.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {(r.timeSpentMs / 1000).toFixed(1)}s
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {stats.recentResponses.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      No responses yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
