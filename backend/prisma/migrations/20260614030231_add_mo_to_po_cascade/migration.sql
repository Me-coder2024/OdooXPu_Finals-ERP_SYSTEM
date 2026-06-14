-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "source_mo_id" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_source_mo_id_fkey" FOREIGN KEY ("source_mo_id") REFERENCES "ManufacturingOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
