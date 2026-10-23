package co.ke.amirbabyshop.dto.push;

import lombok.Data;

@Data
public class SubscribePushRequest {
    private String endpoint;
    private Keys keys;

    @Data
    public static class Keys {
        private String p256dh;
        private String auth;
    }
}