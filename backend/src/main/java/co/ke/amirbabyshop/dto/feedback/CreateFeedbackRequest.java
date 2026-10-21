package co.ke.amirbabyshop.dto.feedback;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateFeedbackRequest {
    @NotBlank
    private String name;
    
    @NotBlank @Email
    private String email;
    
    @NotBlank
    private String subject;
    
    @NotBlank
    private String message;
    
    private String sentBy;
    private Long userId;
}