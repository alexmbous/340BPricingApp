-- Add fill quantity to PatientMedication.
-- Default 30 covers the common-case monthly tablet/capsule fill; other
-- forms get updated by the application layer on write if needed.
ALTER TABLE "patient_medications"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 30;
