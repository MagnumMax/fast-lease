#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

async function deleteE2EClient() {
  const clientId = "8fa7a170-5dc2-47ba-898a-3aa30595cfb4";

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing environment variables:");
    console.error("- NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "set" : "missing");
    console.error("- SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "set" : "missing");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`Attempting to delete E2E client: ${clientId}`);

  try {
    // First, get client info
    const { data: client, error: clientError } = await supabase
      .from("profiles")
      .select("id, full_name, user_id")
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.log("Client not found or error:", clientError.message);
      return;
    }

    console.log("Found client:", client);

    // Delete in correct order due to foreign key constraints
    console.log("Deleting related data...");

    // 1. Delete any deals associated with this client
    const { data: clientDeals, error: dealsError } = await supabase
      .from("deals")
      .select("id")
      .eq("client_id", client.user_id);

    if (clientDeals && clientDeals.length > 0) {
      console.log(`Found ${clientDeals.length} deals to delete first...`);

      for (const deal of clientDeals) {
        // Delete deal events
        const { error: eventsError } = await supabase
          .from("deal_events")
          .delete()
          .eq("deal_id", deal.id);
        if (eventsError) console.warn("Warning: Failed to delete deal_events:", eventsError.message);
        else console.log(`✓ Deleted deal_events for deal ${deal.id}`);

        // Delete deal documents
        const { error: documentsError } = await supabase
          .from("deal_documents")
          .delete()
          .eq("deal_id", deal.id);
        if (documentsError) console.warn("Warning: Failed to delete deal_documents:", documentsError.message);
        else console.log(`✓ Deleted deal_documents for deal ${deal.id}`);

        // Delete the deal itself
        const { error: dealDeleteError } = await supabase
          .from("deals")
          .delete()
          .eq("id", deal.id);
        if (dealDeleteError) console.warn("Warning: Failed to delete deal:", dealDeleteError.message);
        else console.log(`✓ Deleted deal ${deal.id}`);
      }
    }

    // 2. Delete profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", clientId);
    if (profileError) {
      throw new Error(`Failed to delete profile: ${profileError.message}`);
    }
    console.log("✓ Deleted profile");

    // 3. Delete user role
    const { error: roleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", client.user_id);
    if (roleError) {
      console.warn("Warning: Failed to delete user role:", roleError.message);
    } else {
      console.log("✓ Deleted user role");
    }

    // 4. Delete auth user (this might fail if user has other data)
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(client.user_id);
      if (authError) {
        console.warn("Warning: Failed to delete auth user (may have other data):", authError.message);
      } else {
        console.log("✓ Deleted auth user");
      }
    } catch (authError) {
      console.warn("Warning: Auth user deletion failed:", authError.message);
    }

    console.log("\n✅ E2E client and all related data deleted successfully!");

  } catch (error) {
    console.error("❌ Error deleting E2E client:", error.message);
    process.exit(1);
  }
}

deleteE2EClient();