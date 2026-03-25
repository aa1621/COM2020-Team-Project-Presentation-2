import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import ActionModal from "../components/ActionModal";
import { getGroups, joinGroup } from "../api/groups";
import { createInvite, getInvites, respondToInvite } from "../api/invites";
import { useAuth } from "../auth/AuthProvider";
import type { Group, GroupInvite } from "../api/types";

type Tab = "Invites" | "My groups" | "Find group" | "Send invite";
type GroupsModalState =
  | {
      tone: "success" | "danger" | "warning";
      chip: string;
      title: string;
      description: string;
      body?: string;
    }
  | null;

export default function GroupsPage() {
  const { setUser, user } = useAuth();
  const [tab, setTab] = useState<Tab>("My groups");
  const tabs: Tab[] = ["My groups", "Find group", "Invites", "Send invite"];

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [joining, setJoining] = useState<string | null>(null);

  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [modal, setModal] = useState<GroupsModalState>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getGroups();
        setGroups(res.groups || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load groups.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    async function loadInvitesForUser() {
      setInvitesLoading(true);
      setError(null);
      try {
        const res = await getInvites();
        setInvites(res.invites || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invites.");
      } finally {
        setInvitesLoading(false);
      }
    }

    if (tab === "Invites" && user?.user_id) {
      loadInvitesForUser();
    }
  }, [tab, user?.user_id]);

  const currentGroup = useMemo(() => {
    if (!user?.group_id) return null;
    return groups.find((group) => group.group_id === user.group_id) || null;
  }, [groups, user]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [groups, search]);

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites]
  );

  async function handleJoin(groupId: string | null) {
    if (!user) {
      setModal({
        tone: "warning",
        chip: "Sign in required",
        title: "You need to log in first",
        description: "Please sign in before joining or leaving a group.",
      });
      return;
    }

    setJoining(groupId || "leave");
    setError(null);
    try {
      const res = await joinGroup(groupId);
      setUser(res.user);
      setModal(
        groupId
          ? {
              tone: "success",
              chip: "Group updated",
              title: "Group joined",
              description: `You are now in ${res.group?.name || "this group"}.`,
            }
          : {
              tone: "success",
              chip: "Group updated",
              title: "Group left",
              description: "You have left your current group.",
            }
      );
    } catch (err) {
      setModal({
        tone: "danger",
        chip: "Group update failed",
        title: "The group was not updated",
        description: err instanceof Error ? err.message : "Could not update group.",
      });
    } finally {
      setJoining(null);
    }
  }

  async function handleInviteResponse(invite: GroupInvite, decision: "accept" | "decline") {
    if (!user) {
      setError("Please log in before managing invites.");
      return;
    }

    setInviteActionId(invite.invite_id);
    setError(null);
    try {
      const res = await respondToInvite(invite.invite_id, decision);
      setInvites((prev) =>
        prev.map((item) => (item.invite_id === invite.invite_id ? { ...item, ...res.invite } : item))
      );

      if (decision === "accept") {
        const updatedUser = { ...user, group_id: invite.group_id };
        setUser(updatedUser);
      }

      setModal({
        tone: "success",
        chip: "Invite updated",
        title: decision === "accept" ? "Invite accepted" : "Invite declined",
        description:
          decision === "accept"
            ? `You joined ${invite.groups?.name || "the group"}.`
            : "The invite was declined.",
      });
    } catch (err) {
      setModal({
        tone: "danger",
        chip: "Invite update failed",
        title: "The invite was not updated",
        description: err instanceof Error ? err.message : "Could not respond to invite.",
      });
    } finally {
      setInviteActionId(null);
    }
  }

  async function handleSendInvite() {
    if (!user) {
      setError("Please log in before sending invites.");
      return;
    }

    if (!currentGroup) {
      setError("Join a group before sending invites.");
      return;
    }

    const username = inviteTarget.trim();
    if (!username) {
      setModal({
        tone: "warning",
        chip: "Username required",
        title: "Enter a username first",
        description: "Add the username of the person you want to invite.",
      });
      return;
    }

    setSendingInvite(true);
    setError(null);
    try {
      const res = await createInvite(
        currentGroup.group_id,
        {
          username,
          message: inviteMessage.trim() || undefined,
        }
      );

      const targetName = res.invitedUser.display_name || res.invitedUser.username;
      setModal({
        tone: "success",
        chip: "Invite sent",
        title: "Invitation created",
        description: `Invite sent to ${targetName}.`,
        body: inviteMessage.trim() ? `Message included: ${inviteMessage.trim()}` : undefined,
      });
      setInviteTarget("");
      setInviteMessage("");
    } catch (err) {
      setModal({
        tone: "danger",
        chip: "Invite failed",
        title: "The invite was not sent",
        description: err instanceof Error ? err.message : "Could not send invite.",
      });
    } finally {
      setSendingInvite(false);
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

      <PageShell title="Groups" subtitle="Join societies, manage invites, and build community.">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
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

      <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {loading && <div className="text-sm text-gray-600">Loading groups...</div>}

        {!loading && tab === "My groups" && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">Your group</div>
            {currentGroup ? (
              <div className="rounded-xl bg-white p-4">
                <div className="text-sm text-gray-800">{currentGroup.name}</div>
                <div className="text-xs text-gray-500">
                  {currentGroup.type || "Society"} · {currentGroup.member_count || 0} members
                </div>
                <button
                  onClick={() => handleJoin(null)}
                  className="mt-3 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-800"
                  disabled={joining === "leave"}
                >
                  {joining === "leave" ? "Leaving..." : "Leave group"}
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
                You are not in a group yet. Head to "Find group" to join one.
              </div>
            )}
          </div>
        )}

        {!loading && tab === "Find group" && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">Find a group</div>
            <div className="space-y-1.5">
              <label htmlFor="group-search" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Search groups
              </label>
              <input
                id="group-search"
                className="app-input"
                placeholder="Search societies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {filteredGroups.length === 0 && (
                <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
                  No groups match your search.
                </div>
              )}
              {filteredGroups.map((group) => {
                const isCurrent = user?.group_id === group.group_id;
                return (
                  <div
                    key={group.group_id}
                    className="rounded-xl bg-white p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm text-gray-800">{group.name}</div>
                      <div className="text-xs text-gray-500">
                        {group.type || "Society"} · {group.member_count || 0} members
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoin(group.group_id)}
                      className={`rounded-xl px-3 py-2 text-xs ${
                        isCurrent ? "bg-gray-200 text-gray-700" : "bg-gray-900 text-white"
                      }`}
                      disabled={isCurrent || joining === group.group_id}
                    >
                      {isCurrent ? "Current" : joining === group.group_id ? "Joining..." : "Join"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && tab === "Invites" && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">Pending invites</div>
            {!user && (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
                Please log in to view invites.
              </div>
            )}
            {user && invitesLoading && (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">Loading invites...</div>
            )}
            {user && !invitesLoading && pendingInvites.length === 0 && (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">No pending invites.</div>
            )}
            {user && !invitesLoading && pendingInvites.length > 0 && (
              <div className="space-y-2">
                {pendingInvites.map((invite) => {
                  const isWorking = inviteActionId === invite.invite_id;
                  const inviterName =
                    invite.inviter?.display_name || invite.inviter?.username || "A group member";
                  return (
                    <div
                      key={invite.invite_id}
                      className="rounded-xl bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm text-gray-800">{invite.groups?.name || "Group invite"}</div>
                        <div className="text-xs text-gray-500">Invited by {inviterName}</div>
                        {invite.message && (
                          <div className="mt-1 text-xs text-gray-600">{invite.message}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInviteResponse(invite, "decline")}
                          className="rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-800"
                          disabled={isWorking}
                        >
                          {isWorking ? "Working..." : "Decline"}
                        </button>
                        <button
                          onClick={() => handleInviteResponse(invite, "accept")}
                          className="rounded-xl bg-gray-900 px-3 py-2 text-xs text-white"
                          disabled={isWorking}
                        >
                          {isWorking ? "Working..." : "Accept"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!loading && tab === "Send invite" && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">Send an invite</div>
            {!user && (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
                Please log in to send invites.
              </div>
            )}
            {user && !currentGroup && (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
                You must be in a group before you can invite others.
              </div>
            )}
            {user && currentGroup && (
              <>
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  Inviting to: {currentGroup.name}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="invite-username" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                    Username to invite
                  </label>
                  <input
                    id="invite-username"
                    className="app-input"
                    placeholder="Enter username..."
                    value={inviteTarget}
                    onChange={(e) => setInviteTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="invite-message" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                    Invite message
                  </label>
                  <input
                    id="invite-message"
                    className="app-input"
                    placeholder="Optional message..."
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSendInvite}
                  className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white"
                  disabled={sendingInvite}
                >
                  {sendingInvite ? "Sending..." : "Send invite"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      </PageShell>
    </>
  );
}
