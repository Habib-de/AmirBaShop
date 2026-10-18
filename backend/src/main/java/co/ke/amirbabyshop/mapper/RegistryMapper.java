package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.Registry;
import co.ke.amirbabyshop.dto.registry.RegistryDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class RegistryMapper {

    @Autowired
    private ObjectMapper objectMapper;

    public RegistryDto toDto(Registry r) {
        if (r == null) return null;
        return RegistryDto.builder()
                .id(r.getId())
                .slug(r.getSlug())
                .ownerUserId(r.getOwnerUserId())
                .ownerEmail(r.getOwnerEmail())
                .ownerName(r.getOwnerName())
                .babyName(r.getBabyName())
                .dueDate(r.getDueDate())
                .theme(r.getTheme())
                .message(r.getMessage())
                .coverImageUrl(r.getCoverImageUrl())
                .items(parseList(r.getItems()))
                .gifts(parseList(r.getGifts()))
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    public String toJson(Object obj) {
        if (obj == null) return "[]";
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    private List<Map<String, Object>> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}