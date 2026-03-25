import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import PageShell from "../components/PageShell";
import ActionModal from "../components/ActionModal";
import {
  createChallengeSubmission,
  getChallengeSubmissions,
  getChallenges,
} from "../api/challenges";
import { useAuth } from "../auth/AuthProvider";
import type {
  Challenge,
  ChallengeSubmission,
  SubmissionEvidenceImage,
} from "../api/types";

type Tab = "Group challenges" | "Personal challenges";
type TimeFilter = "Daily" | "Weekly" | "Monthly" | "Seasonal";
type ChallengeWindow = "current" | "past";
type ChallengesModalState =
  | {
      tone: "success" | "danger" | "warning";
      chip: string;
      title: string;
      description: string;
      body?: string;
    }
  | null;

const MAX_EVIDENCE_IMAGES = 3;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Group challenges");
  // time is shown in the header label but doesn't affect what gets fetched -
  // the API currently filters by type only, so this is just cosmetic for now
  const [time, setTime] = useState<TimeFilter>("Weekly");
  const [windowFilter, setWindowFilter] = useState<ChallengeWindow>("current");

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCO2e, setTotalCO2e] = useState("1");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<SubmissionEvidenceImage[]>([]);
  const [modal, setModal] = useState<ChallengesModalState>(null);

  useEffect(() => {
    async function loadChallenges() {
      setLoading(true);
      setError(null);
      try {
        const type = tab === "Group challenges" ? "group" : "personal";
        const res = await getChallenges(type);
        const list = res.challenges || [];
        console.log(`${type} challenges loaded:`, list.length);
        setChallenges(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load challenges.");
      } finally {
        setLoading(false);
      }
    }

    loadChallenges();
  }, [tab]);

  const filteredChallenges = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return challenges.filter((challenge) => {
      const isPast = Boolean(challenge.end_date && challenge.end_date < today);
      return windowFilter === "past" ? isPast : !isPast;
      // also tried filtering by challenge.frequency === time.toLowerCase() here but
      // the API doesn't consistently populate that field yet
    });
  }, [challenges, windowFilter]);

  useEffect(() => {
    if (filteredChallenges.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillVisible = filteredChallenges.some((c) => c.challenge_id === selectedId);
    if (!stillVisible) {
      setSelectedId(filteredChallenges[0].challenge_id);
    }
  }, [filteredChallenges, selectedId]);

  const selectedChallenge = useMemo(
    () => filteredChallenges.find((c) => c.challenge_id === selectedId) ?? null,
    [filteredChallenges, selectedId]
  );

  const requiresEvidence = useMemo(
    () => selectedChallenge?.rules?.evidence_required === true,
    [selectedChallenge]
  );

  useEffect(() => {
    async function loadSubmissions() {
      if (!selectedId) return;
      setLoadingSubs(true);
      try {
        const res = await getChallengeSubmissions(selectedId, { limit: 20 });
        console.log("submissions for", selectedId, res.submissions?.length ?? 0);
        setSubmissions(res.submissions || []);
      } catch (e) {
        setModal({
          tone: "danger",
          chip: "Could not load submissions",
          title: "The submissions list did not load",
          description: (e as Error).message || "Failed to load submissions.",
        });
      } finally {
        setLoadingSubs(false);
      }
    }

    loadSubmissions();
  }, [selectedId]);

  async function handleEvidenceFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const allowedSlots = MAX_EVIDENCE_IMAGES - evidenceImages.length;
    if (allowedSlots <= 0) {
      setModal({
        tone: "warning",
        chip: "Too many images",
        title: "Upload limit reached",
        description: `You can upload up to ${MAX_EVIDENCE_IMAGES} images.`,
      });
      return;
    }

    const selected = files.slice(0, allowedSlots);
    const nonImage = selected.find((file) => !file.type.startsWith("image/"));
    if (nonImage) {
      setModal({
        tone: "warning",
        chip: "Image only",
        title: "That file can't be used",
        description: `"${nonImage.name}" is not an image file.`,
      });
      return;
    }

    try {
      const mapped = await Promise.all(
        selected.map(async (file) => ({
          name: file.name,
          mime_type: file.type || "image/*",
          data_url: await readFileAsDataUrl(file),
        }))
      );
      setEvidenceImages((prev) => [...prev, ...mapped]);
    } catch (err) {
      setModal({
        tone: "danger",
        chip: "Upload failed",
        title: "The images were not added",
        description: err instanceof Error ? err.message : "Failed to load selected images.",
      });
    }
  }

  function removeEvidenceImage(index: number) {
    setEvidenceImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit() {
    if (!user?.user_id) {
      setModal({
        tone: "warning",
        chip: "Sign in required",
        title: "You need to log in first",
        description: "Please sign in before submitting.",
      });
      return;
    }
    if (!selectedChallenge) {
      setModal({
        tone: "warning",
        chip: "Choose a challenge",
        title: "No challenge selected",
        description: "Select a challenge first.",
      });
      return;
    }

    const total = Number(totalCO2e);
    if (!Number.isFinite(total) || total <= 0) {
      setModal({
        tone: "warning",
        chip: "Invalid total",
        title: "Enter a valid CO2e total",
        description: "Total CO2e must be a positive number.",
      });
      return;
    }

    if (requiresEvidence && evidenceImages.length === 0 && !evidenceText.trim()) {
      setModal({
        tone: "warning",
        chip: "Evidence required",
        title: "Add supporting evidence",
        description: "This challenge requires evidence. Add a note or at least one image.",
      });
      return;
    }

    const text = evidenceText.trim();
    const evidencePayload =
      requiresEvidence && (text || evidenceImages.length > 0)
        ? {
            text: text || undefined,
            images: evidenceImages.length > 0 ? evidenceImages : undefined,
          }
        : null;

    setSubmitting(true);
    try {
      const isGroup = selectedChallenge.challenge_type === "group";
      const groupId = isGroup ? user?.group_id ?? null : null;

      // console.log("submitting to challenge", selectedChallenge.challenge_id, { total, groupId });
      const res = await createChallengeSubmission(selectedChallenge.challenge_id, {
        total_co2e: total,
        evidence: evidencePayload,
        group_id: groupId,
      });
      setModal({
        tone: "success",
        chip: "Submission sent",
        title: "Challenge submitted",
        description: `Status: ${res.submission.status}. Points: ${res.submission.points}.`,
      });
      setEvidenceText("");
      setEvidenceImages([]);
      const refresh = await getChallengeSubmissions(
        selectedChallenge.challenge_id,
        { limit: 20 }
      );
      setSubmissions(refresh.submissions || []);
    } catch (err) {
      setModal({
        tone: "danger",
        chip: "Submission failed",
        title: "The challenge was not submitted",
        description: err instanceof Error ? err.message : "Submit failed.",
      });
    } finally {
      setSubmitting(false);
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
        >
          {modal.body ? (
            <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white/85 p-5 text-sm app-muted">
              {modal.body}
            </div>
          ) : null}
        </ActionModal>
      ) : null}

      <PageShell
      title="Challenges"
      subtitle="Complete challenges to earn points and climb the rankings."
      right={
        tab === "Personal challenges" ? (
          <label className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--app-ink))]">
            <span>Time range</span>
            <select
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value as TimeFilter)}
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Seasonal</option>
            </select>
          </label>
        ) : null
      }
    >
      <div className="flex gap-2">
        {(["Group challenges", "Personal challenges"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm space-y-4">
        <div className="text-sm font-medium text-gray-900">
          {tab === "Group challenges"
            ? "This week's society challenge"
            : `Personal challenges • ${time}`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWindowFilter("current")}
            className={`rounded-full px-3 py-1 text-xs ${
              windowFilter === "current"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setWindowFilter("past")}
            className={`rounded-full px-3 py-1 text-xs ${
              windowFilter === "past"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Past
          </button>
        </div>
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-sm text-gray-600">Loading challenges...</div>
        )}
        {!loading && filteredChallenges.length === 0 && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
            No {windowFilter} challenges available.
          </div>
        )}
        {!loading && filteredChallenges.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="challenge-select" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Challenge
              </label>
              <select
                id="challenge-select"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {filteredChallenges.map((c) => (
                  <option key={c.challenge_id} value={c.challenge_id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedChallenge && (
              <div className="rounded-xl bg-white p-4 space-y-2">
                <div className="text-sm text-gray-800">{selectedChallenge.title}</div>
                <div className="text-xs text-gray-500">
                  {selectedChallenge.start_date || "No start date"} •{" "}
                  {selectedChallenge.end_date || "No end date"}
                </div>
                <div className="text-xs text-gray-600">
                  Evidence required:{" "}
                  {selectedChallenge.rules?.evidence_required ? "Yes" : "No"}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
              <div className="text-xs font-medium text-gray-900">
                Submit your total CO2e
              </div>
              <div className="space-y-1.5">
                <label htmlFor="challenge-total-co2e" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                  Total CO2e
                </label>
                <input
                  id="challenge-total-co2e"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  placeholder="e.g., 5.5"
                  value={totalCO2e}
                  onChange={(e) => setTotalCO2e(e.target.value)}
                />
              </div>
              {requiresEvidence && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="challenge-evidence-note" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                      Evidence note
                    </label>
                    <textarea
                      id="challenge-evidence-note"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                      placeholder="Evidence notes (required note or image)"
                      rows={3}
                      value={evidenceText}
                      onChange={(e) => setEvidenceText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <label htmlFor="challenge-evidence-upload" className="text-xs text-gray-700">
                      Upload evidence images (max {MAX_EVIDENCE_IMAGES})
                    </label>
                    <input
                      id="challenge-evidence-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="w-full text-xs text-gray-700"
                      onChange={handleEvidenceFilesChange}
                    />
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      Please do not include personal information, identifiable faces, or private data in your evidence photos.
                    </p>
                    {evidenceImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {evidenceImages.map((image, index) => (
                          <div key={`${image.name}-${index}`} className="space-y-1">
                            <img
                              src={image.data_url}
                              alt={image.name}
                              className="h-24 w-full rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeEvidenceImage(index)}
                              className="w-full rounded-md bg-white px-2 py-1 text-[11px] text-gray-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {!requiresEvidence && (
                <div className="rounded-xl bg-gray-50 p-2 text-xs text-gray-600">
                  Evidence is not required for this challenge.
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedChallenge}
                className="rounded-xl bg-gray-900 px-3 py-2 text-xs text-white disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
              <div className="text-xs font-medium text-gray-900">
                Top submissions
              </div>
              {loadingSubs && (
                <div className="text-xs text-gray-600">
                  Loading submissions...
                </div>
              )}
              {!loadingSubs && submissions.length === 0 && (
                <div className="text-xs text-gray-600">No submissions yet.</div>
              )}
              {!loadingSubs &&
                submissions.map((s) => (
                  <div
                    key={s.submission_id}
                    className="flex justify-between text-xs text-gray-700"
                  >
                    <span>{s.user_id.slice(0, 8)}…</span>
                    <span>
                      {s.points} pts • {s.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      </PageShell>
    </>
  );
}
