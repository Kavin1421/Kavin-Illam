/** Pure helpers — safe for Server and Client Components. */

export function loanTypeBadgeClass(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "bg-sky-100 text-sky-800";
    case "DEBIT_CONSTRUCTION":
      return "bg-emerald-100 text-emerald-800";
    case "DEBIT_OTHER":
      return "bg-amber-100 text-amber-900";
    case "CREDIT_REPAYMENT":
      return "bg-violet-100 text-violet-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function loanTypeShortLabel(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "Disbursement";
    case "DEBIT_CONSTRUCTION":
      return "Construction";
    case "DEBIT_OTHER":
      return "Rotational";
    case "CREDIT_REPAYMENT":
      return "Repayment";
    default:
      return type;
  }
}
