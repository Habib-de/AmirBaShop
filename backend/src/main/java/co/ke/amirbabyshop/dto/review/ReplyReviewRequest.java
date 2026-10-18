package co.ke.amirbabyshop.dto.review;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReplyReviewRequest {

    @NotBlank
    @Size(max = 2000)
    private String text;

    /** Filled in by the controller from the JWT principal. */
    private String author;
    private String role;
}