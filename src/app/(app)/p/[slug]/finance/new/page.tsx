import type { Metadata } from "next";

import {
  CreateAccountForm,
  CreateTransactionForm,
} from "@/components/finance/finance-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isCloudinaryConfigured } from "@/server/documents/cloudinary";
import { listAccounts } from "@/server/finance/accounts";
import { listCategoriesForProject } from "@/server/finance/categories";

export const metadata: Metadata = {
  title: "New transaction",
};

export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [categories, accounts] = await Promise.all([
    listCategoriesForProject(slug),
    listAccounts(slug),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Add transaction
          </CardTitle>
          <CardDescription>
            Amounts are stored as integer paise. Private entries stay hidden
            from collaborators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTransactionForm
            slug={slug}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            cloudinaryReady={isCloudinaryConfigured()}
          />
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add an account first (optional)</CardTitle>
            <CardDescription>
              Track which bank/cash account paid the expense.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountForm slug={slug} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
