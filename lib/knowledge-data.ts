export type KnowledgeArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
};

export const initialKnowledgeArticles: KnowledgeArticle[] = [
  {
    id: "refunds-and-billing",
    slug: "refunds-and-billing",
    title: "Refunds and billing",
    summary: "How subscription charges and refunds work.",
    content: "If a customer was charged twice for the same subscription period, verify both transactions in Billing before issuing a refund. Refunds are returned to the original payment method and usually appear within 5–10 business days. Contact billing support if either transaction is still pending.",
    status: "PUBLISHED",
    updatedAt: "2026-10-24T10:00:00.000Z",
  },
  {
    id: "download-invoices",
    slug: "download-invoices",
    title: "Download your invoices",
    summary: "Find and export invoices from workspace settings.",
    content: "Workspace admins can find invoices under Settings, then Billing, then Invoice history. Choose a billing period and select Download PDF. Only workspace admins and billing contacts can access invoices.",
    status: "PUBLISHED",
    updatedAt: "2026-10-24T09:30:00.000Z",
  },
  {
    id: "password-reset",
    slug: "password-reset",
    title: "Reset an expired password link",
    summary: "Request a fresh password reset email.",
    content: "Password reset links expire after 30 minutes and can be used once. Request a new link from the sign-in page. If the email does not arrive, check spam and confirm the address associated with the account.",
    status: "PUBLISHED",
    updatedAt: "2026-10-24T09:00:00.000Z",
  },
];