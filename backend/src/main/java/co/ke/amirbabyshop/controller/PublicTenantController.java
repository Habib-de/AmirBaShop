package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.domain.Tenant;
import co.ke.amirbabyshop.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tenants/public")
@RequiredArgsConstructor
public class PublicTenantController {

    private final TenantRepository tenantRepository;

    @GetMapping
    public ApiResponse<List<Map<String, String>>> list() {
        List<Map<String, String>> shops = tenantRepository.findAll().stream()
                .filter(t -> "active".equals(t.getStatus()))
                .map(t -> Map.of(
                        "id", t.getId(),
                        "name", t.getName()
                ))
                .toList();
        return ApiResponse.ok(shops);
    }
}