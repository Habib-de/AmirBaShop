package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.config.MpesaConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MpesaService {

    /** Daraja uses Africa/Nairobi (EAT). Using UTC here silently fails validation. */
    private static final ZoneId DARAJA_ZONE = ZoneId.of("Africa/Nairobi");
    private static final DateTimeFormatter TS_FMT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(DARAJA_ZONE);

    private final MpesaConfig config;
    private final RestTemplate restTemplate = new RestTemplate();

    /* Cached token + expiry */
    private String cachedToken;
    private Instant cachedTokenExpiry = Instant.EPOCH;

    /* ═══════════════ OAUTH ═══════════════ */

    public synchronized String getAccessToken() {
        if (!config.isEnabled()) {
            throw new IllegalStateException("M-Pesa is disabled in config");
        }
        if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiry)) {
            return cachedToken;
        }

        String credentials = config.getConsumerKey() + ":" + config.getConsumerSecret();
        String encoded = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + encoded);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        String url = config.getBaseUrl()
                + "/oauth/v1/generate?grant_type=client_credentials";

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null) {
                throw new IllegalStateException("Daraja returned no access_token: " + body);
            }

            String token = (String) body.get("access_token");
            long expiresIn = parseLong(body.get("expires_in"), 3600L);
            cachedToken = token;
            cachedTokenExpiry = Instant.now().plusSeconds(Math.max(60, expiresIn - 300));

            log.info("[M-Pesa] New access token obtained (expires in {}s)", expiresIn);
            return token;

        } catch (HttpClientErrorException e) {
            log.error("[M-Pesa] OAuth failed: status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException(
                    "M-Pesa authentication failed — check your consumer key/secret. "
                    + "Safaricom said: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("[M-Pesa] OAuth error", e);
            throw new IllegalStateException("M-Pesa auth error: " + e.getMessage(), e);
        }
    }

    /* ═══════════════ STK PUSH ═══════════════ */

    /**
     * Send an STK push to the customer's phone.
     *
     * @param phone       MSISDN in any format — we sanitize to 2547XXXXXXXX / 2541XXXXXXXX
     * @param amount      Amount in KES (whole shillings — Daraja rejects decimals)
     * @param accountRef  Order ID (shows in the M-Pesa prompt as "Account")
     * @param description Short description (shows on prompt as well)
     * @return Daraja's response map (contains CheckoutRequestID, MerchantRequestID, ResponseCode)
     */
    public Map<String, Object> stkPush(String phone, BigDecimal amount,
                                        String accountRef, String description) {
        if (!config.isEnabled()) {
            throw new IllegalStateException("M-Pesa is disabled");
        }

        String msisdn = sanitizePhone(phone);
        if (msisdn == null) {
            throw new IllegalArgumentException(
                    "Invalid phone number. Use format 2547XXXXXXXX or 2541XXXXXXXX.");
        }

        long amountRounded = amount.setScale(0, RoundingMode.HALF_UP).longValue();
        if (amountRounded < 1) {
            throw new IllegalArgumentException("Amount must be at least KES 1");
        }
        if (amountRounded > 150_000) {
            throw new IllegalArgumentException(
                    "STK push cannot exceed KES 150,000 per request");
        }

        String token = getAccessToken();
        String timestamp = TS_FMT.format(Instant.now());
        String password = Base64.getEncoder().encodeToString(
                (config.getShortcode() + config.getPasskey() + timestamp)
                        .getBytes(StandardCharsets.UTF_8));

        Map<String, Object> body = new HashMap<>();
        body.put("BusinessShortCode", config.getShortcode());
        body.put("Password", password);
        body.put("Timestamp", timestamp);
        body.put("TransactionType", "CustomerPayBillOnline");
        body.put("Amount", amountRounded);
        body.put("PartyA", msisdn);
        body.put("PartyB", config.getShortcode());
        body.put("PhoneNumber", msisdn);
        body.put("CallBackURL", config.getCallbackUrl());
        body.put("AccountReference", accountRef);
        body.put("TransactionDesc", description);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + token);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        String url = config.getBaseUrl() + "/mpesa/stkpush/v1/processrequest";

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, Map.class);

            Map<String, Object> resp = response.getBody();
            log.info("[M-Pesa] STK push sent: phone={} amount={} ref={} → ResponseCode={} CheckoutRequestID={}",
                    msisdn, amountRounded, accountRef,
                    resp == null ? "null" : resp.get("ResponseCode"),
                    resp == null ? "null" : resp.get("CheckoutRequestID"));
            return resp;

        } catch (HttpClientErrorException e) {
            log.error("[M-Pesa] STK push failed: status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException(
                    "STK push failed. Safaricom said: " + e.getResponseBodyAsString(), e);
        }
    }

    /* ═══════════════ QUERY STATUS ═══════════════ */

    /**
     * Poll Daraja for the status of an STK push.
     * Useful if the callback is delayed or missed.
     */
    public Map<String, Object> queryStatus(String checkoutRequestId) {
        if (!config.isEnabled()) {
            throw new IllegalStateException("M-Pesa is disabled");
        }

        String token = getAccessToken();
        String timestamp = TS_FMT.format(Instant.now());
        String password = Base64.getEncoder().encodeToString(
                (config.getShortcode() + config.getPasskey() + timestamp)
                        .getBytes(StandardCharsets.UTF_8));

        Map<String, Object> body = new HashMap<>();
        body.put("BusinessShortCode", config.getShortcode());
        body.put("Password", password);
        body.put("Timestamp", timestamp);
        body.put("CheckoutRequestID", checkoutRequestId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + token);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        String url = config.getBaseUrl() + "/mpesa/stkpushquery/v1/query";

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, Map.class);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.error("[M-Pesa] queryStatus failed: status={} body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new IllegalStateException(
                    "Query failed: " + e.getResponseBodyAsString(), e);
        }
    }

    /* ═══════════════ PHONE SANITIZER ═══════════════ */

    /**
     * Convert any Kenyan phone format to Daraja's expected 2547XXXXXXXX / 2541XXXXXXXX.
     * Returns null if the result is not a plausible Kenyan MSISDN.
     *
     * Accepts:
     *   +254 700 123 456
     *   +254700123456
     *   254700123456
     *   0700123456
     *   0700 123 456
     *   700123456
     *   0110123456  (Safaricom 011 range — starts with 1, not 7)
     *   254110123456
     */
    public static String sanitizePhone(String raw) {
        if (raw == null) return null;
        String p = raw.replaceAll("[\\s\\-()]+", "").trim();
        if (p.isEmpty()) return null;

        if (p.startsWith("+254")) p = p.substring(4);
        else if (p.startsWith("254")) p = p.substring(3);
        else if (p.startsWith("0"))   p = p.substring(1);

        /* Now p should be 9 digits, starting with 7 or 1 */
        if (!p.matches("^[71]\\d{8}$")) return null;
        return "254" + p;
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private static long parseLong(Object o, long fallback) {
        if (o == null) return fallback;
        try { return Long.parseLong(String.valueOf(o)); }
        catch (NumberFormatException e) { return fallback; }
    }
}