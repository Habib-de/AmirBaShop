package co.ke.amirbabyshop.dto.feedback;

import lombok.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackDto {
    private String id;
    private Long userId;
    private String name;
    private String email;
    private String subject;
    private String message;
    private String sentBy;
    private String status;
    private List<Map<String, Object>> replies;
    private Instant createdAt;
    private Instant updatedAt;
}