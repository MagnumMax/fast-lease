#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = argv.slice(2);
  let filePath;
  let apply = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--file") {
      filePath = args[i + 1];
      i += 1;
    } else if (arg === "--apply") {
      apply = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      console.warn(`Unknown argument: ${arg}`);
    }
  }
  if (!filePath) {
    console.error("--file path/to/aggregated.json is required");
    printUsage();
    process.exit(1);
  }
  return { filePath, apply };
}

function printUsage() {
  console.log(`Usage: node scripts/import_deal_from_aggregated.mjs --file <aggregated.json> [--apply]

Options:
  --file    Path to aggregated.json downloaded from storage
  --apply   Execute writes to Supabase (omit for dry-run)
`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function trimString(value) {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeEmail(value) {
  const trimmed = trimString(value);
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function normalizePhone(value) {
  const trimmed = trimString(value);
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^+0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+") || digits.startsWith("00")) {
    return digits.startsWith("00") ? `+${digits.slice(2)}` : digits;
  }
  if (digits.startsWith("971")) {
    return `+${digits}`;
  }
  return digits;
}

function normalizeDate(value) {
  const trimmed = trimString(value);
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return null;
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return null;
  return asNumber;
}

function splitName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  const firstName = parts.slice(0, -1).join(" ");
  const lastName = parts[parts.length - 1];
  return { firstName, lastName };
}

function buildApplicationNumber(dealIdCandidate, fallbackUuid) {
  const cleaned = trimString(dealIdCandidate);
  if (cleaned && /^[A-Za-z0-9-]+$/.test(cleaned)) {
    return `APP-${cleaned}`;
  }
  return `APP-${fallbackUuid.slice(0, 8)}`;
}

function buildDealNumber(deal) {
  const candidate = trimString(deal?.deal_id || deal?.contract_number);
  if (candidate && /^[A-Za-z0-9-]+$/.test(candidate)) {
    return `LEASE-${candidate}`;
  }
  return `LEASE-${randomUUID().slice(0, 8)}`;
}

function assertAggregatedShape(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("aggregated.json must be an object");
  }
  if (!raw.deal_id) {
    throw new Error("aggregated.json missing deal_id");
  }
  if (!raw.storage?.aggregated_json) {
    throw new Error("aggregated.json missing storage.aggregated_json");
  }
  if (!raw.gemini) {
    throw new Error("aggregated.json missing gemini payload");
  }
  if (!raw.gemini.client || !raw.gemini.vehicle || !raw.gemini.deal) {
    throw new Error("aggregated.json missing gemini.client/vehicle/deal");
  }
  if (!Array.isArray(raw.documents)) {
    throw new Error("aggregated.json documents must be an array");
  }
}

function normalizeAggregated(raw) {
  console.log("🔍 Starting normalized aggregation processing...");
  
  assertAggregatedShape(raw);
  console.log("✓ Aggregated shape validated");

  const dealId = raw.deal_id;
  const gemini = raw.gemini ?? {};
  const client = gemini.client ?? {};
  const vehicle = gemini.vehicle ?? {};
  const deal = gemini.deal ?? {};

  console.log(`📁 Processing deal: ${dealId}`);
  console.log(`👤 Client data fields: ${Object.keys(client).join(', ') || 'none'}`);
  console.log(`🚗 Vehicle data fields: ${Object.keys(vehicle).join(', ') || 'none'}`);
  console.log(`📋 Deal data fields: ${Object.keys(deal).join(', ') || 'none'}`);

  const fullName = trimString(client.full_name || client.name);
  const legalName = trimString(client.legal_name);
  const email = normalizeEmail(client.email);
  const phone = normalizePhone(client.phone);
  const emiratesId = trimString(client.emirates_id);
  const residentStatus = trimString(client.resident_status);
  const { firstName, lastName } = splitName(fullName ?? "");

  // Enhanced client normalization with new schema fields
  const normalizedClient = {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    emiratesId,
    nationality: trimString(client.nationality),
    dateOfBirth: normalizeDate(client.date_of_birth),
    occupation: trimString(client.occupation),
    employer: trimString(client.employer),
    driverLicense: trimString(client.driver_license || client.driving_license_number),
    legalName: legalName,
    residentStatus: residentStatus,
    address: client.address ? {
      street: trimString(client.address.street),
      city: trimString(client.address.city),
      emirate: trimString(client.address.emirate),
      postalCode: trimString(client.address.postal_code)
    } : null,
    company: client.company ? {
      industry: trimString(client.company.industry),
      employeeCount: normalizeNumber(client.company.employee_count),
      annualRevenue: normalizeNumber(client.company.annual_revenue),
      contactPerson: trimString(client.company.contact_person)
    } : null,
    documents: client.documents || null,
    raw: client,
  };

  // Enhanced vehicle normalization with new schema fields
  const normalizedVehicle = {
    vin: trimString(vehicle.vin),
    make: trimString(vehicle.make),
    model: trimString(vehicle.model),
    variant: trimString(vehicle.variant),
    year: normalizeNumber(vehicle.year),
    bodyType: trimString(vehicle.body_type),
    mileage: normalizeNumber(vehicle.mileage),
    colorExterior: trimString(vehicle.colors?.exterior || vehicle.color),
    colorInterior: trimString(vehicle.colors?.interior),
    licensePlate: trimString(vehicle.license_plate),
    modifications: vehicle.modifications || (trimString(vehicle.modifications) ? [trimString(vehicle.modifications)] : null),
    externalId: trimString(vehicle.external_id),
    engine: vehicle.engine ? {
      capacity: trimString(vehicle.engine.capacity),
      fuelType: trimString(vehicle.engine.fuel_type),
      transmission: trimString(vehicle.engine.transmission)
    } : null,
    colors: vehicle.colors || null,
    features: vehicle.features || null,
    valuation: null,
    raw: vehicle,
  };

  // Enhanced deal normalization with new schema fields
  const normalizedDeal = {
    sourceId: deal?.external_id || deal?.deal_id ? String(deal.external_id || deal.deal_id) : null,
    clientExternalId: trimString(deal.client_external_id),
    vehicleExternalId: trimString(deal.vehicle_external_id),
    status: trimString(deal.status),
    contractNumber: trimString(deal.contract_number),
    contractDate: normalizeDate(deal.contract_date),
    leaseStart: normalizeDate(deal.lease_start || deal.lease_agreement_start_date),
    leaseEnd: normalizeDate(deal.lease_end || deal.lease_agreement_end_date),
    leaseTermMonths: normalizeNumber(deal.lease_term_months || deal.term),
    mileageAllowed: normalizeNumber(deal.mileage_allowed),
    servicesIncluded: deal.services_included || null,
    deliveryDate: normalizeDate(deal.delivery_date),
    deliveryLocation: trimString(deal.delivery_location),
    returnConditions: trimString(deal.return_conditions),
    notes: trimString(deal.notes),
    lessor: trimString(deal.lessor),
    investor: trimString(deal.investor),
    seller: trimString(deal.seller),
    downPayment: normalizeNumber(deal.down_payment || deal.initial_payment),
    monthlyPayment: normalizeNumber(deal.monthly_payment),
    interestRate: normalizeNumber(deal.interest_rate),
    balloonPayment: normalizeNumber(deal.balloon_payment),
    currency: trimString(deal.currency) ?? "AED",
    totalLeaseValue: normalizeNumber(deal.total_lease_value),
    fees: deal.fees || null,
    paymentSchedule: deal.payment_schedule || null,
    bankDetails: deal.bank_details || null,
    raw: deal,
  };

  const normalizedDocuments = (raw.documents ?? []).map((doc) => {
    const analysis = doc.analysis ?? null;
    return {
      filename: trimString(doc.filename) ?? trimString(doc.drive_file_id) ?? "document",
      sizeBytes: normalizeNumber(doc.size_bytes),
      createdTime: trimString(doc.created_time),
      modifiedTime: trimString(doc.modified_time),
      storagePdf: doc.storage?.pdf ?? null,
      storageJson: doc.storage?.json ?? null,
      analysis,
      documentType: trimString(analysis?.document_type),
      title: trimString(analysis?.title) ?? trimString(doc.filename),
      summary: trimString(analysis?.summary),
      parties: analysis?.parties || null,
      amounts: analysis?.amounts || null,
      dates: analysis?.dates || null,
      fields: analysis?.fields || null,
    };
  });

  const applicationNumber = buildApplicationNumber(normalizedDeal.sourceId, dealId);
  const dealNumber = buildDealNumber(normalizedDeal.raw);

  console.log("✅ Normalization completed successfully");

  return {
    dealId,
    folder: raw.folder ?? null,
    storage: raw.storage,
    client: normalizedClient,
    vehicle: normalizedVehicle,
    deal: normalizedDeal,
    documents: normalizedDocuments,
    applicationNumber,
    dealNumber,
  };
}

function printSummary(normalized) {
  console.log("=== Aggregated deal summary ===");
  console.log(`Deal ID (storage): ${normalized.dealId}`);
  console.log(`Deal number (proposed): ${normalized.dealNumber}`);
  console.log(`Application number (proposed): ${normalized.applicationNumber}`);
  console.log("-- Client --");
  console.log(JSON.stringify({
    fullName: normalized.client.fullName,
    email: normalized.client.email,
    phone: normalized.client.phone,
    emiratesId: normalized.client.emiratesId,
    nationality: normalized.client.nationality,
    dateOfBirth: normalized.client.dateOfBirth,
    occupation: normalized.client.occupation,
    employer: normalized.client.employer,
  }, null, 2));
  console.log("-- Vehicle --");
  console.log(JSON.stringify({
    vin: normalized.vehicle.vin,
    make: normalized.vehicle.make,
    model: normalized.vehicle.model,
    year: normalized.vehicle.year,
    bodyType: normalized.vehicle.bodyType,
    mileage: normalized.vehicle.mileage,
    colorExterior: normalized.vehicle.colorExterior,
  }, null, 2));
  console.log("-- Deal --");
  console.log(JSON.stringify({
    leaseStart: normalized.deal.leaseStart,
    leaseEnd: normalized.deal.leaseEnd,
    termMonths: normalized.deal.termMonths,
    downPayment: normalized.deal.downPayment,
    monthlyPayment: normalized.deal.monthlyPayment,
    totalLeaseValue: normalized.deal.totalLeaseValue,
    currency: normalized.deal.currency,
    lessor: normalized.deal.lessor,
    investor: normalized.deal.investor,
    seller: normalized.deal.seller,
  }, null, 2));
  console.log(`Documents recognised: ${normalized.documents.length}`);
}

function buildSupabaseClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "deal-import-script",
      },
    },
  });
}

async function loadProfileByUnique(supabase, { emiratesId, phone }) {
  if (emiratesId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("emirates_id", emiratesId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load profile by emirates_id: ${error.message}`);
    }
    if (data?.user_id) {
      return data.user_id;
    }
  }
  if (phone) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load profile by phone: ${error.message}`);
    }
    if (data?.user_id) {
      return data.user_id;
    }
  }
  return null;
}

async function getUserByEmailRpc(supabase, email) {
  if (!email) return null;
  const { data, error } = await supabase.rpc("get_user_by_email", { user_email: email });
  if (error) {
    throw new Error(`Failed to execute get_user_by_email RPC: ${error.message}`);
  }
  return data;
}

async function ensureUserAndProfile(supabase, normalized, options) {
  const admin = supabase.auth.admin;
  let userId = null;

  if (normalized.email) {
    const existingByEmail = await getUserByEmailRpc(supabase, normalized.email);
    if (existingByEmail?.id) {
      userId = existingByEmail.id;
    }
  }

  if (!userId) {
    const existingProfileUserId = await loadProfileByUnique(supabase, normalized);
    if (existingProfileUserId) {
      userId = existingProfileUserId;
    }
  }

  let createdUser = null;
  if (!userId) {
    const fallbackEmail = normalized.email ?? `import+${normalized.emiratesId || normalized.phone || randomUUID()}@fastlease.local`;
    const password = `Import-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin.createUser({
      email: fallbackEmail,
      email_confirm: Boolean(normalized.email),
      password,
      phone: normalized.phone ?? undefined,
      phone_confirm: Boolean(normalized.phone),
      user_metadata: {
        source: "deal-import",
        original_client: normalized.raw,
      },
      app_metadata: {
        roles: ["CLIENT"],
      },
    });
    if (error) {
      if (error.message && error.message.includes("already registered")) {
        const retryUser = await getUserByEmailRpc(supabase, fallbackEmail);
        if (retryUser?.id) {
          userId = retryUser.id;
        } else {
          throw new Error(`User with email already registered but lookup failed: ${fallbackEmail}`);
        }
      } else {
        throw new Error(`Failed to create auth user: ${error.message}`);
      }
    } else {
      createdUser = data?.user ?? null;
      userId = createdUser?.id ?? null;
    }
  }

  if (!userId) {
    throw new Error("Unable to resolve auth user for client");
  }

  const profilePayload = {
    user_id: userId,
    status: "active",
    full_name: normalized.fullName,
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    phone: normalized.phone,
    emirates_id: normalized.emiratesId,
    nationality: normalized.nationality,
    date_of_birth: normalized.dateOfBirth,
    employment_info: {
      occupation: normalized.occupation,
      employer: normalized.employer,
    },
    metadata: {
      import_source: "aggregated",
      import_deal_id: options.dealId,
      imported_at: new Date().toISOString(),
      driver_license_number: normalized.driverLicense,
      primary_email: normalized.email,
      primary_phone: normalized.phone,
      raw_client: normalized.raw,
    },
  };

  const { data: upsertedProfile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "user_id" })
    .select("id, user_id")
    .maybeSingle();
  if (upsertError) {
    throw new Error(`Failed to upsert profile: ${upsertError.message}`);
  }

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({
      user_id: userId,
      role: "CLIENT",
    }, { onConflict: "user_id,role" });
  if (roleError) {
    throw new Error(`Failed to upsert user role: ${roleError.message}`);
  }

  return { userId, profileId: upsertedProfile?.id ?? null, created: Boolean(createdUser) };
}

function buildVehiclePayload(normalizedVehicle, dealId) {
  const payload = {
    vin: normalizedVehicle.vin,
    make: normalizedVehicle.make,
    model: normalizedVehicle.model,
    variant: normalizedVehicle.variant,
    year: normalizedVehicle.year,
    body_type: normalizedVehicle.bodyType,
    mileage: normalizedVehicle.mileage,
    color_exterior: normalizedVehicle.colorExterior,
    color_interior: normalizedVehicle.colorInterior,
    status: "leased",
    features: {},
  };
  
  const features = {
    import_info: {
      source: "aggregated",
      deal_id: dealId ?? null,
      raw_vehicle: normalizedVehicle.raw,
      external_id: normalizedVehicle.externalId,
    },
  };
  
  // Enhanced vehicle features
  if (normalizedVehicle.modifications) {
    features.modifications = normalizedVehicle.modifications;
  }
  if (normalizedVehicle.licensePlate) {
    features.license_plate = normalizedVehicle.licensePlate;
  }
  if (normalizedVehicle.engine) {
    features.engine = normalizedVehicle.engine;
  }
  if (normalizedVehicle.features) {
    features.vehicle_features = normalizedVehicle.features;
  }
  if (normalizedVehicle.valuation) {
    features.valuation_details = normalizedVehicle.valuation;
  }
  
  payload.features = features;
  return payload;
}

async function ensureVehicle(supabase, normalizedVehicle, dealId) {
  if (!normalizedVehicle.vin) {
    throw new Error("Vehicle VIN is required for import");
  }

  const payload = buildVehiclePayload(normalizedVehicle, dealId);

  const { data, error } = await supabase
    .from("vehicles")
    .upsert(payload, { onConflict: "vin" })
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to upsert vehicle: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Vehicle upsert did not return id");
  }

  return data.id;
}

async function ensureApplication(supabase, normalized, userId, vehicleId) {
  const payload = {
    application_number: normalized.applicationNumber,
    user_id: userId,
    vehicle_id: vehicleId,
    status: normalized.deal.leaseStart ? "converted" : "approved",
    requested_amount: normalized.deal.totalLeaseValue,
    term_months: normalized.deal.termMonths,
    down_payment: normalized.deal.downPayment,
    monthly_payment: normalized.deal.monthlyPayment,
    interest_rate: null,
    personal_info: {
      source: "aggregated",
      client: normalized.client.raw,
    },
    financial_info: {
      currency: normalized.deal.currency,
      total_lease_value: normalized.deal.totalLeaseValue,
      down_payment: normalized.deal.downPayment,
    },
    employment_info: {
      occupation: normalized.client.occupation,
      employer: normalized.client.employer,
    },
    references_info: {
      investor: normalized.deal.investor,
      lessor: normalized.deal.lessor,
      seller: normalized.deal.seller,
    },
  };

  const { data, error } = await supabase
    .from("applications")
    .upsert({ ...payload }, { onConflict: "application_number" })
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to upsert application: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Application upsert did not return id");
  }
  return data.id;
}

function determineDealStatus(normalizedDeal) {
  const now = new Date();
  if (normalizedDeal.leaseStart) {
    const startDate = new Date(normalizedDeal.leaseStart);
    if (!Number.isNaN(startDate.getTime()) && startDate > now) {
      return "SIGNING_FUNDING";
    }
    return "ACTIVE";
  }
  return "NEW";
}

async function ensureDeal(supabase, normalized, applicationId, vehicleId, clientUserId) {
  const payload = {
    id: normalized.dealId,
    deal_number: normalized.dealNumber,
    application_id: applicationId,
    vehicle_id: vehicleId,
    client_id: clientUserId,
    status: determineDealStatus(normalized.deal),
    principal_amount: normalized.deal.totalLeaseValue,
    total_amount: normalized.deal.totalLeaseValue,
    monthly_payment: normalized.deal.monthlyPayment,
    monthly_lease_rate: normalized.deal.monthlyPayment,
    term_months: normalized.deal.termMonths,
    interest_rate: null,
    down_payment_amount: normalized.deal.downPayment,
    contract_start_date: normalized.deal.leaseStart,
    contract_end_date: normalized.deal.leaseEnd,
    contract_terms: {
      currency: normalized.deal.currency,
      lessor: normalized.deal.lessor,
      investor: normalized.deal.investor,
      seller: normalized.deal.seller,
      source: "aggregated",
      storage_path: normalized.storage?.aggregated_json,
    },
    insurance_details: {},
  };

  const { data, error } = await supabase
    .from("deals")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to upsert deal: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Deal upsert did not return id");
  }
  return data.id;
}

async function ensureDealDocuments(supabase, dealId, documents) {
  if (!documents?.length) {
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;
  for (const doc of documents) {
    if (!doc.storagePdf) {
      skipped += 1;
      continue;
    }
    const { data: existing, error: existingError } = await supabase
      .from("deal_documents")
      .select("id")
      .eq("deal_id", dealId)
      .eq("storage_path", doc.storagePdf)
      .maybeSingle();
    if (existingError) {
      throw new Error(`Failed to check existing deal_document: ${existingError.message}`);
    }
    if (existing?.id) {
      skipped += 1;
      continue;
    }

    const payload = {
      deal_id: dealId,
      title: doc.title ?? doc.filename,
      document_type: doc.documentType,
      status: "ingested",
      storage_path: doc.storagePdf,
      created_at: doc.createdTime ?? null,
    };
    const { error } = await supabase.from("deal_documents").insert(payload);
    if (error) {
      throw new Error(`Failed to insert deal_document for ${doc.filename}: ${error.message}`);
    }
    inserted += 1;
  }

  return { inserted, skipped };
}

async function recordDealEvent(supabase, dealId, normalized) {
  const storagePath = normalized.storage?.aggregated_json ?? null;
  if (storagePath) {
    const { data: existing, error: existingError } = await supabase
      .from("deal_events")
      .select("id")
      .eq("deal_id", dealId)
      .eq("event_type", "imported_from_aggregated")
      .contains("payload", { storage_path: storagePath })
      .maybeSingle();
    if (existingError) {
      throw new Error(`Failed to check existing deal event: ${existingError.message}`);
    }
    if (existing?.id) {
      return;
    }
  }

  const payload = {
    deal_id: dealId,
    event_type: "imported_from_aggregated",
    payload: {
      storage_path: storagePath,
      folder: normalized.folder,
      imported_at: new Date().toISOString(),
    },
  };

  const { error } = await supabase.from("deal_events").insert(payload);
  if (error) {
    throw new Error(`Failed to record deal event: ${error.message}`);
  }
}

async function run() {
  const { filePath, apply } = parseArgs(process.argv);
  const resolvedPath = path.resolve(filePath);
  const rawContent = await fs.readFile(resolvedPath, "utf-8");
  const parsed = JSON.parse(rawContent);
  const normalized = normalizeAggregated(parsed);

  printSummary(normalized);

  if (!apply) {
    console.log("Dry-run complete. Re-run with --apply to write data to Supabase.");
    return;
  }

  const supabase = buildSupabaseClient();

  console.log("Importing into Supabase...");

  const { userId } = await ensureUserAndProfile(supabase, normalized.client, { dealId: normalized.dealId });
  console.log(`Client user_id: ${userId}`);

  const vehicleId = await ensureVehicle(supabase, normalized.vehicle, normalized.dealId);
  console.log(`Vehicle id: ${vehicleId}`);

  const applicationId = await ensureApplication(supabase, normalized, userId, vehicleId);
  console.log(`Application id: ${applicationId}`);

  const dealId = await ensureDeal(supabase, normalized, applicationId, vehicleId, userId);
  console.log(`Deal id: ${dealId}`);

  const { inserted, skipped } = await ensureDealDocuments(supabase, dealId, normalized.documents);
  console.log(`Deal documents inserted=${inserted}, skipped=${skipped}`);

  await recordDealEvent(supabase, dealId, normalized);
  console.log("Deal event recorded.");

  console.log("Import completed successfully.");
}

run().catch((error) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
