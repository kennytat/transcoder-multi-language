-- CreateTable
CREATE TABLE "Root" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "pid" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "qm" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qm" TEXT NOT NULL,
    FOREIGN KEY ("pid") REFERENCES "Root" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qm" TEXT NOT NULL,
    FOREIGN KEY ("pid") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qm" TEXT NOT NULL,
    FOREIGN KEY ("pid") REFERENCES "Classification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qm" TEXT NOT NULL,
    "duration" INTEGER,
    "size" INTEGER,
    "thumb" TEXT NOT NULL,
    "isvideo" BOOLEAN,
    FOREIGN KEY ("pid") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Root.qm_unique" ON "Root"("qm");

-- CreateIndex
CREATE UNIQUE INDEX "Category.qm_unique" ON "Category"("qm");

-- CreateIndex
CREATE UNIQUE INDEX "Classification.qm_unique" ON "Classification"("qm");

-- CreateIndex
CREATE UNIQUE INDEX "Topic.qm_unique" ON "Topic"("qm");

-- CreateIndex
CREATE UNIQUE INDEX "Content.qm_unique" ON "Content"("qm");
