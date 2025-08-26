/*
  Warnings:

  - Added the required column `studentEmail` to the `BachelorTopic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `BachelorTopic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentName` to the `BachelorTopic` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BachelorTopic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "supervisorId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    CONSTRAINT "BachelorTopic_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BachelorTopic_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BachelorTopic" ("id", "reviewerId", "supervisorId", "title") SELECT "id", "reviewerId", "supervisorId", "title" FROM "BachelorTopic";
DROP TABLE "BachelorTopic";
ALTER TABLE "new_BachelorTopic" RENAME TO "BachelorTopic";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
