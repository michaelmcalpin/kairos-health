"use client";

/**
 * Floating "Send feedback" button + compact modal.
 *
 * Rendered in every authenticated portal layout. Submits via
 * trpc.feedback.submit with the current pathname and platform "web".
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

type FeedbackType = "bug" | "feature" | "redesign";

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "redesign", label: "Redesign" },
];

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setMessage("");
        setType("bug");
      }, 1500);
    },
    onError: (err) => {
      setError(err.message || "Failed to send feedback. Please try again.");
    },
  });

  const handleSubmit = () => {
    if (message.trim().length < 3 || submitMutation.isPending) return;
    setError(null);
    submitMutation.mutate({
      type,
      message: message.trim(),
      page: (pathname ?? "/").slice(0, 300),
      platform: "web",
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        title="Send feedback"
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-kairos-gold/15 border border-kairos-gold/40 text-kairos-gold flex items-center justify-center shadow-lg hover:bg-kairos-gold/25 hover:border-kairos-gold transition-colors"
      >
        <MessageSquarePlus size={20} />
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80 bg-kairos-card border border-kairos-border rounded-kairos shadow-kairos p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-white text-sm">Send Feedback</h3>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close feedback form"
              className="text-kairos-silver-dark hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {success ? (
            <p className="text-sm text-green-400 font-body py-4 text-center">
              Thanks — your feedback was logged.
            </p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-heading font-semibold border transition-colors",
                      type === opt.value
                        ? "bg-kairos-gold/15 text-kairos-gold border-kairos-gold/50"
                        : "bg-transparent text-kairos-silver-dark border-kairos-border hover:text-white",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened, or what would you like to see?"
                rows={4}
                maxLength={5000}
                className="w-full bg-kairos-royal border border-kairos-border rounded-kairos-sm px-3 py-2 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50 resize-none mb-3"
              />

              {error && (
                <p className="text-xs text-red-400 font-body mb-2">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={message.trim().length < 3 || submitMutation.isPending}
                className="w-full py-2 rounded-kairos-sm bg-kairos-gold/15 border border-kairos-gold/40 text-kairos-gold text-sm font-heading font-semibold hover:bg-kairos-gold/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? "Sending..." : "Submit"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
