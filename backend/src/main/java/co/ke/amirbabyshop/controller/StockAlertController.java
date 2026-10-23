package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.stockalert.CreateStockAlertRequest;
import co.ke.amirbabyshop.dto.stockalert.StockAlertDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.StockAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stock-alerts")
@RequiredArgsConstructor
public class StockAlertController {

    private final StockAlertService stockAlertService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    /** Public — guests can subscribe. Logged-in users override email with their own. */
    @PostMapping
    public ApiResponse<StockAlertDto> subscribe(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CreateStockAlertRequest req
    ) {
        String tenantId = principal != null && principal.getTenantId() != null
                ? principal.getTenantId()
                : defaultTenant;

        // Logged-in users: always subscribe their own email (never trust the client)
        if (principal != null) {
            req.setEmail(principal.getUsername());
        }

        return ApiResponse.ok("Subscribed", stockAlertService.subscribe(tenantId, req));
    }

    @GetMapping("/mine")
    public ApiResponse<List<StockAlertDto>> mine(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(stockAlertService.listMine(principal.getUsername()));
    }
}