"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Plus, Trash2, Check, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DailyGuidancePage({ params }: { params: { id: string } }) {
  const clientId = params.id;
  const utils = trpc.useUtils();

  const detailQuery = trpc.coach.clients.getDetail.useQuery(
    { clientId },
    { staleTime: 15_000, refetchOnWindowFocus: false, retry: false },
  );
  const clientName = detailQuery.data?.name ?? "client";

  const guidanceQuery = trpc.coach.guidance.getGuidance.useQuery(
    { clientId },
    { refetchOnWindowFocus: false, retry: false },
  );

  // ── Advice ──
  const [advice, setAdvice] = useState("");
  const [adviceSaved, setAdviceSaved] = useState(false);
  useEffect(() => {
    if (guidanceQuery.data) setAdvice(guidanceQuery.data.advice?.message ?? "");
  }, [guidanceQuery.data]);

  const setAdviceMut = trpc.coach.guidance.setAdvice.useMutation({
    onSuccess: () => {
      setAdviceSaved(true);
      setTimeout(() => setAdviceSaved(false), 2000);
      utils.coach.guidance.getGuidance.invalidate({ clientId });
    },
  });

  // ── Tasks ──
  const [newTask, setNewTask] = useState("");
  const [newDue, setNewDue] = useState("");
  const createTaskMut = trpc.coach.guidance.createTask.useMutation({
    onSuccess: () => {
      setNewTask("");
      setNewDue("");
      utils.coach.guidance.getGuidance.invalidate({ clientId });
    },
  });
  const updateTaskMut = trpc.coach.guidance.updateTask.useMutation({
    onSuccess: () => utils.coach.guidance.getGuidance.invalidate({ clientId }),
  });
  const deleteTaskMut = trpc.coach.guidance.deleteTask.useMutation({
    onSuccess: () => utils.coach.guidance.getGuidance.invalidate({ clientId }),
  });

  const tasks = guidanceQuery.data?.tasks ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Link
        href={`/trainer/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-kairos-gold text-sm transition-colors"
      >
        <ArrowLeft size={14} /> Back to {detailQuery.data?.name ?? "client"}
      </Link>

      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-1">Daily Guidance</h1>
        <p className="text-gray-400 text-sm">
          What <span className="text-kairos-gold">{clientName}</span> sees at the top of their app each day.
        </p>
      </div>

      {guidanceQuery.isLoading ? (
        <div className="kairos-card p-10 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-kairos-gold" />
        </div>
      ) : guidanceQuery.isError ? (
        <div className="kairos-card p-6 flex flex-col items-center gap-2 text-center">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-sm text-red-400">{guidanceQuery.error.message}</p>
        </div>
      ) : (
        <>
          {/* Today's advice */}
          <div className="kairos-card p-5">
            <h2 className="text-sm font-heading font-semibold text-kairos-gold mb-1 flex items-center gap-2">
              <Sparkles size={14} /> Today&apos;s advice
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Overrides the automatic line. Leave blank to fall back to the plan-based advice.
            </p>
            <textarea
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              rows={3}
              placeholder="e.g. Low-carb day — keep the eating window tight and get your walk in."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-kairos-gold/50 focus:outline-none resize-none"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setAdviceMut.mutate({ clientId, message: advice })}
                disabled={setAdviceMut.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold text-kairos-royal-dark hover:bg-kairos-gold-light transition-colors disabled:opacity-50"
              >
                {setAdviceMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save advice
              </button>
              {adviceSaved && <span className="text-xs text-green-400">Saved</span>}
            </div>
          </div>

          {/* Tasks */}
          <div className="kairos-card p-5">
            <h2 className="text-sm font-heading font-semibold text-kairos-gold mb-3">Tasks</h2>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task…"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-kairos-gold/50 focus:outline-none"
              />
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                title="Due date (optional)"
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-kairos-gold/50 focus:outline-none"
              />
              <button
                onClick={() =>
                  newTask.trim() &&
                  createTaskMut.mutate({ clientId, title: newTask.trim(), dueDate: newDue || undefined })
                }
                disabled={createTaskMut.isPending || !newTask.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/25 transition-colors disabled:opacity-50"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No tasks yet.</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((t: { id: string; title: string; dueDate: string | null; completed: boolean | null }) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-900/60 border border-gray-800"
                  >
                    <button
                      onClick={() => updateTaskMut.mutate({ taskId: t.id, completed: !t.completed })}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        t.completed ? "bg-kairos-gold border-kairos-gold" : "border-gray-600 hover:border-gray-400"
                      }`}
                      title={t.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {t.completed && <Check size={12} className="text-kairos-royal-dark" strokeWidth={3} />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm ${t.completed ? "text-gray-500 line-through" : "text-white"}`}>{t.title}</p>
                      {t.dueDate && <p className="text-[11px] text-gray-500">Due {t.dueDate}</p>}
                    </div>
                    <button
                      onClick={() => deleteTaskMut.mutate({ taskId: t.id })}
                      className="p-1 rounded-md text-gray-600 hover:text-red-400 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
