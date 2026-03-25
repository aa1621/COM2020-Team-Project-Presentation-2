import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import ActionModal from "../components/ActionModal";
import { decideSubmission, getModerationQueue } from "../api/moderation";
import { useAuth } from "../auth/AuthProvider";
import type { ChallengeSubmission, SubmissionEvidence } from "../api/types";

type QueueStatus = "pending_review" | "approved" | "rejected";
type ModerationModalState =
  | {
      tone: "success" | "danger";
      chip: string;
      title: string;
      description: string;
    }
  | null;

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function parseEvidence(raw: ChallengeSubmission["evidence"]) {
  if (!raw) return { text: "", images: [] as string[] };

  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { text: raw, images: [] as string[] };
    }
  }

  if (!obj || typeof obj !== "object") {
    return { text: "", images: [] as string[] };
  }

  const evidence = obj as SubmissionEvidence & {
    image_urls?: string[];
    photos?: Array<{ data_url?: string; url?: string } | string>;
  };

  const text = typeof evidence.text === "string" ? evidence.text : "";
  const fromImages = Array.isArray(evidence.images)
    ? evidence.images
        .map((img) => img?.data_url)
        .filter((val): val is string => typeof val === "string" && val.length > 0)
    : [];
  const fromImageUrls = Array.isArray(evidence.image_urls)
    ? evidence.image_urls.filter((val): val is string => typeof val === "string")
    : [];
  const fromPhotos = Array.isArray(evidence.photos)
    ? evidence.photos
        .map((photo) => {
          if (typeof photo === "string") return photo;
          if (photo && typeof photo === "object") return photo.data_url || photo.url || "";
          return "";
        })
        .filter((val): val is string => Boolean(val))
    : [];

  return { text, images: [...fromImages, ...fromImageUrls, ...fromPhotos] };
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<QueueStatus>("pending_review");
  const [queue, setQueue] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingSubmissionId, setActingSubmissionId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [modal, setModal] = useState<ModerationModalState>(null);

  const role = user?.role === "moderator" || user?.role === "maintainer" ? user.role : null;

  useEffect(() => {
    async function loadQueue() {
      if (!user?.user_id || !role) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getModerationQueue({ status, limit: 100 });
        setQueue(res.submissions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load moderation queue.");
      } finally {
        setLoading(false);
      }
    }

    loadQueue();
  }, [status, user?.user_id, role]);

  async function handleDecision(submissionId: string, decision: "approve" | "reject") {
    if (!user?.user_id || !role) return;

    setActingSubmissionId(submissionId);
    setError(null);
    try {
      const res = await decideSubmission(submissionId, decision, reason);
      setQueue((prev) => {
        if (status === "pending_review") {
          return prev.filter((item) => item.submission_id !== submissionId);
        }

        return prev.map((item) =>
          item.submission_id === submissionId ? res.submission : item
        );
      });
      setModal({
        tone: "success",
        chip: "Decision saved",
        title: decision === "approve" ? "Submission approved" : "Submission rejected",
        description:
          decision === "approve"
            ? "The submission was approved and removed from the pending queue."
            : "The submission was rejected and removed from the pending queue.",
      });
      setReason("");
    } catch (err) {
      setModal({
        tone: "danger",
        chip: "Decision failed",
        title: "The moderation decision was not saved",
        description:
          err instanceof Error ? err.message : "Could not submit moderation decision.",
      });
    } finally {
      setActingSubmissionId(null);
    }
  }

  return (
    <>
      {modal ? (
        <ActionModal
          chip={modal.chip}
          title={modal.title}
          description={modal.description}
          tone={modal.tone}
          onClose={() => setModal(null)}
          actions={
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-2xl bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          }
        />
      ) : null}

      <PageShell
      title="Moderation"
      subtitle="Review flagged or evidence-based submissions and decide outcomes."
      right={
        <select
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as QueueStatus)}
        >
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      }
    >
      <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm space-y-4">
        {!user && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
            Please log in to access moderation.
          </div>
        )}

        {user && !role && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
            Your account is not a moderator account.
          </div>
        )}

        {user && role && (
          <>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Decision reason (optional, useful for rejection notes)"
            />

            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {loading && <div className="text-sm text-gray-600">Loading queue...</div>}
            {!loading && queue.length === 0 && (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
                No submissions in this queue.
              </div>
            )}
            {!loading && queue.length > 0 && (
              <div className="space-y-2">
                {queue.map((submission) => {
                  const isActing = actingSubmissionId === submission.submission_id;
                  const evidence = parseEvidence(submission.evidence);
                  return (
                    <div
                      key={submission.submission_id}
                      className="rounded-xl border border-gray-100 bg-white p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          Submission {shortId(submission.submission_id)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          Challenge {shortId(submission.challenge_id)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          User {shortId(submission.user_id)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          Status {submission.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-800">
                        Points: {submission.points}
                        {submission.group_id ? ` • Group ${shortId(submission.group_id)}` : ""}
                      </div>
                      {(evidence.text || evidence.images.length > 0) && (
                        <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                          {evidence.text && <div>Evidence note: {evidence.text}</div>}
                          {evidence.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {evidence.images.map((src, idx) => (
                                <img
                                  key={`${submission.submission_id}-evidence-${idx}`}
                                  src={src}
                                  alt={`Evidence ${idx + 1}`}
                                  className="h-28 w-full rounded-md object-cover"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {submission.status === "pending_review" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecision(submission.submission_id, "reject")}
                            className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-800"
                            disabled={isActing}
                          >
                            {isActing ? "Submitting..." : "Reject"}
                          </button>
                          <button
                            onClick={() => handleDecision(submission.submission_id, "approve")}
                            className="rounded-xl bg-gray-900 px-3 py-2 text-xs text-white"
                            disabled={isActing}
                          >
                            {isActing ? "Submitting..." : "Approve"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      </PageShell>
    </>
  );
}
