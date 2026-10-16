// The create-stream form's field values, as persisted to a draft
// (lib/create-form-draft.ts) and consumed by useCreateStreamForm and
// CreateStreamFields.

/** The create-stream form's raw field values, before parsing/validation. */
export type FormDraft = {
  recipient: string;
  token: string;
  amount: string;
  start: string;
  end: string;
  cliff: string;
  /**
   * A shortcut that fills `end` from `start`: "30" + durationUnit "days" sets
   * end to 30 days after start. Stays in sync with `end` — editing `end`
   * directly re-calculates the displayed duration. See lib/duration.ts.
   */
  durationAmount: string;
  durationUnit: string;
};
