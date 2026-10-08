ALTER TABLE "vehicles" ADD COLUMN "color" text;--> statement-breakpoint
UPDATE "vehicles" SET "color" = CASE "model"
  WHEN 'Mercedes-Benz S 580' THEN 'Obsidian black'
  WHEN 'BMW 740i' THEN 'Mineral white'
  WHEN 'Genesis G90' THEN 'Midnight blue'
  WHEN 'Cadillac Escalade ESV' THEN 'Black'
  WHEN 'Lincoln Navigator L' THEN 'Silver'
  WHEN 'GMC Yukon Denali XL' THEN 'Onyx black'
  WHEN 'Chevrolet Suburban Premier' THEN 'Graphite'
  WHEN 'Mercedes-Benz Sprinter Executive' THEN 'Arctic white'
  WHEN 'Ford Transit Limousine' THEN 'Black'
END;
