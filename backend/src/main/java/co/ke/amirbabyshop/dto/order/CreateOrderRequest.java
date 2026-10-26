package co.ke.amirbabyshop.dto.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateOrderRequest {

    @NotEmpty
    @Valid
    private List<Item> items;

    @NotBlank
    private String customerName;

    @NotBlank
    @Email
    private String customerEmail;

    @NotBlank
    private String customerPhone;

    @NotBlank
    private String addressStreet;

    @NotBlank
    private String addressCity;

    @Size(max = 20)
    private String addressZip;

         private String paymentMethod = "mpesa";  // cod | momo | mpesa

    /** For M-Pesa orders: which sub-flow the customer picked.
        'manual_paybill' or 'stk_push'. Defaults to 'manual_paybill'. */
    private String paymentFlow;

    /**
     * STAFF-ONLY — ignored for customer/guest orders (backend forces 'unpaid').
     * Values: 'paid' | 'unpaid'.
     * Used when a staff member (owner/sales) records a walk-in or phone order
     * and the customer has already paid.
     */
    private String paymentStatus;

    /**
     * STAFF-ONLY — only used when paymentStatus='paid' AND paymentMethod='mpesa'.
     * The M-Pesa confirmation code (e.g. "SGH1ABCDEFG").
     * Ignored for customer/guest orders.
     */
    private String mpesaReceiptCode;

    private String couponCode;               // optional

    private String giftId;

    @Size(max = 2000)
    private String notes;

    @Data
    public static class Item {

        @NotNull
        private Long productId;

        @NotNull
        @Positive
        private Integer qty;

        private String size;
        private String color;

        /** Customer-facing price the frontend showed — used for verification */
        @NotNull
        private BigDecimal price;
    }
}