package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.Review;
import co.ke.amirbabyshop.dto.review.ReviewDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class ReviewMapper {

    @Autowired
    private ObjectMapper objectMapper;

    public ReviewDto toDto(Review r) {
        if (r == null) return null;

        return ReviewDto.builder()
                .id(r.getId())
                .productId(r.getProductId())
                .userId(r.getUserId())
                .authorName(r.getAuthorName())
                .authorEmail(r.getAuthorEmail())
                .authorRole(r.getAuthorRole())
                .rating(r.getRating())
                .title(r.getTitle())
                .comment(r.getComment())
                .imageUrl(r.getImageUrl())
                .photos(parseList(r.getPhotos()))
                .verified(r.getVerified())
                .helpful(r.getHelpful())
                .notHelpful(r.getNotHelpful())
                .status(r.getStatus())
                .replies(parseList(r.getReplies()))
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    public String toJson(Object obj) {
        if (obj == null) return null;
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return null; }
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