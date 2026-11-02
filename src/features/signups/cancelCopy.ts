// cancelCopy: the words for the three ways to give up a place (all POST /signups/{id}/cancellation),
// shared by the Event detail panel and My events so both ask the same question.
// Each one can't be undone, so each sits behind a danger ConfirmDialog that names the action.

export type CancelCopy = {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  keepLabel: string;
  doneTitle: string;
};

export const GIVE_UP_COPY: CancelCopy = {
  label: "Give up my seat",
  title: "Give up your seat?",
  description: "Your seat goes to the next person in line. To come back, you'd book again. You can't undo this.",
  confirmLabel: "Give up seat",
  keepLabel: "Keep my seat",
  doneTitle: "You've given up your seat",
};

export const LEAVE_LINE_COPY: CancelCopy = {
  label: "Leave the line",
  title: "Leave the line?",
  description: "You'll lose your place. To come back, you'd join at the back. You can't undo this.",
  confirmLabel: "Leave the line",
  keepLabel: "Stay in line",
  doneTitle: "You've left the line",
};

export const DECLINE_COPY: CancelCopy = {
  label: "Decline",
  title: "Decline this seat?",
  description: "The seat goes to the next person in line and you leave the line. You can't undo this.",
  confirmLabel: "Decline seat",
  keepLabel: "Keep the offer",
  doneTitle: "You've declined the seat",
};
