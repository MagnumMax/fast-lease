-- Remove deprecated vehicle telemetry storage now that telematics UI has been retired
drop table if exists public.vehicle_telematics cascade;
