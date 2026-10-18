package co.ke.amirbabyshop.dto.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class CreateReviewRequest {

    @NotNull
    private Long productId;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    @Size(max = 120)
    private String title;

    @Size(max = 3000)
    private String comment;

    private String imageUrl;

    /** [{ full: "...", thumb: "..." }, ...] — up to 5 photos */
    private List<Map<String, Object>> photos;

    /** Set by the controller from the JWT principal — client shouldn't send this */
    private String authorName;
    private String authorEmail;
    private String authorRole;
    private Long userId;
}