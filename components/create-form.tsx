"use client";

import type { JSX } from "react";

import { CreateStreamFields } from "@/components/create-stream-fields";
import { StreamReview } from "@/components/stream-review";
import { TimeoutRecoveryAlert } from "@/components/timeout-recovery-alert";
import { TransactionProgress } from "@/components/transaction-progress";
import { useCreateStreamForm } from "@/hooks/use-create-stream-form";

/**
 * Create-stream flow: the form, then a review step before signing. Data
 * handling lives in useCreateStreamForm; this component only picks which
 * phase to render.
 */
export function CreateForm(): JSX.Element {
  const form = useCreateStreamForm();

  if (!form.sender) {
    return <p className="text-sm text-neutral-400">Connect your wallet to create a stream.</p>;
  }

  // Transaction feedback shared by both phases so progress, timeout recovery,
  // and errors stay visible whether the user is on the form or the review.
  const feedback = (
    <>
      <TransactionProgress stage={form.stage} />

      {form.timeoutHash && (
        <TimeoutRecoveryAlert
          hash={form.timeoutHash}
          disabled={form.submitting}
          onRecheck={() => void form.handleRecoverTimeout()}
        />
      )}

      {form.error && <p role="alert" className="text-sm text-red-400">{form.error}</p>}
    </>
  );

  if (form.prepared) {
    return (
      <div className="flex flex-col gap-4">
        <StreamReview
          params={form.prepared}
          submitting={form.submitting}
          onBack={form.backToEdit}
          onConfirm={() => void form.handleConfirm()}
        />
        {feedback}
      </div>
    );
  }

  return (
    <CreateStreamFields
      values={form.values}
      errors={form.errors}
      refs={form.refs}
      onFieldChange={form.setField}
      previewRate={form.previewRate}
      previewDuration={form.previewDuration}
      feedback={feedback}
      submitting={form.submitting}
      submitDisabled={form.submitting || form.mismatch || !form.addressesValid}
      onSubmit={(e) => void form.handleSubmit(e)}
    />
  );
}
