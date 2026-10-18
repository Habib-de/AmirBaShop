package co.ke.amirbabyshop.dto.review;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VoteReviewRequest {

    @NotBlank
    @Pattern(regexp = "up|down", message = "Vote must be 'up' or 'down'")
    private String vote;

    /** For guests — generated client-side and stored in localStorage. */
    private String guestToken;
}