package co.ke.amirbabyshop.dto.user;

import lombok.Data;

@Data
public class UpdatePreferenceRequest {
    private String theme;          // "light" | "dark"
    private String language;       // "en", "sw", etc.
    private String notifications;  // JSON string: {"order":true,"promo":false}
}