import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  labelFulfillment,
  labelPayment,
  labelStatus,
  nextActions,
  statusTone,
} from "./commerce.ts";

describe("commerce helpers", () => {
  it("maps order status labels", () => {
    assert.equal(labelStatus("pending"), "Pending");
    assert.equal(labelStatus("payment_submitted"), "Payment submitted");
  });

  it("uses translator when provided", () => {
    const t = (key: string) => (key === "orders.status_pending" ? "Ausstehend" : key);
    assert.equal(labelStatus("pending", t), "Ausstehend");
  });

  it("maps fulfillment and payment", () => {
    assert.equal(labelFulfillment("pickup"), "Pickup");
    assert.equal(labelPayment("bank_transfer"), "Bank transfer");
    assert.equal(labelPayment("jazzcash"), "JazzCash / Easypaisa");
  });

  it("returns status tones", () => {
    assert.equal(statusTone("completed"), "success");
    assert.equal(statusTone("cancelled"), "danger");
    assert.equal(statusTone("pending"), "warning");
  });

  it("suggests next actions for pending orders", () => {
    const actions = nextActions({
      status: "pending",
      fulfillment_type: "pickup",
      payment_method: "cash_on_pickup",
    });
    assert.ok(actions.includes("accepted"));
    assert.ok(actions.includes("cancelled"));
  });
});
