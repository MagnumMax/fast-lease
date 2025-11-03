#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

async function deleteTestDeal() {
  const dealId = "lease-6982-38321982-db01-5eb8-bee2-f2706489e5b9";
  
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
  
  console.log(`Attempting to delete test deal: ${dealId}`);
  
  try {
    // First, get deal info
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, deal_number, client_id, vehicle_id, application_id")
      .eq("id", dealId)
      .single();
      
    if (dealError) {
      console.log("Deal not found or error:", dealError.message);
      return;
    }
    
    console.log("Found deal:", deal);
    
    // Delete in correct order due to foreign key constraints
    console.log("Deleting related data...");
    
    // 1. Delete deal events
    const { error: eventsError } = await supabase
      .from("deal_events")
      .delete()
      .eq("deal_id", dealId);
    if (eventsError) {
      console.warn("Warning: Failed to delete deal_events:", eventsError.message);
    } else {
      console.log("✓ Deleted deal_events");
    }
    
    // 2. Delete deal documents
    const { error: documentsError } = await supabase
      .from("deal_documents")
      .delete()
      .eq("deal_id", dealId);
    if (documentsError) {
      console.warn("Warning: Failed to delete deal_documents:", documentsError.message);
    } else {
      console.log("✓ Deleted deal_documents");
    }
    
    // 3. Delete deal
    const { error: dealDeleteError } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId);
    if (dealDeleteError) {
      throw new Error(`Failed to delete deal: ${dealDeleteError.message}`);
    }
    console.log("✓ Deleted deal");
    
    // 4. Delete application
    if (deal.application_id) {
      const { error: appError } = await supabase
        .from("applications")
        .delete()
        .eq("id", deal.application_id);
      if (appError) {
        console.warn("Warning: Failed to delete application:", appError.message);
      } else {
        console.log("✓ Deleted application");
      }
    }
    
    // 5. Delete vehicle
    if (deal.vehicle_id) {
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", deal.vehicle_id);
      if (vehicleError) {
        console.warn("Warning: Failed to delete vehicle:", vehicleError.message);
      } else {
        console.log("✓ Deleted vehicle");
      }
    }
    
    // 6. Delete client profile and user
    if (deal.client_id) {
      // Delete profile first
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", deal.client_id);
      if (profileError) {
        console.warn("Warning: Failed to delete profile:", profileError.message);
      } else {
        console.log("✓ Deleted profile");
      }
      
      // Delete user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", deal.client_id);
      if (roleError) {
        console.warn("Warning: Failed to delete user role:", roleError.message);
      } else {
        console.log("✓ Deleted user role");
      }
      
      // Delete auth user (this might fail if user has other data)
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(deal.client_id);
        if (authError) {
          console.warn("Warning: Failed to delete auth user (may have other data):", authError.message);
        } else {
          console.log("✓ Deleted auth user");
        }
      } catch (authError) {
        console.warn("Warning: Auth user deletion failed:", authError.message);
      }
    }
    
    console.log("\n✅ Test deal and all related data deleted successfully!");
    
  } catch (error) {
    console.error("❌ Error deleting test deal:", error.message);
    process.exit(1);
  }
}

deleteTestDeal();