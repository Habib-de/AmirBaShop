package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.*;
import co.ke.amirbabyshop.dto.order.CreateOrderRequest;
import co.ke.amirbabyshop.dto.order.OrderDto;
import co.ke.amirbabyshop.dto.order.OrderSummaryDto;
import co.ke.amirbabyshop.mapper.OrderMapper;
import co.ke.amirbabyshop.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final String ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;
    private final RegistryRepository registryRepository;
    private final OrderMapper orderMapper;
    private final ObjectMapper objectMapper;

    /* ═══════════════ CREATE ═══════════════ */

    @Transactional
    public OrderDto create(
            String tenantId,
            Long userId,
            String userName,
            String userRole,
            CreateOrderRequest req
    ) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ApiException("Order must have at least one item", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        /* ─── Load products & validate stock ─── */
        List<OrderItem> items = req.getItems().stream().map(i -> {
            Product p = productRepository.findByIdAndTenantId(i.getProductId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found: " + i.getProductId()));

            int availableStock = getVariantStock(p, i.getSize(), i.getColor());
            if (availableStock < i.getQty()) {
                throw new ApiException(
                        "Not enough stock for " + p.getName() +
                        (i.getSize() != null || i.getColor() != null
                                ? " (" + i.getSize() + "/" + i.getColor() + ")" : "") +
                        ": only " + availableStock + " left",
                        HttpStatus.CONFLICT);
            }

            return OrderItem.builder()
                    .productId(p.getId())
                    .name(p.getName())
                    .imageUrl(p.getImageUrl())
                    .category(p.getCategoryId() != null ? String.valueOf(p.getCategoryId()) : null)
                    .price(p.getPrice())
                    .qty(i.getQty())
                    .size(i.getSize())
                    .color(i.getColor())
                    .build();
        }).toList();

        /* ─── Compute subtotal ─── */
        BigDecimal subtotal = items.stream()
                .map(it -> it.getPrice().multiply(BigDecimal.valueOf(it.getQty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        /* ─── Apply coupon ─── */
        BigDecimal discount = BigDecimal.ZERO;
        Long couponId = null;
        String couponCode = null;

        if (req.getCouponCode() != null && !req.getCouponCode().isBlank()) {
            String clean = req.getCouponCode().trim().toUpperCase();
            Coupon c = couponRepository.findByTenantIdAndCodeIgnoreCase(tenantId, clean)
                    .orElseThrow(() -> new ApiException("Invalid coupon code", HttpStatus.UNPROCESSABLE_ENTITY));

            if (Boolean.FALSE.equals(c.getIsActive())) {
                throw new ApiException("Coupon is no longer active", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (c.getExpiresAt() != null && c.getExpiresAt().isBefore(Instant.now())) {
                throw new ApiException("Coupon has expired", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            if (c.getMaxUses() != null && c.getMaxUses() > 0
                    && c.getUses() != null && c.getUses() >= c.getMaxUses()) {
                throw new ApiException("Coupon usage limit reached", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            BigDecimal minOrder = c.getMinOrder() == null ? BigDecimal.ZERO : c.getMinOrder();
            if (subtotal.compareTo(minOrder) < 0) {
                throw new ApiException(
                        "Minimum order of KES " + minOrder.toPlainString() + " required for this coupon",
                        HttpStatus.UNPROCESSABLE_ENTITY);
            }

            discount = switch (c.getType()) {
                case "percent" -> subtotal
                        .multiply(c.getValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                case "fixed" -> c.getValue().min(subtotal);
                default -> BigDecimal.ZERO;
            };
            couponId = c.getId();
            couponCode = c.getCode();

            /* Increment coupon use count */
            c.setUses((c.getUses() == null ? 0 : c.getUses()) + 1);
            couponRepository.save(c);
        }

        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal shipping = BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(discount).add(tax).add(shipping);
        if (total.compareTo(BigDecimal.ZERO) < 0) total = BigDecimal.ZERO;

        /* ─── Create order ─── */
        Order order = Order.builder()
                .id(generateOrderId())
                .tenantId(tenantId)
                .userId(userId)
                .status("pending")
                .subtotal(subtotal)
                .discount(discount)
                .tax(tax)
                .shipping(shipping)
                .total(total)
                .couponId(couponId)
                .couponCode(couponCode)
                .customerName(req.getCustomerName().trim())
                .customerEmail(req.getCustomerEmail().trim().toLowerCase())
                .customerPhone(req.getCustomerPhone().trim())
                .addressStreet(req.getAddressStreet().trim())
                .addressCity(req.getAddressCity().trim())
                .addressZip(req.getAddressZip() != null ? req.getAddressZip().trim() : null)
                .paymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "card")
                .paymentStatus("unpaid")
                .placedById(userId)
                .placedByName(userName != null ? userName : "Guest")
                .placedByRole(userRole != null ? userRole : "guest")
                .notes(req.getNotes())
                .registryGiftId(req.getGiftId())
                .build();

        orderRepository.save(order);

        /* ─── Persist items ─── */
        for (OrderItem item : items) {
            item.setOrderId(order.getId());
        }
        orderItemRepository.saveAll(items);

        /* ─── If this order fulfills a registry gift, link them ─── */
        if (req.getGiftId() != null && !req.getGiftId().isBlank()) {
            linkGiftToOrder(req.getGiftId().trim(), order.getId());
        }

        return orderMapper.toDto(order, items);
    }

    /* ═══════════════ QUERIES ═══════════════ */

    @Transactional(readOnly = true)
    public OrderDto getById(String tenantId, String callerRole, String callerEmail, String orderId) {
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        /* Customer can only see their own orders */
        if ("customer".equals(callerRole)
                && callerEmail != null
                && !callerEmail.equalsIgnoreCase(order.getCustomerEmail())) {
            throw new ForbiddenException("You can only view your own orders");
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        return orderMapper.toDto(order, items);
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryDto> listForTenant(String tenantId, String status) {
        List<Order> orders = status != null
                ? orderRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(
                        tenantId, status, org.springframework.data.domain.PageRequest.of(0, 200)).getContent()
                : orderRepository.findByTenantIdOrderByCreatedAtDesc(
                        tenantId, org.springframework.data.domain.PageRequest.of(0, 200)).getContent();

        return orders.stream()
                .map(o -> orderMapper.toSummary(o, orderItemRepository.findByOrderId(o.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryDto> listForCustomer(String email) {
        return orderRepository.findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(email).stream()
                .map(o -> orderMapper.toSummary(o, orderItemRepository.findByOrderId(o.getId())))
                .toList();
    }

     @Transactional(readOnly = true)
    public OrderDto trackPublic(String tenantId, String query) {
        if (query == null || query.isBlank()) {
            throw new ApiException("Search query is required", HttpStatus.BAD_REQUEST);
        }
        String clean = query.trim().toUpperCase();

        // 1. Try by Order ID (e.g. ORD-UXAUEE)
        Order order = orderRepository.findById(clean).orElse(null);
        
        // 2. Try by Tracking Number (e.g. G4S-2026-XXXX)
        if (order == null) {
            order = orderRepository.findByTenantIdAndTrackingNumber(tenantId, clean).orElse(null);
        }

        // 3. Try by Email
        if (order == null) {
            List<Order> byEmail = orderRepository.findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(clean);
            if (!byEmail.isEmpty()) order = byEmail.get(0);
        }

        if (order == null) {
            throw new ResourceNotFoundException("Order not found");
        }

        return orderMapper.toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    /* ═══════════════ STATE TRANSITIONS ═══════════════ */

    @Transactional
    public OrderDto confirm(String tenantId, String callerRole, String orderId) {
        requireStaff(callerRole);
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!"pending".equals(order.getStatus())) {
            throw new ApiException("Only pending orders can be confirmed", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        order.setStatus("confirmed");
        orderRepository.save(order);
        return orderMapper.toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    @Transactional
    public OrderDto fulfill(String tenantId, String callerRole, String orderId) {
        requireStaff(callerRole);
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (!"confirmed".equals(order.getStatus())) {
            throw new ApiException("Only confirmed orders can be fulfilled", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        order.setStatus("fulfilled");
        order.setPaymentStatus("paid");
        orderRepository.save(order);
        return orderMapper.toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    @Transactional
    public OrderDto cancel(String tenantId, String callerRole, String orderId) {
        requireStaff(callerRole);
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if ("cancelled".equals(order.getStatus()) || "fulfilled".equals(order.getStatus())) {
            throw new ApiException("Cannot cancel this order", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        order.setStatus("cancelled");
        orderRepository.save(order);
        return orderMapper.toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    /* ═══════════════ GENERIC UPDATE (staff only) ═══════════════ */
    /* Used by:
       - Edit Order modal → sends { customer: { name, email, phone, address, city, zip } }
       - Confirm flow → sends { carrierId, carrierName, trackingNumber, eta }
    */

    @Transactional
    public OrderDto update(String tenantId, String callerRole, String orderId, Map<String, Object> patch) {
        requireStaff(callerRole);
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        /* Customer fields — from the Edit Order modal */
        if (patch.containsKey("customer")) {
            Object rawCustomer = patch.get("customer");
            if (rawCustomer instanceof Map<?, ?> c) {
                if (c.containsKey("name"))    order.setCustomerName(strOrNull(c.get("name")));
                if (c.containsKey("email"))   order.setCustomerEmail(strOrNull(c.get("email")));
                if (c.containsKey("phone"))   order.setCustomerPhone(strOrNull(c.get("phone")));
                if (c.containsKey("address")) order.setAddressStreet(strOrNull(c.get("address")));
                if (c.containsKey("city"))    order.setAddressCity(strOrNull(c.get("city")));
                if (c.containsKey("zip"))     order.setAddressZip(strOrNull(c.get("zip")));
            }
        }

        /* Tracking fields — from confirm flow */
        if (patch.containsKey("carrierId"))      order.setCarrierId(strOrNull(patch.get("carrierId")));
        if (patch.containsKey("carrierName"))    order.setCarrierName(strOrNull(patch.get("carrierName")));
        if (patch.containsKey("trackingNumber")) order.setTrackingNumber(strOrNull(patch.get("trackingNumber")));
        if (patch.containsKey("eta"))            order.setEta(asInstant(patch.get("eta")));

        /* Free-form notes */
        if (patch.containsKey("notes")) order.setNotes(strOrNull(patch.get("notes")));

        orderRepository.save(order);
        return orderMapper.toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    /* ═══════════════ DELETE (staff only) ═══════════════ */

    @Transactional
    public void delete(String tenantId, String callerRole, String orderId) {
        requireStaff(callerRole);
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        /* order_items has a FK to orders → delete children first */
        orderItemRepository.deleteAll(orderItemRepository.findByOrderId(orderId));
        orderRepository.delete(order);
    }

    /* ═══════════════ ADD CHECKPOINT (staff only) ═══════════════ */
    /* Appends one checkpoint object to the JSON column. */

    @Transactional
    public OrderDto addCheckpoint(String tenantId, String callerRole, String orderId,
                                  Map<String, Object> checkpoint) {
        requireStaff(callerRole);
        Order order = orderRepository.findByIdAndTenantId(orderId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        List<Map<String, Object>> list;
        try {
            list = (order.getCheckpoints() == null || order.getCheckpoints().isBlank())
                    ? new ArrayList<>()
                    : objectMapper.readValue(order.getCheckpoints(),
                            new com.fasterxml.jackson.core.type.TypeReference<>() {});
            if (list == null) list = new ArrayList<>();
        } catch (Exception e) {
            list = new ArrayList<>();
        }

        list.add(checkpoint);

        try {
            order.setCheckpoints(objectMapper.writeValueAsString(list));
        } catch (Exception e) {
            throw new ApiException("Could not save checkpoint", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        orderRepository.save(order);
        return orderMapper.toDto(order, orderItemRepository.findByOrderId(order.getId()));
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private void requireStaff(String role) {
        if (!"owner".equals(role) && !"sales".equals(role)) {
            throw new ForbiddenException("Only staff can manage orders");
        }
    }

    private int getVariantStock(Product p, String size, String color) {
        if (p.getVariants() == null || p.getVariants().isBlank()) {
            return p.getTotalStock() == null ? 0 : p.getTotalStock();
        }
        try {
            String key = (size == null ? "_" : size) + "-" + (color == null ? "_" : color);
            Map<String, Map<String, Object>> variants = objectMapper.readValue(
                    p.getVariants(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
            Map<String, Object> v = variants.get(key);
            if (v == null) return 0;
            Object s = v.get("stock");
            if (s instanceof Number n) return n.intValue();
            return 0;
        } catch (Exception e) {
            return 0;
        }
    }

    private String generateOrderId() {
        for (int i = 0; i < 10; i++) {
            StringBuilder sb = new StringBuilder("ORD-");
            for (int j = 0; j < 6; j++) {
                sb.append(ID_CHARS.charAt(RANDOM.nextInt(ID_CHARS.length())));
            }
            String candidate = sb.toString();
            if (orderRepository.findById(candidate).isEmpty()) return candidate;
        }
        throw new ApiException("Could not generate unique order ID", HttpStatus.INTERNAL_SERVER_ERROR);
    }

        /**
     * Link a registry gift to an order. Finds the registry that holds this gift ID,
     * then sets gifts[i].orderId = orderId inside the JSON array.
     * Silent on failure — if the gift was already deleted or the JSON is malformed,
     * we don't fail the whole order.
     */
    @Transactional
    protected void linkGiftToOrder(String giftId, String orderId) {
        try {
            List<Registry> allRegistries = registryRepository.findAll();
            for (Registry reg : allRegistries) {
                String giftsJson = reg.getGifts();
                if (giftsJson == null || !giftsJson.contains(giftId)) continue;

                List<Map<String, Object>> gifts = objectMapper.readValue(
                        giftsJson, new com.fasterxml.jackson.core.type.TypeReference<>() {});
                if (gifts == null) continue;

                boolean changed = false;
                for (Map<String, Object> g : gifts) {
                    if (giftId.equals(g.get("id"))) {
                        g.put("orderId", orderId);
                        g.put("orderLinkedAt", Instant.now().toString());
                        changed = true;
                        break;
                    }
                }

                if (changed) {
                    reg.setGifts(objectMapper.writeValueAsString(gifts));
                    registryRepository.save(reg);
                    return;    // ← stop after first match
                }
            }
        } catch (Exception e) {
            /* Silent — linking is a nice-to-have, not critical to the order */
            System.err.println("[OrderService] Could not link gift " + giftId
                    + " to order " + orderId + ": " + e.getMessage());
        }
    }

    /* ─── New private helpers ─── */

    private static String strOrNull(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static Instant asInstant(Object o) {
        if (o == null) return null;
        try {
            return Instant.parse(o.toString());
        } catch (Exception e) {
            return null;
        }
    }
}