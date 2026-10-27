import { StrKey, xdr } from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { extractFailureString } from "@/lib/contract-confirm";

function diagnosticEvent(contractId: Buffer): xdr.DiagnosticEvent {
  const errorTopic = xdr.ScVal.scvError(xdr.ScError.sceContract(10));
  const event = new xdr.ContractEvent({
    ext: new xdr.ExtensionPoint(0),
    contractId: contractId as unknown as xdr.ContractId,
    type: xdr.ContractEventType.contract(),
    body: new xdr.ContractEventBody(
      0,
      new xdr.ContractEventV0({
        topics: [xdr.ScVal.scvSymbol("error"), errorTopic],
        data: xdr.ScVal.scvString("contract error"),
      }),
    ),
  });

  return new xdr.DiagnosticEvent({ inSuccessfulContractCall: false, event });
}

describe("extractFailureString", () => {
  afterEach(() => vi.restoreAllMocks());

  it("includes the encoded contract address from a real diagnostic XDR event", () => {
    const contractId = Buffer.alloc(32, 7);
    const event = diagnosticEvent(contractId);
    const failure = extractFailureString({
      diagnosticEventsXdr: [event],
    } as Parameters<typeof extractFailureString>[0]);

    expect(failure).toContain(`contract:${StrKey.encodeContract(contractId)}`);
    expect(failure).toContain("Error(Contract, #10)");
  });

  it("logs diagnostic parsing failures at debug level", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const event = {
      event: () => {
        throw new Error("unexpected XDR shape");
      },
    } as unknown as xdr.DiagnosticEvent;

    expect(extractFailureString({
      diagnosticEventsXdr: [event],
    } as Parameters<typeof extractFailureString>[0])).toBe("");
    expect(debug).toHaveBeenCalledWith(
      "Unable to inspect a diagnostic event for a contract error",
      expect.any(Error),
    );
  });
});
