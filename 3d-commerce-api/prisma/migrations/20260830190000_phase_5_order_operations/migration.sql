-- Phase 5: order lifecycle and shipment operations

CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Shipment_carrier_trackingNumber_idx" ON "Shipment"("carrier", "trackingNumber");
