-- AlterTable
ALTER TABLE "inventions" ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "embeddingDim" INTEGER,
ADD COLUMN     "embeddingModel" TEXT;

-- AlterTable
ALTER TABLE "prior_art_documents" ADD COLUMN     "embeddingDim" INTEGER,
ADD COLUMN     "embeddingModel" TEXT;

-- Create HNSW Vector Index for Cosine Distance Similarity Search
CREATE INDEX IF NOT EXISTS "prior_art_documents_embedding_hnsw_idx" 
ON "prior_art_documents" 
USING hnsw (embedding vector_cosine_ops);
