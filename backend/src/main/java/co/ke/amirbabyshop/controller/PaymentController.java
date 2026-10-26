package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Order;
import co.ke.amirbabyshop.repository.OrderRepository;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.MpesaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/payments/mpesa")
@RequiredArgsConstructor
public class PaymentController {

    private final MpesaService mpesaService;
    private final OrderRepository orderRepository;

    /* ═══════════════ FIRE STK PUSH ═══════════════ */

    /**
     * Called by the frontend after the customer confirms their phone number
     * on the /pay/:orderId screen.
     *
     * Request body: { "orderId": "ORD-XXXXXX", "phone": "+254 700 123 456" }
     */
    @PostMapping("/stk-push")
    public Map<String, Object> stkPush(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) {
            throw new ApiException("Not authenticated", HttpStatus.UNAUTHORIZED);
        }

        String orderId = body.get("orderId");
        String phone   = body.get("phone");

        if (orderId == null || orderId.isBlank()) {
            throw new ApiException("orderId is required", HttpStatus.BAD_REQUEST);
        }
        if (phone == null || phone.isBlank()) {
            throw new ApiException("phone is required", HttpStatus.BAD_REQUEST);
        }

        /* Load and authorize the order */
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        /* Only the customer who placed the order (or staff) can pay */
        String callerRole = principal.getRole();
        boolean isStaff = "owner".equals(callerRole) || "sales".equals(callerRole);
        if (!isStaff) {
            String callerEmail = principal.getUsername();
            if (order.getCustomerEmail() == null
                    || !order.getCustomerEmail().equalsIgnoreCase(callerEmail)) {
                throw new ForbiddenException("You can only pay for your own orders");
            }
        }

        /* Guard rails */
        if ("paid".equals(order.getPaymentStatus())) {
            throw new ApiException("This order is already paid", HttpStatus.CONFLICT);
        }
        if ("cancelled".equals(order.getStatus())) {
            throw new ApiException("This order is cancelled", HttpStatus.CONFLICT);
        }
        if (!"mpesa".equals(order.getPaymentMethod())) {
            throw new ApiException(
                    "This order is not set for M-Pesa. Change the payment method first.",
                    HttpStatus.CONFLICT);
        }
        if (!"stk_push".equals(order.getPaymentFlow())) {
            throw new ApiException(
                    "This order is set for manual paybill — not STK push",
                    HttpStatus.CONFLICT);
        }

        /* Fire the STK push */
        Map<String, Object> darajaResp = mpesaService.stkPush(
                phone,
                BigDecimal.valueOf(order.getTotal().doubleValue()),
                order.getId(),
                "AMIR BabyShop order " + order.getId()
        );

        /* Save CheckoutRequestID for the callback to find */
        String checkoutId = darajaResp == null ? null
                : String.valueOf(darajaResp.get("CheckoutRequestID"));
        if (checkoutId != null && !"null".equals(checkoutId)) {
            order.setMpesaCheckoutRequestId(checkoutId);
            orderRepository.save(order);
        }

        /* Return a trimmed response for the frontend */
        String responseCode = darajaResp == null ? null
                : String.valueOf(darajaResp.get("ResponseCode"));

        Map<String, Object> out = new HashMap<>();
        out.put("ok", "0".equals(responseCode));
        out.put("checkoutRequestId", checkoutId);
        out.put("customerMessage", darajaResp == null ? null
                : darajaResp.get("CustomerMessage"));
        if (!"0".equals(responseCode)) {
            out.put("error", darajaResp == null ? "Daraja returned no response"
                    : darajaResp.get("ResponseDescription"));
        }

        log.info("[PaymentController] STK push for order {} — ok={} checkoutId={}",
                order.getId(), out.get("ok"), checkoutId);
        return out;
    }

    /* ═══════════════ POLL PAYMENT STATUS ═══════════════ */

    /**
     * Frontend polls this every 2-3 seconds after firing STK push.
     * Returns the local order status (updated by the callback).
     */
    @GetMapping("/status/{orderId}")
    public Map<String, Object> status(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String orderId
    ) {
        if (principal == null) {
            throw new ApiException("Not authenticated", HttpStatus.UNAUTHORIZED);
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        String callerRole = principal.getRole();
        boolean isStaff = "owner".equals(callerRole) || "sales".equals(callerRole);
        if (!isStaff) {
            String callerEmail = principal.getUsername();
            if (order.getCustomerEmail() == null
                    || !order.getCustomerEmail().equalsIgnoreCase(callerEmail)) {
                throw new ForbiddenException("You can only check your own orders");
            }
        }

        Map<String, Object> out = new HashMap<>();
        out.put("orderId", order.getId());
        out.put("paymentStatus", order.getPaymentStatus());
        out.put("orderStatus", order.getStatus());
        out.put("receipt", order.getMpesaReceiptCode());
        return out;
    }
}