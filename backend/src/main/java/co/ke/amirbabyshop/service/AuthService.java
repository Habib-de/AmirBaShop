package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.domain.Tenant;
import co.ke.amirbabyshop.domain.User;
import co.ke.amirbabyshop.dto.auth.AuthResponse;
import co.ke.amirbabyshop.dto.auth.LoginRequest;
import co.ke.amirbabyshop.dto.auth.RegisterRequest;
import co.ke.amirbabyshop.mapper.UserMapper;
import co.ke.amirbabyshop.repository.TenantRepository;
import co.ke.amirbabyshop.repository.UserRepository;
import co.ke.amirbabyshop.security.JwtService;
import co.ke.amirbabyshop.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Set<String> VALID_ROLES = Set.of("customer", "sales", "owner");

    /* ─── Random ID generator ───
       32 chars, no 0/O/1/I/L to avoid visual ambiguity.
       8 chars → 32^8 ≈ 1.1 trillion combos. Collision-safe. */
    private static final String ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /* ═══════════════ REGISTER ═══════════════ */

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        String role = req.getRole() == null ? "customer" : req.getRole().trim().toLowerCase();

        if (!VALID_ROLES.contains(role)) {
            throw new ApiException("Invalid role: " + role, HttpStatus.BAD_REQUEST);
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException("An account with this email already exists.", HttpStatus.CONFLICT);
        }

        String tenantId;
        String status;

        if ("owner".equals(role)) {
            // Owner creates a new tenant with a random ID
            if (req.getShopName() == null || req.getShopName().isBlank()) {
                throw new ApiException("Shop name is required for owner registration.", HttpStatus.BAD_REQUEST);
            }

            String newTenantId = generateUniqueTenantId();

            Tenant tenant = Tenant.builder()
                    .id(newTenantId)
                    .name(req.getShopName().trim())
                    .slug(newTenantId)            // slug mirrors the id for URL friendliness
                    .ownerEmail(email)
                    .addressCountry("Kenya")
                    .currency("KES")
                    .status("active")
                    .build();
            tenantRepository.save(tenant);
            tenantId = newTenantId;
            status = "active";
        } else {
            // Customer or sales — must belong to existing tenant
            if (req.getTenantId() == null || req.getTenantId().isBlank()) {
                throw new ApiException("Please choose a shop.", HttpStatus.BAD_REQUEST);
            }
            Tenant tenant = tenantRepository.findById(req.getTenantId())
                    .orElseThrow(() -> new ApiException("The selected shop does not exist.", HttpStatus.BAD_REQUEST));
            tenantId = tenant.getId();
            status = "sales".equals(role) ? "pending" : "active";
        }

        User user = User.builder()
                .tenantId(tenantId)
                .name(req.getName().trim())
                .email(email)
                .phone(req.getPhone() != null ? req.getPhone().trim() : null)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(role)
                .status(status)
                .build();

        userRepository.save(user);

        boolean requiresApproval = "pending".equals(status);
        UserPrincipal principal = new UserPrincipal(user);

        return AuthResponse.builder()
                .accessToken(requiresApproval ? null : jwtService.generateAccessToken(principal))
                .refreshToken(requiresApproval ? null : jwtService.generateRefreshToken(principal))
                .expiresIn(jwtService.getAccessTokenTtl())
                .user(userMapper.toDto(user))
                .requiresApproval(requiresApproval)
                .build();
    }

    /* ═══════════════ LOGIN ═══════════════ */

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = req.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if ("pending".equals(user.getStatus())) {
            throw new ApiException(
                    "Your account is pending approval. Please wait for the shop owner to activate it.",
                    HttpStatus.FORBIDDEN);
        }
        if ("rejected".equals(user.getStatus())) {
            throw new ApiException("Your registration was rejected. Please contact the shop.", HttpStatus.FORBIDDEN);
        }
        if ("suspended".equals(user.getStatus())) {
            throw new ApiException("Your account has been suspended.", HttpStatus.FORBIDDEN);
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        UserPrincipal principal = new UserPrincipal(user);

        return AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(principal))
                .refreshToken(jwtService.generateRefreshToken(principal))
                .expiresIn(jwtService.getAccessTokenTtl())
                .user(userMapper.toDto(user))
                .requiresApproval(false)
                .build();
    }

    /* ═══════════════ ID HELPERS ═══════════════ */

    private String generateUniqueTenantId() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = randomId(8);
            if (tenantRepository.findById(candidate).isEmpty()) {
                return candidate;
            }
        }
        // Extreme fallback — should never happen
        throw new ApiException("Could not generate a unique shop ID. Please try again.", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private static String randomId(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ID_CHARS.charAt(RANDOM.nextInt(ID_CHARS.length())));
        }
        return sb.toString();
    }
}