package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.Category;
import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.dto.category.CategoryDto;
import co.ke.amirbabyshop.dto.product.ProductDto;
import co.ke.amirbabyshop.dto.product.ProductSummaryDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring")
public abstract class ProductMapper {

    @Autowired
    protected ObjectMapper objectMapper;

    /* ═══ Category → CategoryDto ═══ */
    public abstract CategoryDto toDto(Category category);

    /* ═══ Product → ProductDto (full, with parsed JSON) ═══ */
    @Mapping(target = "sizes",    source = "sizes",    qualifiedByName = "jsonToList")
    @Mapping(target = "colors",   source = "colors",   qualifiedByName = "jsonToList")
    @Mapping(target = "variants", source = "variants", qualifiedByName = "jsonToMap")
    public abstract ProductDto toDto(Product product);

    /* ═══ Product → ProductSummaryDto (light — same field names, no config needed) ═══ */
    public abstract ProductSummaryDto toSummary(Product product);

    /* ═══ JSON helpers ═══ */

    @Named("jsonToList")
    protected List<String> jsonToList(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    @Named("jsonToMap")
    protected Map<String, Map<String, Object>> jsonToMap(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Map<String, Object>>>() {});
        } catch (Exception e) {
            return null;
        }
    }
}