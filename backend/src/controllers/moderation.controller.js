import { supabaseAdmin } from "../lib/supabaseClient.js";
import { checkAndAwardBadges } from "../services/badges.service.js";
import { awardSubmissionApproved } from "../services/coins.service.js";
import { requireModerator } from "../services/requireModerator.service.js";
import { awardXP } from "../services/petXp.service.js";

export async function getModerationQueue(req, res, next) {
    try {
        if(!requireModerator(req, res)) return;

        const status = req.query.status || "pending_review";
        const limit = Math.min(Number(req.query.limit ?? 50), 200);

        const {data, error} = await supabaseAdmin
            .from("submissions")
            .select("submission_id, challenge_id, user_id, group_id, points, status, evidence")
            .eq("status", status)
            .order("points", {ascending: false})
            .limit(limit);

        if (error) return next(error);

        res.json({submissions: data ?? []});
    } catch (err) {
        next(err);
    }
}

export async function decideSubmission(req, res, next) {
    try {
        if (!requireModerator(req, res)) return;

        const {submissionId} = req.params;
        const moderatorId = req.user.id;
        const decision = req.body?.decision;
        const reason = req.body?.reason ?? null;

        // if (!moderatorId) {
        //     return res.status(400).json({error: 'Missing moderator id (user header "x-user-id")'});
        // }

        if (!decision || !["approve", "reject"].includes(decision)) {
            return res.status(400).json({error: 'decision must be "approve" or "reject"'});
        }

        const {data: submission, error: subErr} = await supabaseAdmin
            .from("submissions")
            .select("submission_id, user_id, status")
            .eq("submission_id", submissionId)
            .single();

        if (subErr) return next(subErr);
        if (!submission) return res.status(404).json({error: "Submission not found"});
        
        if (submission.user_id === moderatorId) {
            return res.status(403).json({
                error: "Moderators cannot review their own submissions."
            });
        }


        if (submission.status !== "pending_review") {
            return res.status(400).json({
                error: `Cannot decide submission with status "${submission.status}". Expected "pending_review".`,
            });
        }

        const newStatus = decision === "approve" ? "approved" : "rejected";

        const {data: decisionRow, error: decErr} = await supabaseAdmin
            .from("moderation_decisions")
            .insert({
                submission_id: submissionId,
                moderator_id: moderatorId,
                decision,
                reason,
                decision_timestamp: new Date().toISOString(),
            })
            .select("*")
            .single();

        if (decErr) return next(decErr);


        const {data: updated, error: updErr} = await supabaseAdmin
            .from("submissions")
            .update({status: newStatus})
            .eq("submission_id", submissionId)
            .select("*")
            .single();

        if (updErr) return next(updErr);

        if (newStatus === "approved") {
            await awardSubmissionApproved(submission.user_id, submissionId);

            const co2eKg = (updated.points ?? 0) / 10;
            await awardXP(submission.user_id, co2eKg);
            
            await checkAndAwardBadges(submission.user_id);
        } 

        res.json({submission: updated, moderationDecision: decisionRow});
    } catch (err) {
        next(err);
    }
}