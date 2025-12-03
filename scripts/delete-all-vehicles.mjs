#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

async function deleteAllVehicles() {
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

  console.log("Attempting to delete all vehicles...");

  try {
    // First, get all vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, make, model, vin");

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError.message);
      process.exit(1);
    }

    if (!vehicles || vehicles.length === 0) {
      console.log("No vehicles found to delete.");
      return;
    }

    console.log(`Found ${vehicles.length} vehicles to delete:`);
    vehicles.forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.id})`);
    });

    // Delete all vehicles
    const { error: deleteError } = await supabase
      .from("vehicles")
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Safety check to avoid deleting all records if table is empty

    if (deleteError) {
      console.error("Error deleting vehicles:", deleteError.message);
      process.exit(1);
    }

    console.log(`✅ Successfully deleted ${vehicles.length} vehicles!`);

  } catch (error) {
    console.error("❌ Error deleting vehicles:", error.message);
    process.exit(1);
  }
}

deleteAllVehicles();