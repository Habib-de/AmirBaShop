package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.Order;
import co.ke.amirbabyshop.domain.OrderItem;
import co.ke.amirbabyshop.dto.order.OrderDto;
import co.ke.amirbabyshop.dto.order.OrderItemDto;
import co.ke.amirbabyshop.dto.order.OrderSummaryDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class OrderMapper {

    @Autowired
    private ObjectMapper objectMapper;

    /* ═══ ORDER → OrderDto (full) ═══ */

    public OrderDto toDto(Order o, List<OrderItem> items) {
        return OrderDto.builder()
                .id(o.getId())
                .tenantId(o.getTenantId())
                .userId(o.getUserId())
                .status(o.getStatus())
                .subtotal(o.getSubtotal())
                .discount(o.getDiscount())
                .tax(o.getTax())
                .shipping(o.getShipping())
                .total(o.getTotal())
                .couponCode(o.getCouponCode())
                .couponId(o.getCouponId())
                .customerName(o.getCustomerName())
                .customerEmail(o.getCustomerEmail())
                .customerPhone(o.getCustomerPhone())
                .addressStreet(o.getAddressStreet())
                .addressCity(o.getAddressCity())
                .addressZip(o.getAddressZip())
                .paymentMethod(o.getPaymentMethod())
                .paymentStatus(o.getPaymentStatus())
                .carrierId(o.getCarrierId())
                .carrierName(o.getCarrierName())
                .trackingNumber(o.getTrackingNumber())
                .eta(o.getEta())
                .checkpoints(parseCheckpoints(o.getCheckpoints()))
                .placedById(o.getPlacedById())
                .placedByName(o.getPlacedByName())
                .placedByRole(o.getPlacedByRole())
                .notes(o.getNotes())
                .registryGiftId(o.getRegistryGiftId()) 
                .items(items == null ? List.of() : items.stream().map(this::toItemDto).toList())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }

    /* ═══ ORDER → OrderSummaryDto (light, for lists) ═══ */

    public OrderSummaryDto toSummary(Order o, List<OrderItem> items) {
        List<OrderItem> safeItems = items == null ? List.of() : items;
        return OrderSummaryDto.builder()
                .id(o.getId())
                .status(o.getStatus())
                .customerName(o.getCustomerName())
                .customerEmail(o.getCustomerEmail())
                .total(o.getTotal())
                .itemCount(safeItems.stream().mapToInt(i -> i.getQty() == null ? 0 : i.getQty()).sum())
                .sampleItems(safeItems.stream().limit(3).map(this::toItemDto).toList())
                .trackingNumber(o.getTrackingNumber())
                .carrierName(o.getCarrierName())
                .eta(o.getEta())
                .registryGiftId(o.getRegistryGiftId()) 
                .createdAt(o.getCreatedAt())
                .build();
    }

    /* ═══ ORDER ITEM → OrderItemDto ═══ */

    public OrderItemDto toItemDto(OrderItem i) {
        return OrderItemDto.builder()
                .id(i.getId())
                .productId(i.getProductId())
                .name(i.getName())
                .imageUrl(i.getImageUrl())
                .category(i.getCategory())
                .price(i.getPrice())
                .qty(i.getQty())
                .size(i.getSize())
                .color(i.getColor())
                .subtotal(i.getSubtotal())
                .build();
    }

    /* ═══ JSON checkpoints ═══ */

    private List<Map<String, Object>> parseCheckpoints(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}