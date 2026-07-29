import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { GirlName, Poll, PollOption } from "@/types";

export const usePollStore = createCloudStore<Poll>("polls");

export function newPoll(
  question: string,
  optionLabels: string[],
  createdBy: GirlName,
  multiChoice: boolean
): Poll {
  const options: PollOption[] = optionLabels
    .filter((l) => l.trim())
    .map((label) => ({ id: uuid(), label: label.trim(), votes: [] }));
  return {
    id: uuid(),
    question,
    options,
    createdBy,
    createdAt: new Date().toISOString(),
    closed: false,
    multiChoice,
  };
}

export function toggleVote(poll: Poll, optionId: string, girl: GirlName): Poll {
  const options = poll.options.map((opt) => {
    const hasVoted = opt.votes.includes(girl);
    if (opt.id === optionId) {
      return {
        ...opt,
        votes: hasVoted ? opt.votes.filter((g) => g !== girl) : [...opt.votes, girl],
      };
    }
    // single-choice: remove her vote from other options
    if (!poll.multiChoice && hasVoted) {
      return { ...opt, votes: opt.votes.filter((g) => g !== girl) };
    }
    return opt;
  });
  return { ...poll, options };
}

export function totalVotes(poll: Poll): number {
  return poll.options.reduce((sum, o) => sum + o.votes.length, 0);
}

export function optionPct(poll: Poll, option: PollOption): number {
  const total = totalVotes(poll);
  if (total === 0) return 0;
  return Math.round((option.votes.length / total) * 100);
}
