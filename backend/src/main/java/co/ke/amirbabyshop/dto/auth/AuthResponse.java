package co.ke.amirbabyshop.dto.auth;

import co.ke.amirbabyshop.dto.user.UserDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private long expiresIn;      // milliseconds
    private UserDto user;
    private boolean requiresApproval;
}