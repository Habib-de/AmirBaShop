package co.ke.amirbabyshop.dto.notification;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class NotificationDto {
    private String id;
    private String type;
    private String title;
    private String body;
    private String link;
    private Boolean read;
    private Instant createdAt;
}