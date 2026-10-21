package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.currency.CurrencyRateDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.CurrencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/currency")
@RequiredArgsConstructor
public class CurrencyController {

    private final CurrencyService currencyService;

    /** Public — the frontend calls this on every page load, even for guests. */
    @GetMapping("/rates")
    public ApiResponse<Map<String, CurrencyRateDto>> rates() {
        return ApiResponse.ok(currencyService.getRates());
    }

    /** Public — guests default to 'KES'. */
    @GetMapping("/preference")
    public ApiResponse<String> getPreferred(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ApiResponse.ok("KES");
        }
        return ApiResponse.ok(currencyService.getPreferred(principal.getId()));
    }

    /** Authenticated. */
    @PutMapping("/preference")
    public ApiResponse<String> setPreferred(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Currency updated",
                currencyService.setPreferred(principal.getId(), body.get("code")));
    }

    /** Staff-only — update a currency rate. */
    @PutMapping("/rates/{code}")
    public ApiResponse<CurrencyRateDto> updateRate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String code,
            @RequestBody Map<String, Object> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        if (!"owner".equals(principal.getRole()) && !"sales".equals(principal.getRole())) {
            throw new ForbiddenException("Only staff can change currency rates");
        }

        Double kesPerUnit = body.get("kesPerUnit") != null
                ? ((Number) body.get("kesPerUnit")).doubleValue()
                : null;
        String symbol = (String) body.get("symbol");
        String label  = (String) body.get("label");

        return ApiResponse.ok("Rate updated",
                currencyService.updateRate(code, kesPerUnit, symbol, label));
    }

    /** Staff-only — create a new currency. */
    @PostMapping("/rates")
    public ApiResponse<CurrencyRateDto> createRate(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        if (!"owner".equals(principal.getRole()) && !"sales".equals(principal.getRole())) {
            throw new ForbiddenException("Only staff can add currencies");
        }

        String code = (String) body.get("code");
        Double kesPerUnit = body.get("kesPerUnit") != null
                ? ((Number) body.get("kesPerUnit")).doubleValue()
                : null;
        String symbol = (String) body.get("symbol");
        String label  = (String) body.get("label");

        return ApiResponse.ok("Currency created",
                currencyService.createRate(code, kesPerUnit, symbol, label));
    }
}