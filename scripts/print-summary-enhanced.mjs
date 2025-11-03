#!/usr/bin/env node
// Enhanced print summary function for better logging

export function printSummaryEnhanced(normalized) {
  console.log("=== Enhanced Aggregated Deal Summary ===");
  console.log(`📁 Deal ID (storage): ${normalized.dealId}`);
  console.log(`🏷️ Deal number (proposed): ${normalized.dealNumber}`);
  console.log(`📝 Application number (proposed): ${normalized.applicationNumber}`);
  
  console.log("\n-- 👤 ENHANCED CLIENT DATA --");
  console.log(JSON.stringify({
    fullName: normalized.client.fullName,
    legalName: normalized.client.legalName,
    residentStatus: normalized.client.residentStatus,
    email: normalized.client.email,
    phone: normalized.client.phone,
    emiratesId: normalized.client.emiratesId,
    nationality: normalized.client.nationality,
    dateOfBirth: normalized.client.dateOfBirth,
    occupation: normalized.client.occupation,
    employer: normalized.client.employer,
    driverLicense: normalized.client.driverLicense,
    address: normalized.client.address,
    company: normalized.client.company,
  }, null, 2));
  
  console.log("\n-- 🚗 ENHANCED VEHICLE DATA --");
  console.log(JSON.stringify({
    vin: normalized.vehicle.vin,
    make: normalized.vehicle.make,
    model: normalized.vehicle.model,
    variant: normalized.vehicle.variant,
    year: normalized.vehicle.year,
    bodyType: normalized.vehicle.bodyType,
    mileage: normalized.vehicle.mileage,
    colorExterior: normalized.vehicle.colorExterior,
    colorInterior: normalized.vehicle.colorInterior,
    licensePlate: normalized.vehicle.licensePlate,
    externalId: normalized.vehicle.externalId,
    engine: normalized.vehicle.engine,
    features: normalized.vehicle.features,
    valuation: normalized.vehicle.valuation,
    modifications: normalized.vehicle.modifications,
  }, null, 2));
  
  console.log("\n-- 📋 ENHANCED DEAL DATA --");
  console.log(JSON.stringify({
    sourceId: normalized.deal.sourceId,
    clientExternalId: normalized.deal.clientExternalId,
    vehicleExternalId: normalized.deal.vehicleExternalId,
    status: normalized.deal.status,
    contractNumber: normalized.deal.contractNumber,
    contractDate: normalized.deal.contractDate,
    leaseStart: normalized.deal.leaseStart,
    leaseEnd: normalized.deal.leaseEnd,
    leaseTermMonths: normalized.deal.leaseTermMonths,
    mileageAllowed: normalized.deal.mileageAllowed,
    servicesIncluded: normalized.deal.servicesIncluded,
    deliveryDate: normalized.deal.deliveryDate,
    deliveryLocation: normalized.deal.deliveryLocation,
    returnConditions: normalized.deal.returnConditions,
    notes: normalized.deal.notes,
    monthlyPayment: normalized.deal.monthlyPayment,
    downPayment: normalized.deal.downPayment,
    interestRate: normalized.deal.interestRate,
    balloonPayment: normalized.deal.balloonPayment,
    currency: normalized.deal.currency,
    vehiclePurchasePrice: normalized.deal.vehiclePurchasePrice,
    totalLeaseValue: normalized.deal.totalLeaseValue,
    fees: normalized.deal.fees,
    paymentSchedule: normalized.deal.paymentSchedule,
    bankDetails: normalized.deal.bankDetails,
    lessor: normalized.deal.lessor,
    investor: normalized.deal.investor,
    seller: normalized.deal.seller,
  }, null, 2));
  
  console.log(`\n-- 📄 ENHANCED DOCUMENTS (${normalized.documents.length}) --`);
  normalized.documents.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.filename}`);
    console.log(`   Type: ${doc.documentType || 'unknown'}`);
    console.log(`   Size: ${doc.sizeBytes || 0} bytes`);
    if (doc.storagePdf) {
      console.log(`   📄 PDF: ${doc.storagePdf}`);
    }
    if (doc.storageJson) {
      console.log(`   📋 JSON: ${doc.storageJson}`);
    }
    if (doc.summary) {
      console.log(`   Summary: ${doc.summary.substring(0, 100)}...`);
    }
    if (doc.parties && doc.parties.length > 0) {
      console.log(`   👥 Parties: ${doc.parties.length} entities`);
    }
    if (doc.amounts && doc.amounts.length > 0) {
      console.log(`   💰 Amounts: ${doc.amounts.length} financial items`);
    }
    if (doc.dates && doc.dates.length > 0) {
      console.log(`   📅 Dates: ${doc.dates.length} date items`);
    }
    if (doc.fields && doc.fields.length > 0) {
      console.log(`   🔧 Fields: ${doc.fields.length} structured fields`);
    }
  });
}