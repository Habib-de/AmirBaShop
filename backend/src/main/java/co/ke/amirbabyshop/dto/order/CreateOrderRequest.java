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

    private String paymentMethod = "card";   // card | cod | momo | mpesa

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