-- docs.content_format 支持 PDF 型文档（白皮书内联阅读）
ALTER TABLE docs
  MODIFY COLUMN content_format ENUM('html','markdown','pdf') NOT NULL DEFAULT 'markdown';