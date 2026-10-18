package co.ke.amirbabyshop.dto.category;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDto {
    private Integer id;
    private String slug;
    private String name;
    private String icon;
    private Integer sortOrder;
}