import { writeFileSync } from "node:fs";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { TransactionReceiptDocument } from "./src/server/pdf/transaction-receipt-document";
import type { TransactionReceiptData } from "./src/server/pdf/transaction-receipt-types";

const data: TransactionReceiptData = {
  projectName: "Kavin Illam",
  projectType: "RESIDENTIAL",
  generatedAt: new Date("2026-10-11T12:00:00Z"),
  transaction: {
    transactionNumber: "KIX-EXP-000008",
    type: "EXPENSE",
    status: "PAID",
    amount: 11000000,
    currency: "INR",
    contractAmount: 6000000,
    outOfContractAmount: 5000000,
    paidTo: "Engineer Ali",
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "664847610938",
    description: "Split of 75 plus 25 plus 10 inclusive of OOC in 50K",
    notes: null,
    transactionDate: new Date("2026-10-10T12:15:00Z"),
    createdAt: new Date("2026-10-10T12:15:00Z"),
    categoryName: "Civil work",
    accountName: "Indian Bank",
    createdBy: { name: "Kavinkumar K", email: "kkavinkumar24@gmail.com" },
    proofDocuments: [
      {
        id: "a",
        title: "Payment proof",
        documentNumber: "KIX-DOC-000011",
        fileName: "Payment-screenshot-1.jpeg",
        mimeType: "image/jpeg",
        href: "http://localhost:3002/p/kavin-illam/documents/a",
      },
    ],
  },
};

async function main() {
  const bytes = await renderToBuffer(
    React.createElement(TransactionReceiptDocument, {
      data,
    }) as Parameters<typeof renderToBuffer>[0],
  );
  writeFileSync("/tmp/kavin-receipt-check.pdf", Buffer.from(bytes));
  const text = Buffer.from(bytes).toString("latin1");
  console.log("bytes", bytes.byteLength);
  console.log("has Rs", text.includes("Rs."));
  console.log("has portal", text.includes("/p/kavin-illam/documents/a"));
  console.log("has open label", text.includes("Open in portal"));
}

void main();
