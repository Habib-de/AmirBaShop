package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.auth.AuthResponse;
import co.ke.amirbabyshop.dto.auth.LoginRequest;
import co.ke.amirbabyshop.dto.auth.RegisterRequest;
import co.ke.amirbabyshop.dto.user.UserDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.AuthService;
import co.ke.amirbabyshop.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ApiResponse.ok("Registered successfully", authService.register(req));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ApiResponse.ok("Login successful", authService.login(req));
    }

    @GetMapping("/me")
    public ApiResponse<UserDto> me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(userService.getById(principal.getId()));
    }
}