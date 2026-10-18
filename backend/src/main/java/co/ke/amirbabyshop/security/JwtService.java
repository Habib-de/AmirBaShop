package co.ke.amirbabyshop.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Slf4j
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long accessTokenTtl;
    private final long refreshTokenTtl;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl}") long accessTokenTtl,
            @Value("${app.jwt.refresh-token-ttl}") long refreshTokenTtl
    ) {
        // Accept either base64 or plain-text secret. 32+ chars required.
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
            if (keyBytes.length < 32) throw new IllegalArgumentException();
        } catch (Exception e) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenTtl = accessTokenTtl;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    /* ─── Generate ─── */

    public String generateAccessToken(UserPrincipal principal) {
        return buildToken(principal, accessTokenTtl, "access");
    }

    public String generateRefreshToken(UserPrincipal principal) {
        return buildToken(principal, refreshTokenTtl, "refresh");
    }

    private String buildToken(UserPrincipal principal, long ttlMs, String type) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + ttlMs);

        return Jwts.builder()
                .subject(principal.getUsername())
                .claims(Map.of(
                        "uid", principal.getId(),
                        "role", principal.getRole(),
                        "tenant", principal.getTenantId() != null ? principal.getTenantId() : "",
                        "type", type
                ))
                .issuedAt(now)
                .expiration(exp)
                .signWith(signingKey)
                .compact();
    }

    /* ─── Parse ─── */

    public String extractUsername(String token) {
        return parse(token).getSubject();
    }

    public String extractTokenType(String token) {
        return parse(token).get("type", String.class);
    }

    public boolean isTokenValid(String token, UserPrincipal principal) {
        try {
            Claims claims = parse(token);
            return principal.getUsername().equals(claims.getSubject())
                    && claims.getExpiration().after(new Date());
        } catch (Exception e) {
            log.warn("Invalid token: {}", e.getMessage());
            return false;
        }
    }

    private Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessTokenTtl() { return accessTokenTtl; }
}