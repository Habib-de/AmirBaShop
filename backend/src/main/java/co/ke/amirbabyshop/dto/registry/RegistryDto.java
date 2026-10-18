package co.ke.amirbabyshop.dto.registry;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistryDto {
    private String id;
    private String slug;

    private Long ownerUserId;
    private String ownerEmail;
    private String ownerName;

    private String babyName;
    private LocalDate dueDate;
    private String theme;
    private String message;
    private String coverImageUrl;

    private List<Map<String, Object>> items;
    private List<Map<String, Object>> gifts;

    private Instant createdAt;
    private Instant updatedAt;
}