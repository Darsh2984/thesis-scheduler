/*
  Warnings:

  - You are about to drop the `UserAvailability` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserAvailability";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "UserUnavailability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    CONSTRAINT "UserUnavailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
