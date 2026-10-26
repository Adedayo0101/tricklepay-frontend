
"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import { useWallet } from "@/components/wallet-provider";
import { useFormNavigationWarning } from "@/hooks/use-form-navigation-warning";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import {
  confirmTransaction,
  estimateCreateStreamFee,
  TransactionTimeoutError,
} from "@/lib/contract";
import {
  TX_CONFIRMATION_TIMED_OUT_AGAIN_MESSAGE,
  TX_FAILED_CONFIRM_MESSAGE,
  wrongNetworkMessage,
} from "@/lib/contract-messages";
import {
  clearFormDraft,
  EMPTY_FORM_DRAFT,
  readFormDraft,
  writeFormDraft,
} from "@/lib/create-form-draft";
import { submitCreateStream } from "@/lib/create-stream-submission";
import {
  amountFieldError,
  cliffFieldError,
  CREATE_STREAM_REQUIRED_MESSAGES,
  endFieldError,
  recipientFieldError,
  tokenFieldError,
  validateCreateStreamForm,
} from "@/lib/create-stream-validation";
import {
  addDurationToLocal,
  deriveDuration,
  durationFieldError,
  isDurationUnit,
} from "@/lib/duration";
import { formatDuration } from "@/lib/format";
import {
  clearLastToken,
  readLastToken,
  writeLastToken,
} from "@/lib/last-token";
import { setPendingNotice } from "@/lib/pending-notice";
import { applySchedulePreset, SCHEDULE_PRESETS } from "@/lib/schedule-presets";
import { readTokenBalance } from "@/lib/token-balance";
import {
  DEFAULT_TOKEN_DECIMALS,
  getCachedTokenDecimals,
  readTokenDecimals,
} from "@/lib/token-decimals";
import {
  getCachedTokenMetadata,
  readTokenMetadata,
} from "@/lib/token-metadata";
import {
  isValidContractAddress,
  parseAmount,
  toUnix,
} from "@/lib/validation";
import { vestingRatePerDay } from "@/lib/vesting";
import type {
  BalanceCheck,
  CreateStreamParams,
  FeeEstimate,
  TxStage,
} from "@/types/contract";
import type { FormDraft } from "@/types/form";

export type CreateFormField = keyof FormDraft;
export type CreateFormErrors = Partial<Record<CreateFormField, string>>;

// Excludes durationUnit: it is a select with a fixed set of options.
export type FocusableCreateFormField = Exclude<
  CreateFormField,
  "durationUnit"
>;

export type CreateFormRefs = Record<
  FocusableCreateFormField,
  RefObject<HTMLInputElement | null>
>;

/** Everything CreateForm needs from useCreateStreamForm. */
export interface CreateStreamForm {
  sender: string | null;
  values: FormDraft;
  errors: CreateFormErrors;
  refs: CreateFormRefs;
  setField: (field: CreateFormField, value: string) => void;
  applyPreset: (presetId: string) => void;
  previewRate: bigint | null;
  previewDuration: string | null;
  addressesValid: boolean;
  mismatch: boolean;
  submitting: boolean;
  stage: TxStage | null;
  timeoutHash: string | null;
  error: string | null;
  prepared: CreateStreamParams | null;
  tokenDecimals: number;
  decimalsNotice: string | null;
  feeEstimate: FeeEstimate;
  balanceCheck: BalanceCheck;
  rememberedToken: string | null;
  clearRememberedToken: () => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  handleConfirm: () => Promise<void>;
  handleRecoverTimeout: () => Promise<void>;
  backToEdit: () => void;
}

// Fields in on-screen order. Cliff is the only optional field.
const FIELD_ORDER: FocusableCreateFormField[] = [
  "recipient",
  "token",
  "amount",
  "start",
  "durationAmount",
  "end",
  "cliff",
];

/**
 * Owns the create-stream form's data handling: field values, persisted drafts,
 * live validation, review, and transaction submission/recovery.
 */
export function useCreateStreamForm(): CreateStreamForm {
  const wallet = useWallet();
  const { mismatch, walletNetwork, expectedNetwork } = useNetworkGuard();
  const router = useRouter();

  const [values, setValues] = useState<FormDraft>(() => {
    const draft = readFormDraft();

    if (draft) return draft;

    return {
      ...EMPTY_FORM_DRAFT,
      token: readLastToken() ?? "",
    };
  });

  const [restoredFromDraft] = useState(
    () => readFormDraft() !== null,
  );

  const [rememberedToken, setRememberedToken] = useState<string | null>(
    () => readLastToken(),
  );

  const [tokenDecimals, setTokenDecimals] = useState<number>(() => {
    return (
      (values.token ? getCachedTokenDecimals(values.token) : null) ??
      DEFAULT_TOKEN_DECIMALS
    );
  });

  const [decimalsNotice, setDecimalsNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<CreateFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<TxStage | null>(null);
  const [timeoutHash, setTimeoutHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<CreateStreamParams | null>(null);

  // Best-effort network-fee estimate.
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate>({
    status: "unavailable",
  });

  const feeEstimateToken = useRef(0);

  // Best-effort sender token-balance check.
  const [balanceCheck, setBalanceCheck] = useState<BalanceCheck>({
    status: "unavailable",
  });

  const balanceCheckToken = useRef(0);

  // Refs used to focus the first invalid field.
  const refs: CreateFormRefs = {
    recipient: useRef<HTMLInputElement>(null),
    token: useRef<HTMLInputElement>(null),
    amount: useRef<HTMLInputElement>(null),
    start: useRef<HTMLInputElement>(null),
    end: useRef<HTMLInputElement>(null),
    cliff: useRef<HTMLInputElement>(null),
    durationAmount: useRef<HTMLInputElement>(null),
  };

  const {
    recipient,
    token,
    amount,
    start,
    end,
    cliff,
    durationAmount,
    durationUnit,
  } = values;

  const amountRef = useRef(amount);
  amountRef.current = amount;

  function setFieldErrors(next: CreateFormErrors) {
    setErrors((prev) => ({ ...prev, ...next }));
  }

  // Fills end from start + duration when the duration is valid.
  function applyDurationIfSet(
    nextStart: string,
    nextAmount: string,
    nextUnit: string,
  ): boolean {
    if (
      !isDurationUnit(nextUnit) ||
      durationFieldError(nextAmount) ||
      !nextAmount
    ) {
      return false;
    }

    const computedEnd = addDurationToLocal(
      nextStart,
      nextAmount,
      nextUnit,
    );

    if (computedEnd === null) return false;

    setValues((prev) => ({ ...prev, end: computedEnd }));

    setFieldErrors({
      end: endFieldError(nextStart, computedEnd),
      ...(cliff
        ? {
            cliff: cliffFieldError(
              nextStart,
              computedEnd,
              cliff,
            ),
          }
        : {}),
    });

    return true;
  }

  // Load token decimals whenever the token changes.
  useEffect(() => {
    if (!token || !isValidContractAddress(token)) {
      setTokenDecimals(DEFAULT_TOKEN_DECIMALS);
      setDecimalsNotice(null);
      return;
    }

    let active = true;

    if (!getCachedTokenMetadata(token)) {
      readTokenMetadata(token).catch(() => {});
    }

    readTokenDecimals(token)
      .then((dec) => {
        if (!active) return;

        setTokenDecimals(dec);
        setDecimalsNotice(null);

        const currentAmount = amountRef.current;

        if (currentAmount) {
          setFieldErrors({
            amount: amountFieldError(currentAmount, dec),
          });
        }
      })
      .catch(() => {
        if (!active) return;

        setTokenDecimals(DEFAULT_TOKEN_DECIMALS);
        setDecimalsNotice(
          "Could not read token decimals from contract. Defaulting to 7 decimals.",
        );

        const currentAmount = amountRef.current;

        if (currentAmount) {
          setFieldErrors({
            amount: amountFieldError(
              currentAmount,
              DEFAULT_TOKEN_DECIMALS,
            ),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Updates one field and revalidates dependent fields.
  function setField(field: CreateFormField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));

    switch (field) {
      case "recipient":
        setFieldErrors({ recipient: recipientFieldError(value) });
        break;

      case "token":
        setFieldErrors({ token: tokenFieldError(value) });
        break;

      case "amount":
        setFieldErrors({
          amount: amountFieldError(value, tokenDecimals),
        });
        break;

      case "start": {
        const applied = applyDurationIfSet(
          value,
          durationAmount,
          durationUnit,
        );

        const endErr =
          !applied && value && end
            ? endFieldError(value, end)
            : undefined;

        setFieldErrors({
          start: value
            ? undefined
            : CREATE_STREAM_REQUIRED_MESSAGES.start,
          ...(!applied && value && end
            ? { end: endErr }
            : {}),
          ...(!applied && value && cliff
            ? { cliff: cliffFieldError(value, end, cliff) }
            : {}),
        });

        if (!applied && value && end && !endErr) {
          const derived = deriveDuration(value, end, durationUnit);

          if (derived) {
            setValues((prev) => ({
              ...prev,
              durationAmount: derived.amount,
              durationUnit: derived.unit,
            }));

            setFieldErrors({ durationAmount: undefined });
          }
        }

        break;
      }

      case "end": {
        if (!value) {
          setFieldErrors({
            end: CREATE_STREAM_REQUIRED_MESSAGES.end,
            durationAmount: undefined,
          });

          setValues((prev) => ({
            ...prev,
            durationAmount: "",
          }));

          break;
        }

        const endErr = start ? endFieldError(start, value) : undefined;

        setFieldErrors({
          end: endErr,
          ...(cliff
            ? { cliff: cliffFieldError(start, value, cliff) }
            : {}),
        });

        if (start && !endErr) {
          const derived = deriveDuration(start, value, durationUnit);

          if (derived) {
            setValues((prev) => ({
              ...prev,
              durationAmount: derived.amount,
              durationUnit: derived.unit,
            }));

            setFieldErrors({ durationAmount: undefined });
          }
        }

        break;
      }

      case "cliff":
        setFieldErrors({
          cliff: value
            ? cliffFieldError(start, end, value)
            : undefined,
        });
        break;

      case "durationAmount":
        setFieldErrors({
          durationAmount: durationFieldError(value),
        });

        applyDurationIfSet(start, value, durationUnit);
        break;

      case "durationUnit":
        applyDurationIfSet(start, durationAmount, value);
        break;
    }
  }

  // Apply a schedule preset without changing recipient, token, or amount.
  function applyPreset(presetId: string) {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === presetId);

    if (!preset) return;

    const applied = applySchedulePreset(preset, start);

    if (!applied) return;

    const cliffValue = applied.cliff ?? "";

    setValues((prev) => ({
      ...prev,
      start: applied.start,
      end: applied.end,
      cliff: cliffValue,
      durationAmount: preset.duration.amount,
      durationUnit: preset.duration.unit,
    }));

    setFieldErrors({
      start: undefined,
      end: endFieldError(applied.start, applied.end),
      cliff: cliffFieldError(
        applied.start,
        applied.end,
        cliffValue,
      ),
      durationAmount: undefined,
    });
  }

  const addressesValid =
    !!recipient &&
    !!token &&
    !recipientFieldError(recipient) &&
    !tokenFieldError(token);

  // Live vesting-rate preview.
  const previewRate =
    amount &&
    start &&
    end &&
    !errors.amount &&
    !errors.start &&
    !errors.end
      ? vestingRatePerDay(
          parseAmount(amount, tokenDecimals),
          toUnix(start),
          toUnix(end),
        )
      : null;

  // Live duration preview.
  const previewDuration =
    start && end && !errors.start && !errors.end
      ? formatDuration(toUnix(end) - toUnix(start))
      : null;

  const hasUnsavedChanges =
    prepared !== null ||
    [
      recipient,
      token,
      amount,
      start,
      end,
      cliff,
      durationAmount,
    ].some((value) => value.trim().length > 0);

  const navigationMessage = restoredFromDraft
    ? "You have a restored draft. Your progress is saved and will be here when you return."
    : "You have unsaved changes in this stream form. Leaving now will discard them.";

  useFormNavigationWarning(
    hasUnsavedChanges && !submitting,
    navigationMessage,
  );

  // Persist the form draft.
  useEffect(() => {
    const draft = {
      recipient,
      token,
      amount,
      start,
      end,
      cliff,
      durationAmount,
      durationUnit,
    };

    const hasAnyValue = [
      recipient,
      token,
      amount,
      start,
      end,
      cliff,
      durationAmount,
    ].some((value) => value.trim().length > 0);

    if (!hasAnyValue) {
      clearFormDraft();
      return;
    }

    writeFormDraft(draft);
  }, [
    amount,
    cliff,
    durationAmount,
    durationUnit,
    end,
    recipient,
    start,
    token,
  ]);

  // Best-effort fee estimate; failures never block confirmation.
  async function estimateFee(params: CreateStreamParams) {
    const requestToken = ++feeEstimateToken.current;

    setFeeEstimate({ status: "loading" });

    try {
      const stroops = await estimateCreateStreamFee(params);

      if (requestToken === feeEstimateToken.current) {
        setFeeEstimate({ status: "ready", stroops });
      }
    } catch {
      if (requestToken === feeEstimateToken.current) {
        setFeeEstimate({ status: "unavailable" });
      }
    }
  }

  // Best-effort sender balance check.
  async function checkBalance(params: CreateStreamParams) {
    const requestToken = ++balanceCheckToken.current;

    setBalanceCheck({ status: "loading" });

    try {
      const balance = await readTokenBalance(
        params.token,
        params.sender,
      );

      if (requestToken !== balanceCheckToken.current) return;

      const shortfall =
        balance < params.totalAmount
          ? params.totalAmount - balance
          : null;

      setBalanceCheck({ status: "ready", balance, shortfall });
    } catch {
      if (requestToken === balanceCheckToken.current) {
        setBalanceCheck({ status: "unavailable" });
      }
    }
  }

  // Clear the remembered token without changing the current field value.
  function clearRememberedToken() {
    clearLastToken();
    setRememberedToken(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (submitting || !wallet.address) return;

    setError(null);

    if (mismatch) {
      setError(
        wrongNetworkMessage(
          walletNetwork ?? "unknown",
          expectedNetwork,
        ),
      );

      return;
    }

    const validationErrors = validateCreateStreamForm(
      values,
      tokenDecimals,
    );

    setErrors(validationErrors);

    const firstInvalid = FIELD_ORDER.find(
      (field) => !!validationErrors[field],
    );

    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    const startTime = toUnix(start);
    const endTime = toUnix(end);
    const cliffTime = cliff ? toUnix(cliff) : startTime;

    const params: CreateStreamParams = {
      sender: wallet.address,
      recipient,
      token,
      totalAmount: parseAmount(amount, tokenDecimals),
      startTime,
      endTime,
      cliffTime,
    };

    setPrepared(params);

    // Remember the validated token for the next stream.
    writeLastToken(token);
    setRememberedToken(token);

    // These background checks never block the review screen.
    void estimateFee(params);
    void checkBalance(params);
  }

  async function handleConfirm() {
    if (!prepared || submitting) return;

    setError(null);
    setSubmitting(true);
    setStage("preparing");

    try {
      const result = await submitCreateStream(
        prepared,
        (s) => setStage(s),
      );

      if (result.ok) {
        setPendingNotice({
          message: "Stream created.",
          hash: result.hash,
        });

        setTimeoutHash(null);
        clearFormDraft();
        router.push("/");
      } else {
        if (result.timeoutHash) {
          setTimeoutHash(result.timeoutHash);
        }

        setError(result.message);
      }
    } finally {
      setSubmitting(false);
      setStage(null);
    }
  }

  async function handleRecoverTimeout() {
    if (!timeoutHash) return;

    setSubmitting(true);
    setStage("confirming");
    setError(null);

    try {
      await confirmTransaction(
        timeoutHash,
        (s) => setStage(s),
      );

      setPendingNotice({
        message: "Stream created.",
        hash: timeoutHash,
      });

      setTimeoutHash(null);
      clearFormDraft();
      router.push("/");
    } catch (err) {
      if (err instanceof TransactionTimeoutError) {
        setError(TX_CONFIRMATION_TIMED_OUT_AGAIN_MESSAGE);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : TX_FAILED_CONFIRM_MESSAGE,
        );
      }
    } finally {
      setSubmitting(false);
      setStage(null);
    }
  }

  function backToEdit() {
    // Invalidate in-flight reads so stale results cannot overwrite
    // the next review.
    feeEstimateToken.current += 1;
    setFeeEstimate({ status: "unavailable" });

    balanceCheckToken.current += 1;
    setBalanceCheck({ status: "unavailable" });

    setPrepared(null);
  }

  return {
    sender: wallet.address,
    values,
    errors,
    refs,
    setField,
    applyPreset,
    previewRate,
    previewDuration,
    addressesValid,
    mismatch,
    submitting,
    stage,
    timeoutHash,
    error,
    prepared,
    tokenDecimals,
    decimalsNotice,
    feeEstimate,
    balanceCheck,
    rememberedToken,
    clearRememberedToken,
    handleSubmit,
    handleConfirm,
    handleRecoverTimeout,
    backToEdit,
  };
}
