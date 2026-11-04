package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.Category;
import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.domain.ProductVariant;
import co.ke.amirbabyshop.dto.category.CategoryDto;
import co.ke.amirbabyshop.dto.product.ProductDto;
import co.ke.amirbabyshop.dto.product.ProductSummaryDto;
import co.ke.amirbabyshop.dto.product.ProductVariantDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring")
public abstract class ProductMapper {

    @Autowired
    protected ObjectMapper objectMapper;

    /* ═══ Category → CategoryDto ═══ */
    public abstract CategoryDto toDto(Category category);

    /* ═══ Product → ProductDto (full, with variants list) ═══ */
    @Mapping(target = "sizes",    source = "sizes",    qualifiedByName = "jsonToList")
    @Mapping(target = "colors",   source = "colors",   qualifiedByName = "jsonToList")
    @Mapping(target = "variants", source = "variants", qualifiedByName = "variantListToDto")
    public abstract ProductDto toDto(Product product);

    /* ═══ Product → ProductSummaryDto (light) ═══ */
    public abstract ProductSummaryDto toSummary(Product product);

    /* ═══ ProductVariant → ProductVariantDto (with computed label) ═══ */
    @Mapping(target = "label", source = ".", qualifiedByName = "computeLabel")
    public abstract ProductVariantDto toVariantDto(ProductVariant variant);

    /* ═══ JSON string → List<String> ═══ */
    @Named("jsonToList")
    protected List<String> jsonToList(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    /* ═══ List<ProductVariant> → List<ProductVariantDto> ═══ */
    @Named("variantListToDto")
    protected List<ProductVariantDto> variantListToDto(List<ProductVariant> variants) {
        if (variants == null || variants.isEmpty()) return List.of();
        return variants.stream().map(this::toVariantDto).toList();
    }

    /* ═══ Compute "0-3M · Pink" or "Standard" ═══ */
    @Named("computeLabel")
    protected String computeLabel(ProductVariant v) {
        if (v == null) return null;
        if (v.getSize() == null && v.getColor() == null) return "Standard";
        if (v.getSize() == null) return v.getColor();
        if (v.getColor() == null) return v.getSize();
        return v.getSize() + " · " + v.getColor();
    }
}