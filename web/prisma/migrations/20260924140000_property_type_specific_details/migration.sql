-- Store type-specific property attributes without changing the shared Property shape.
ALTER TABLE "Property" ADD COLUMN "details" JSONB;