import test from "node:test";
import assert from "node:assert/strict";
import { commercialNextAction } from "../src/core/prime-commercial";

test("Prime commercial flow advances from offer to contract", () => {
  assert.equal(commercialNextAction({ event: "OFFER_CREATED" }).label, "Teklif takip et");
  assert.equal(commercialNextAction({ event: "OFFER_ACCEPTED" }).label, "Satış sözleşmesini takip et");
  assert.equal(commercialNextAction({ event: "SALE_CREATED" }).label, "Komisyon bilgisini tamamla");
});

test("Prime commercial flow advances from commission to payment", () => {
  assert.equal(commercialNextAction({ event: "COMMISSION_UPDATED" }).label, "Tahsilat bekleniyor");
  assert.equal(commercialNextAction({ event: "PAYMENT_PLAN_CREATED" }).label, "Tahsilat planını takip et");
  assert.equal(commercialNextAction({ event: "PAYMENT_RECEIVED", remainingAmount: 100 }).label, "Tahsilat bekleniyor");
  assert.equal(commercialNextAction({ event: "PAYMENT_RECEIVED", remainingAmount: 0 }).label, "Satış sonrası ilişkiyi takip et");
});

test("Prime commercial flow keeps cancelled sales actionable", () => {
  assert.equal(commercialNextAction({ event: "SALE_CANCELLED" }).label, "Yeni portföy eşleşmesi oluştur");
});
