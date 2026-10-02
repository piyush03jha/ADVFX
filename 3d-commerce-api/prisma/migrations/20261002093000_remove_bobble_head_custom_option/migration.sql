DELETE FROM "CustomBuildOption"
WHERE "slug" = 'bobble' AND "section" = 'head';

UPDATE "CustomBuildCategory"
SET "description" = 'Portraits and figurines'
WHERE "slug" = 'person';
