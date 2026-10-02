CREATE TABLE "CustomBuildCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "basePriceMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomBuildCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomBuildCategory_slug_key" ON "CustomBuildCategory"("slug");
CREATE INDEX "CustomBuildCategory_isActive_sortOrder_idx" ON "CustomBuildCategory"("isActive","sortOrder");

CREATE TABLE "CustomBuildOption" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "priceMinor" INTEGER NOT NULL DEFAULT 0,
  "multiplier" DOUBLE PRECISION,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomBuildOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomBuildOption_categoryId_section_slug_key" ON "CustomBuildOption"("categoryId","section","slug");
CREATE INDEX "CustomBuildOption_categoryId_section_isActive_idx" ON "CustomBuildOption"("categoryId","section","isActive");
ALTER TABLE "CustomBuildOption" ADD CONSTRAINT "CustomBuildOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CustomBuildCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRequest" ADD COLUMN "configurationSnapshot" TEXT;

INSERT INTO "CustomBuildCategory" ("id","slug","name","description","basePriceMinor","sortOrder","isActive","updatedAt")
VALUES
('cbcat_person','person','Person','Portraits, figurines & bobble heads',0,0,true,CURRENT_TIMESTAMP),
('cbcat_pet','pet','Pet / Animal','Turn your companion into a keepsake',299900,1,true,CURRENT_TIMESTAMP),
('cbcat_object','object','Product / Object','Replicas, parts, sculptures & more',279900,2,true,CURRENT_TIMESTAMP),
('cbcat_vehicle','vehicle','Vehicle','Cars, bikes and display models',329900,3,true,CURRENT_TIMESTAMP),
('cbcat_character','character','Character / Collectible','Gaming, anime and stylized figures',299900,4,true,CURRENT_TIMESTAMP),
('cbcat_other','other','Other','Something unique? Tell us what you need',249900,5,true,CURRENT_TIMESTAMP);

INSERT INTO "CustomBuildOption" ("id","categoryId","section","slug","name","description","priceMinor","multiplier","sortOrder","isActive","updatedAt")
VALUES
('cbopt_person_body_half','cbcat_person','body','half','Half body','Waist-up or seated composition.',249900,NULL,0,true,CURRENT_TIMESTAMP),
('cbopt_person_body_full','cbcat_person','body','full','Full body','Complete figure from head to feet.',349900,NULL,1,true,CURRENT_TIMESTAMP),
('cbopt_person_head_bobble','cbcat_person','head','bobble','Bobble head','Oversized head with a playful collectible feel.',50000,NULL,0,true,CURRENT_TIMESTAMP),
('cbopt_person_head_stationary','cbcat_person','head','stationary','Stationary head','Classic proportions with a natural head shape.',0,NULL,1,true,CURRENT_TIMESTAMP),
('cbopt_person_frame_single','cbcat_person','frame','single','Just me','One person as the main subject.',0,NULL,0,true,CURRENT_TIMESTAMP),
('cbopt_person_frame_couple','cbcat_person','frame','couple','Me + partner','Two people together in one display.',180000,NULL,1,true,CURRENT_TIMESTAMP),
('cbopt_person_frame_pet','cbcat_person','frame','pet','Me + pet','Add one beloved pet to the piece.',120000,NULL,2,true,CURRENT_TIMESTAMP),
('cbopt_person_frame_group','cbcat_person','frame','group','Family / group','Three or more people in one scene.',320000,NULL,3,true,CURRENT_TIMESTAMP),
('cbopt_pet_head_bobble','cbcat_pet','head','bobble','Bobble head','Playful oversized head.',50000,NULL,0,true,CURRENT_TIMESTAMP),
('cbopt_pet_head_stationary','cbcat_pet','head','stationary','Stationary head','Classic proportions.',0,NULL,1,true,CURRENT_TIMESTAMP),
('cbopt_character_head_bobble','cbcat_character','head','bobble','Bobble head','Playful oversized head.',50000,NULL,0,true,CURRENT_TIMESTAMP),
('cbopt_character_head_stationary','cbcat_character','head','stationary','Stationary head','Classic proportions.',0,NULL,1,true,CURRENT_TIMESTAMP);

INSERT INTO "CustomBuildOption" ("id","categoryId","section","slug","name","description","priceMinor","multiplier","sortOrder","isActive","updatedAt")
VALUES
('cbopt_person_size_8','cbcat_person','size','8','8 cm','',0,0.75,0,true,CURRENT_TIMESTAMP),
('cbopt_person_size_12','cbcat_person','size','12','12 cm','',0,0.9,1,true,CURRENT_TIMESTAMP),
('cbopt_person_size_15','cbcat_person','size','15','15 cm','',0,1,2,true,CURRENT_TIMESTAMP),
('cbopt_person_size_20','cbcat_person','size','20','20 cm','',0,1.35,3,true,CURRENT_TIMESTAMP),
('cbopt_person_size_25','cbcat_person','size','25','25 cm','',0,1.75,4,true,CURRENT_TIMESTAMP),
('cbopt_person_size_30','cbcat_person','size','30','30 cm','',0,2.15,5,true,CURRENT_TIMESTAMP);
