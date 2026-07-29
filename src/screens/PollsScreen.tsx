import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui/Misc";
import { Button, FAB } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { CheckIcon, PlusIcon, TrashIcon, VoteIcon } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { newPoll, optionPct, toggleVote, totalVotes, usePollStore } from "@/store/usePollStore";

export default function PollsScreen() {
  const { user } = useAuthStore();
  const { items, init, add, update, remove } = usePollStore();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => init(), [init]);

  const polls = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <AppShell title="הצבעות">
      {polls.length === 0 ? (
        <EmptyState
          icon={<VoteIcon width={36} height={36} />}
          title="אין עדיין הצבעות"
          subtitle="לאן לאכול? חוף או בריכה? תנו לכולן להצביע בזמן אמת"
        />
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const total = totalVotes(poll);
            const myVotes = user
              ? poll.options.filter((o) => o.votes.includes(user.name)).map((o) => o.id)
              : [];
            return (
              <Card key={poll.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-aegean-900 flex-1">{poll.question}</h3>
                  {user?.name === poll.createdBy && (
                    <button
                      onClick={() => remove(poll.id)}
                      className="p-1 text-red-300 active:bg-red-50 rounded-full"
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {poll.options.map((opt) => {
                    const pct = optionPct(poll, opt);
                    const voted = myVotes.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => user && update(poll.id, toggleVote(poll, opt.id, user.name))}
                        className={`w-full text-right p-2.5 rounded-xl border transition-colors ${
                          voted ? "border-aegean-400 bg-aegean-50" : "border-aegean-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-aegean-800">
                            {voted && <CheckIcon width={14} height={14} className="text-aegean-500" />}
                            {opt.label}
                          </span>
                          <span className="text-xs font-bold text-aegean-500">{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} />
                        {opt.votes.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {opt.votes.map((g) => (
                              <Avatar key={g} name={g} size={18} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-aegean-400 mt-3">
                  {total} הצבעות · נוצר ע״י {poll.createdBy}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <FAB label="הצבעה חדשה" icon={<PlusIcon />} onClick={() => setFormOpen(true)} />
      <NewPollSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={async (poll) => {
          await add(poll);
          setFormOpen(false);
        }}
      />
    </AppShell>
  );
}

function NewPollSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (poll: ReturnType<typeof newPoll>) => void;
}) {
  const { user } = useAuthStore();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiChoice, setMultiChoice] = useState(false);

  useEffect(() => {
    if (open) {
      setQuestion("");
      setOptions(["", ""]);
      setMultiChoice(false);
    }
  }, [open]);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  const validOptions = options.filter((o) => o.trim());

  return (
    <Sheet open={open} onClose={onClose} title="הצבעה חדשה">
      <Field label="השאלה">
        <TextInput
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="איפה אוכלות הערב?"
        />
      </Field>
      <Field label="אפשרויות">
        <div className="space-y-2">
          {options.map((opt, i) => (
            <TextInput
              key={i}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`אפשרות ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setOptions((prev) => [...prev, ""])}
          className="text-xs font-semibold text-aegean-500 mt-2"
        >
          + אפשרות נוספת
        </button>
      </Field>

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={multiChoice}
          onChange={(e) => setMultiChoice(e.target.checked)}
          className="w-5 h-5 accent-aegean-500"
        />
        <span className="text-sm text-aegean-700 font-semibold">לאפשר בחירה מרובה</span>
      </label>

      <Button
        fullWidth
        size="lg"
        disabled={!question || validOptions.length < 2 || !user}
        onClick={() => user && onSave(newPoll(question, validOptions, user.name, multiChoice))}
      >
        פתיחת הצבעה
      </Button>
    </Sheet>
  );
}
