package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.domain.Order;
import co.ke.amirbabyshop.repository.OrderRepository;
import co.ke.amirbabyshop.service.NotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/payments/mpesa")
@RequiredArgsConstructor
public class MpesaCallbackController {

    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Daraja POSTs here after the customer enters (or cancels) their PIN.
     *
     * Success shape:
     *   Body.StkCallback.CheckoutRequestID
     *   Body.StkCallback.ResultCode = 0
     *   Body.StkCallback.CallbackMetadata.Item[].{Name,Value}
     *     - Amount
     *     - MpesaReceiptNumber
     *     - TransactionDate
     *     - PhoneNumber
     *
     * Cancel/timeout shape:
     *   Body.StkCallback.ResultCode != 0
     *   Body.StkCallback.ResultDesc = "The request was cancelled by the user"
     *
     * IMPORTANT:
     *  - Always respond HTTP 200 with { "ResultCode": 0, "ResultDesc": "Accepted" }.
     *    If we return 500 or a bad shape, Safaricom will retry every 30s for up to 8 tries.
     *  - Be idempotent: if the same callback arrives twice, second one should no-op.
     */
    @PostMapping("/callback")
    public ResponseEntity<Map<String, Object>> callback(@RequestBody Map<String, Object> body) {
        log.info("[M-Pesa CALLBACK] {}", body);

        try {
            JsonNode root = objectMapper.valueToTree(body);
            JsonNode stk = root.path("Body").path("stkCallback");

            String checkoutId = stk.path("CheckoutRequestID").asText(null);
            int resultCode    = stk.path("ResultCode").asInt(-1);
            String resultDesc = stk.path("ResultDesc").asText("");

            if (checkoutId == null || checkoutId.isBlank()) {
                log.warn("[M-Pesa CALLBACK] Missing CheckoutRequestID");
                return accepted();
            }

            Optional<Order> maybe = orderRepository.findByMpesaCheckoutRequestId(checkoutId);
            if (maybe.isEmpty()) {
                log.warn("[M-Pesa CALLBACK] No order for CheckoutRequestID={}", checkoutId);
                return accepted();
            }

            Order order = maybe.get();

            /* Idempotency: if already paid, do nothing */
            if ("paid".equals(order.getPaymentStatus())) {
                log.info("[M-Pesa CALLBACK] Order {} already paid — ignoring duplicate", order.getId());
                return accepted();
            }

            if (resultCode == 0) {
                /* SUCCESS — extract receipt + amount */
                String receipt = null;
                JsonNode items = stk.path("CallbackMetadata").path("Item");
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        String name = item.path("Name").asText("");
                        if ("MpesaReceiptNumber".equals(name)) {
                            receipt = item.path("Value").asText(null);
                        }
                    }
                }

                order.setPaymentStatus("paid");
                if (receipt != null) order.setMpesaReceiptCode(receipt);
                orderRepository.save(order);

                log.info("[M-Pesa CALLBACK] ✅ Order {} PAID — receipt {}",
                        order.getId(), receipt);

                /* Notify customer */
                if (order.getUserId() != null) {
                    notificationService.createForUser(
                            order.getUserId(),
                            "order",
                            "Payment received 💳",
                            "Order " + order.getId() + " is now paid. We'll confirm it shortly.",
                            "/my-orders"
                    );
                } else if (order.getCustomerEmail() != null) {
                    notificationService.createForEmail(
                            order.getCustomerEmail(),
                            "order",
                            "Payment received 💳",
                            "Order " + order.getId() + " is now paid. We'll confirm it shortly.",
                            "/my-orders"
                    );
                }

            } else {
                /* Cancel / timeout / insufficient funds — leave unpaid, notify */
                log.info("[M-Pesa CALLBACK] ❌ Order {} not paid — code {} ({})",
                        order.getId(), resultCode, resultDesc);

                if (order.getUserId() != null) {
                    notificationService.createForUser(
                            order.getUserId(),
                            "order",
                            "Payment not completed",
                            "Order " + order.getId() + " is still unpaid. "
                                    + "You can retry or pay via paybill.",
                            "/pay/" + order.getId()
                    );
                }
            }

            return accepted();

        } catch (Exception e) {
            log.error("[M-Pesa CALLBACK] Error handling callback", e);
            /* Still return 200 so Safaricom stops retrying — we've logged it */
            return accepted();
        }
    }

    /** The exact shape Safaricom expects. Anything else triggers retries. */
    private ResponseEntity<Map<String, Object>> accepted() {
        return ResponseEntity.ok(Map.of(
                "ResultCode", 0,
                "ResultDesc", "Accepted"
        ));
    }
}