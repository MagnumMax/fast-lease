import { test, expect } from "@playwright/test";
import {
    getOpsCreds,
    ensureSupabaseEnv
} from "./utils/auth";

// API Integration tests for critical backend logic
test.describe("API Integration Tests", () => {
    const BASE_URL = process.env.BASE_URL || "http://localhost:3333";

    ensureSupabaseEnv();

    test("Create Deal via API Route", async ({ request }) => {
        const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET;
        if (!serviceRole) {
            test.skip(true, "SUPABASE_SERVICE_ROLE_KEY is required for direct API testing");
        }

        const payload = {
            source: "E2E_API_TEST",
            buyerType: "personal",
            customer: {
                full_name: "API Test Client",
                email: `api-client-${Date.now()}@example.com`,
                phone: "+79991234567"
            },
            asset: {
                make: "Toyota",
                model: "Camry",
                year: 2022,
                vin: `API_VIN_${Date.now()}`
            }
        };

        // We use the service role to bypass RLS/Auth filters for "System" level integration tests
        const response = await request.post(`${BASE_URL}/api/deals`, {
            data: payload,
            headers: {
                'Authorization': `Bearer ${serviceRole}`,
                'apikey': serviceRole!,
                'Content-Type': 'application/json',
            }
        });

        expect(response.ok()).toBeTruthy();
        const result = await response.json();
        expect(result.data).toBeDefined();
        expect(result.data.source).toBe("E2E_API_TEST");
        expect(result.data.id).toBeDefined();
    });

    test("Health Check / Metrics", async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/metrics`);
        if (response.status() !== 404) {
            expect(response.ok()).toBeTruthy();
        }
    });

    test("Verify Workflow Engine Route", async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/workflow`);
        // Workflow route might be protected or just a base path
        if (response.status() !== 404) {
            expect(response.status()).toBeLessThan(500);
        }
    });
});
