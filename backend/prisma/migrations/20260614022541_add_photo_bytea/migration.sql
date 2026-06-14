/*
  Warnings:

  - The `profile_photo` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photo_mime_type" TEXT,
DROP COLUMN "profile_photo",
ADD COLUMN     "profile_photo" BYTEA;
