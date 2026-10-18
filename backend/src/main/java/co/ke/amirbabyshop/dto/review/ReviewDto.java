package co.ke.amirbabyshop.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDto {

    private Long id;
    private Long productId;
    private Long userId;

    private String authorName;
    private String authorEmail;
    private String authorRole;

    private Integer rating;
    private String title;
    private String comment;

    private String imageUrl;
    private List<Map<String, Object>> photos;

    private Boolean verified;
    private Integer helpful;
    private Integer notHelpful;

    private String status;
    private List<Map<String, Object>> replies;

    private Instant createdAt;
    private Instant updatedAt;
}