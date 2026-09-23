import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createCompanySchema = z.object({
  companyName: z.string().min(2).max(120),
  planSlug: z.string().min(1),
  storeName: z.string().min(2).max(120),
  storeCode: z.string().min(1).max(24),
  currency: z.string().min(3).max(3).default("USD"),
  timezone: z.string().default("UTC"),
  country: z.string().optional(),
  ownerName: z.string().optional(),
});

function slug(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/**
 * Creates a tenant: company, system roles, owner membership, first store,
 * first register and a trial subscription. Privileged because it must write
 * rows the caller has no membership for yet.
 */
export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createCompanySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const email = (context.claims as { email?: string }).email ?? null;

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, slug, trial_days, currency")
      .eq("slug", data.planSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    if (!plan) throw new Error("That plan is not available.");

    let base = slug(data.companyName) || "company";
    let candidate = base;
    for (let i = 0; i < 25; i++) {
      const { data: existing } = await supabaseAdmin.from("companies").select("id").eq("slug", candidate).maybeSingle();
      if (!existing) break;
      candidate = `${base}-${i + 2}`;
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.companyName,
        slug: candidate,
        currency: data.currency,
        timezone: data.timezone,
        country: data.country ?? null,
        email,
        created_by: userId,
        receipt_settings: { header: data.companyName, footer: "Thank you for shopping with us." },
        numbering_settings: { sale_prefix: "S", order_prefix: "O", po_prefix: "PO", next: 1 },
      })
      .select("id, name, slug, currency")
      .single();
    if (companyError) throw new Error(companyError.message);

    const { error: rolesError } = await supabaseAdmin.rpc("provision_company_roles", { _company: company.id });
    if (rolesError) throw new Error(rolesError.message);

    const { data: ownerRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("company_id", company.id)
      .eq("key", "owner")
      .single();

    await supabaseAdmin.from("profiles").upsert(
      { id: userId, email, full_name: data.ownerName ?? null },
      { onConflict: "id", ignoreDuplicates: false },
    );

    const { error: memberError } = await supabaseAdmin.from("memberships").insert({
      user_id: userId,
      company_id: company.id,
      role_id: ownerRole!.id,
      created_by: userId,
    });
    if (memberError) throw new Error(memberError.message);

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        company_id: company.id,
        name: data.storeName,
        code: data.storeCode.toUpperCase(),
        timezone: data.timezone,
        currency: data.currency,
        created_by: userId,
      })
      .select("id")
      .single();
    if (storeError) throw new Error(storeError.message);

    await supabaseAdmin.from("registers").insert({
      company_id: company.id,
      store_id: store.id,
      name: "Register 1",
      code: "R1",
    });

    const trialEnds = new Date(Date.now() + (plan.trial_days || 14) * 86_400_000).toISOString();
    await supabaseAdmin.from("subscriptions").insert({
      company_id: company.id,
      plan_id: plan.id,
      status: "trial",
      seats: 1,
      register_count: 1,
      currency: data.currency,
      trial_ends_at: trialEnds,
      current_period_end: trialEnds,
      expires_at: trialEnds,
    });

    await supabaseAdmin.from("audit_logs").insert({
      company_id: company.id,
      user_id: userId,
      actor_email: email,
      action: "company.created",
      entity_type: "company",
      entity_id: company.id,
      after_data: { name: company.name, plan: plan.slug },
    });

    await supabaseAdmin.from("notifications").insert({
      company_id: company.id,
      type: "subscription",
      severity: "info",
      title: "Trial started",
      body: `Your ${plan.slug} trial runs until ${new Date(trialEnds).toDateString()}.`,
      link: "/subscription",
    });

    return { companyId: company.id, storeId: store.id };
  });

const inviteCompanySchema = createCompanySchema.extend({
  adminEmail: z.string().email(),
  expiresAt: z.string().optional(),
  graceDays: z.coerce.number().int().min(0).max(120).default(7),
  alertLeadDays: z.coerce.number().int().min(0).max(120).default(14),
  fixedAlertEnabled: z.boolean().default(true),
  customAlertEnabled: z.boolean().default(false),
  customAlertMessage: z.string().optional(),
  billingModel: z.enum(["platform_fee", "per_user", "per_register", "platform_plus_usage"]).default("platform_fee"),
});

/** Super Admin "Invite company" wizard: creates the tenant and a pending admin invite. */
export const adminInviteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteCompanySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase.rpc("is_super_admin", { _uid: context.userId });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, trial_days")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (!plan) throw new Error("Plan not found");

    let base = slug(data.companyName) || "company";
    let candidate = base;
    for (let i = 0; i < 25; i++) {
      const { data: existing } = await supabaseAdmin.from("companies").select("id").eq("slug", candidate).maybeSingle();
      if (!existing) break;
      candidate = `${base}-${i + 2}`;
    }

    const { data: company, error } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.companyName,
        slug: candidate,
        currency: data.currency,
        timezone: data.timezone,
        country: data.country ?? null,
        email: data.adminEmail,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("provision_company_roles", { _company: company.id });
    const { data: adminRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("company_id", company.id)
      .eq("key", "owner")
      .single();

    const { data: store } = await supabaseAdmin
      .from("stores")
      .insert({
        company_id: company.id,
        name: data.storeName,
        code: data.storeCode.toUpperCase(),
        currency: data.currency,
        timezone: data.timezone,
        created_by: context.userId,
      })
      .select("id")
      .single();

    await supabaseAdmin.from("registers").insert({
      company_id: company.id,
      store_id: store!.id,
      name: "Register 1",
      code: "R1",
    });

    const expires = data.expiresAt ?? new Date(Date.now() + (plan.trial_days || 14) * 86_400_000).toISOString();
    await supabaseAdmin.from("subscriptions").insert({
      company_id: company.id,
      plan_id: plan.id,
      status: "trial",
      billing_model: data.billingModel,
      currency: data.currency,
      trial_ends_at: expires,
      current_period_end: expires,
      expires_at: expires,
      grace_days: data.graceDays,
      alert_lead_days: data.alertLeadDays,
      fixed_alert_enabled: data.fixedAlertEnabled,
      custom_alert_enabled: data.customAlertEnabled,
      custom_alert_message: data.customAlertMessage ?? null,
    });

    const { data: invite } = await supabaseAdmin
      .from("company_invites")
      .insert({
        company_id: company.id,
        email: data.adminEmail.toLowerCase(),
        role_id: adminRole!.id,
        created_by: context.userId,
      })
      .select("token")
      .single();

    await supabaseAdmin.from("audit_logs").insert({
      company_id: company.id,
      user_id: context.userId,
      action: "company.invited",
      entity_type: "company",
      entity_id: company.id,
      after_data: { admin_email: data.adminEmail, plan: data.planSlug, expires_at: expires },
    });

    return { companyId: company.id, inviteToken: invite?.token ?? null };
  });

/** Accepts a pending invite for the signed-in user's email address. */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ token: z.string().min(6) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = ((context.claims as { email?: string }).email ?? "").toLowerCase();

    const { data: invite } = await supabaseAdmin
      .from("company_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();

    if (!invite || invite.status !== "pending") throw new Error("This invitation is no longer valid.");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("This invitation has expired.");
    if (invite.email.toLowerCase() !== email) throw new Error("This invitation was sent to a different email address.");

    await supabaseAdmin.from("profiles").upsert({ id: context.userId, email }, { onConflict: "id" });
    await supabaseAdmin.from("memberships").insert({
      user_id: context.userId,
      company_id: invite.company_id,
      role_id: invite.role_id,
      store_id: invite.store_id,
      created_by: invite.created_by,
    });
    await supabaseAdmin
      .from("company_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    await supabaseAdmin.from("audit_logs").insert({
      company_id: invite.company_id,
      user_id: context.userId,
      actor_email: email,
      action: "invite.accepted",
      entity_type: "membership",
    });

    return { companyId: invite.company_id };
  });

/** Ensures a profile row exists for the signed-in user. */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ fullName: z.string().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", context.userId)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("profiles").insert({ id: context.userId, email, full_name: data.fullName ?? null });
    } else if (data.fullName && !existing.full_name) {
      await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", context.userId);
    }
    return { ok: true };
  });
