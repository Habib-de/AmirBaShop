package co.ke.amirbabyshop.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String tenantId;
    private String tenantName;      // ← NEW
    private String name;
    private String email;
    private String phone;
    private String role;
    private String status;
    private String avatarUrl;
    private Instant createdAt;
}