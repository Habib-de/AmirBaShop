package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.push.SubscribePushRequest;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.PushService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/push")
@RequiredArgsConstructor
public class PushController {

    private final PushService pushService;

    /** Public — frontend needs this to create a subscription. */
    @GetMapping("/public-key")
    public ApiResponse<String> publicKey() {
        return ApiResponse.ok(pushService.getPublicKey());
    }

    @PostMapping("/subscribe")
    public ApiResponse<Map<String, Object>> subscribe(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SubscribePushRequest req,
            HttpServletRequest request
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        pushService.subscribe(principal.getId(), req, request.getHeader("User-Agent"));
        return ApiResponse.ok(Map.of("subscribed", true));
    }

    @DeleteMapping("/unsubscribe")
    public ApiResponse<Map<String, Object>> unsubscribe(@RequestParam String endpoint) {
        pushService.unsubscribe(endpoint);
        return ApiResponse.ok(Map.of("unsubscribed", true));
    }
}