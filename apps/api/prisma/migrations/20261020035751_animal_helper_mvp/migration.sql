-- Extensions used by the schema: case-insensitive e-mail and accent-free search.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateEnum
CREATE TYPE "ngo_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "species" AS ENUM ('DOG', 'CAT', 'OTHER');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "size" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "age_unit" AS ENUM ('MONTHS', 'YEARS');

-- CreateTable
CREATE TABLE "ngos" (
    "id" TEXT NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "legal_name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "image_key" TEXT,
    "image_bytes" INTEGER NOT NULL DEFAULT 0,
    "email" CITEXT NOT NULL,
    "whatsapp" VARCHAR(13) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "cep" CHAR(8) NOT NULL,
    "street" VARCHAR(150) NOT NULL,
    "number" VARCHAR(10) NOT NULL,
    "complement" VARCHAR(60),
    "district" VARCHAR(80) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "location_confirmed_at" TIMESTAMPTZ(3) NOT NULL,
    "timezone" VARCHAR(40) NOT NULL,
    "status" "ngo_status" NOT NULL DEFAULT 'ACTIVE',
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(3),
    "terms_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "terms_version" VARCHAR(20) NOT NULL,
    "signup_request_id" UUID,
    "signup_ip_hash" CHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ngos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening_hours" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "closed" BOOLEAN NOT NULL,
    "opens_at" CHAR(5),
    "closes_at" CHAR(5),

    CONSTRAINT "opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "species" "species" NOT NULL,
    "breed" VARCHAR(60),
    "sex" "sex" NOT NULL,
    "size" "size" NOT NULL,
    "age_value" SMALLINT NOT NULL,
    "age_unit" "age_unit" NOT NULL,
    "description" VARCHAR(1000),
    "available" BOOLEAN NOT NULL DEFAULT true,
    "available_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_images" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "animal_id" TEXT,
    "position" SMALLINT,
    "key_prefix" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" BIGSERIAL NOT NULL,
    "bucket" VARCHAR(40) NOT NULL,
    "key_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ngos_cnpj_key" ON "ngos"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "ngos_slug_key" ON "ngos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ngos_email_key" ON "ngos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ngos_signup_request_id_key" ON "ngos"("signup_request_id");

-- CreateIndex
CREATE INDEX "ngos_status_lat_lng_idx" ON "ngos"("status", "lat", "lng");

-- CreateIndex
CREATE INDEX "ngos_is_seed_expires_at_idx" ON "ngos"("is_seed", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "opening_hours_ngo_id_day_of_week_key" ON "opening_hours"("ngo_id", "day_of_week");

-- CreateIndex
CREATE INDEX "animals_ngo_id_available_species_idx" ON "animals"("ngo_id", "available", "species");

-- CreateIndex
CREATE INDEX "animal_images_animal_id_created_at_idx" ON "animal_images"("animal_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "animal_images_animal_id_position_key" ON "animal_images"("animal_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_ngo_id_idx" ON "sessions"("ngo_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_ngo_id_idx" ON "password_resets"("ngo_id");

-- CreateIndex
CREATE INDEX "rate_limit_hits_bucket_key_hash_created_at_idx" ON "rate_limit_hits"("bucket", "key_hash", "created_at");

-- AddForeignKey
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_images" ADD CONSTRAINT "animal_images_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_images" ADD CONSTRAINT "animal_images_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
