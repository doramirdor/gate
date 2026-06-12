import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient, type TokenRow } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: account } = await supabase
    .from("users")
    .select(
      "handle, tg_connect_code, tg_chat_id, quiet_hours_enabled, quiet_start, quiet_end, tz",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!account) redirect("/onboarding");

  // RLS scopes both tables to the owner; the explicit filter is belt-and-braces.
  const [{ data: tokens }, { data: rules }] = await Promise.all([
    supabase
      .from("tokens")
      .select("id, label, scopes, created_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("rules").select("rule").eq("user_id", user.id),
  ]);

  const spendRule = (rules ?? []).find(
    (row: { rule: { type?: string } | null }) =>
      row.rule?.type === "spend_threshold",
  );
  const rawAmount = (spendRule?.rule as { amount?: unknown } | null)?.amount;
  const spendThreshold = typeof rawAmount === "number" ? rawAmount : null;

  return (
    <AppShell handle={account.handle}>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Settings</h1>
      <SettingsClient
        handle={account.handle}
        tokens={(tokens ?? []) as TokenRow[]}
        spendThreshold={spendThreshold}
        telegram={{
          connectCode: account.tg_connect_code as string,
          connected: Boolean(account.tg_chat_id),
        }}
        quietHours={{
          enabled: account.quiet_hours_enabled as boolean,
          start: account.quiet_start as number,
          end: account.quiet_end as number,
          tz: (account.tz as string | null) ?? null,
        }}
      />
    </AppShell>
  );
}
