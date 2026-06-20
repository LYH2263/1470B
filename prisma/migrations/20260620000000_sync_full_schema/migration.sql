-- AlterTable: Article review fields
ALTER TABLE "Article" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE "Article" ADD COLUMN "rejectReason" TEXT;

CREATE INDEX "Article_reviewStatus_idx" ON "Article"("reviewStatus");

-- CreateTable: Tag
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#1890ff',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateTable: ArticleTag
CREATE TABLE "ArticleTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ArticleTag_articleId_tagId_key" ON "ArticleTag"("articleId", "tagId");
CREATE INDEX "ArticleTag_articleId_idx" ON "ArticleTag"("articleId");
CREATE INDEX "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");

-- CreateTable: ArticleVersion
CREATE TABLE "ArticleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "modifiedBy" TEXT NOT NULL,
    "changeSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ArticleVersion_articleId_versionNumber_key" ON "ArticleVersion"("articleId", "versionNumber");
CREATE INDEX "ArticleVersion_articleId_idx" ON "ArticleVersion"("articleId");
CREATE INDEX "ArticleVersion_articleId_versionNumber_idx" ON "ArticleVersion"("articleId", "versionNumber");
CREATE INDEX "ArticleVersion_createdAt_idx" ON "ArticleVersion"("createdAt");

-- CreateTable: MediaFolder
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MediaFolder_parentId_idx" ON "MediaFolder"("parentId");
CREATE INDEX "MediaFolder_name_idx" ON "MediaFolder"("name");

-- CreateTable: MediaFile
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "folderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "MediaFile_folderId_idx" ON "MediaFile"("folderId");
CREATE INDEX "MediaFile_filename_idx" ON "MediaFile"("filename");
CREATE INDEX "MediaFile_createdAt_idx" ON "MediaFile"("createdAt");

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'review',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "articleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateTable: Favorite
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Favorite_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Favorite_userId_articleId_key" ON "Favorite"("userId", "articleId");
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");
CREATE INDEX "Favorite_articleId_idx" ON "Favorite"("articleId");
CREATE INDEX "Favorite_createdAt_idx" ON "Favorite"("createdAt");

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestBody" TEXT,
    "responseStatus" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_username_idx" ON "AuditLog"("username");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_responseStatus_idx" ON "AuditLog"("responseStatus");

-- CreateTable: ArticleTemplate
CREATE TABLE "ArticleTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "titleFormat" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ArticleTemplate_name_idx" ON "ArticleTemplate"("name");
CREATE INDEX "ArticleTemplate_category_idx" ON "ArticleTemplate"("category");
CREATE INDEX "ArticleTemplate_createdAt_idx" ON "ArticleTemplate"("createdAt");
