package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.domain.PushSubscription;
import co.ke.amirbabyshop.dto.push.SubscribePushRequest;
import co.ke.amirbabyshop.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
// import java.security.spec.ECFieldFp;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
// import java.security.spec.EllipticCurve;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

@Service
@RequiredArgsConstructor
public class PushService {

    private final PushSubscriptionRepository pushRepository;

    @Value("${app.push.vapid.public:}")
    private String publicKey;

    @Value("${app.push.vapid.private:}")
    private String privateKey;

    @Value("${app.push.subject:mailto:hello@amirbabyshop.com}")
    private String subject;

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    public String getPublicKey() {
        return publicKey;
    }

    @Transactional
    public void subscribe(Long userId, SubscribePushRequest req, String userAgent) {
        if (req.getEndpoint() == null || req.getEndpoint().isBlank()) {
            throw new ApiException("Endpoint is required", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (req.getKeys() == null || req.getKeys().getP256dh() == null || req.getKeys().getAuth() == null) {
            throw new ApiException("Missing keys", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        PushSubscription existing = pushRepository.findByEndpoint(req.getEndpoint()).orElse(null);
        if (existing != null) {
            existing.setUserId(userId);
            existing.setP256dh(req.getKeys().getP256dh());
            existing.setAuth(req.getKeys().getAuth());
            existing.setUserAgent(truncate(userAgent, 300));
            pushRepository.save(existing);
            return;
        }

        PushSubscription sub = PushSubscription.builder()
                .userId(userId)
                .endpoint(req.getEndpoint())
                .p256dh(req.getKeys().getP256dh())
                .auth(req.getKeys().getAuth())
                .userAgent(truncate(userAgent, 300))
                .build();
        pushRepository.save(sub);
    }

    @Transactional
    public void unsubscribe(String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            pushRepository.deleteByEndpoint(endpoint);
        }
    }

    @Transactional(readOnly = true)
    public List<PushSubscription> forUser(Long userId) {
        return pushRepository.findByUserId(userId);
    }

    public void sendPushToUser(Long userId, String title, String body, String url) {
        List<PushSubscription> subs = pushRepository.findByUserId(userId);
        if (subs.isEmpty()) return;

        String jsonPayload = String.format("{\"title\":\"%s\",\"body\":\"%s\",\"url\":\"%s\"}",
                escape(title), escape(body), escape(url));

        for (PushSubscription sub : subs) {
            try {
                String jwt = generateVapidJwt(sub.getEndpoint());
                byte[] encrypted = encryptPayload(jsonPayload, sub.getP256dh(), sub.getAuth());

                HttpClient client = HttpClient.newHttpClient();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(sub.getEndpoint()))
                        .header("TTL", "86400")
                        .header("Content-Encoding", "aes128gcm")
                        .header("Content-Type", "application/octet-stream")
                        .header("Authorization", "vapid t=" + jwt + ", k=" + publicKey.trim())
                        .POST(HttpRequest.BodyPublishers.ofByteArray(encrypted))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                System.out.println("🔔 [PUSH SENT] Status: " + response.statusCode() + " | Title: " + title);

                if (response.statusCode() == 404 || response.statusCode() == 410) {
                    pushRepository.deleteByEndpoint(sub.getEndpoint());
                }
            } catch (Exception e) {
                System.err.println("[Push] Failed to send: " + e.getMessage());
            }
        }
    }

    private String generateVapidJwt(String endpoint) throws Exception {
        URI uri = URI.create(endpoint);
        String audience = uri.getScheme() + "://" + uri.getHost();
        long exp = (System.currentTimeMillis() / 1000) + 43200;

        String header = "{\"typ\":\"JWT\",\"alg\":\"ES256\"}";
        String payload = "{\"aud\":\"" + audience + "\",\"exp\":" + exp + ",\"sub\":\"" + subject.trim() + "\"}";

        String encodedHeader = base64Url(header.getBytes(StandardCharsets.UTF_8));
        String encodedPayload = base64Url(payload.getBytes(StandardCharsets.UTF_8));
        String signingInput = encodedHeader + "." + encodedPayload;

        String cleanKey = privateKey.replaceAll("\\s+", "").trim();
        BigInteger s = new BigInteger(1, Base64.getUrlDecoder().decode(cleanKey));

        org.bouncycastle.jce.spec.ECNamedCurveParameterSpec spec =
                org.bouncycastle.jce.ECNamedCurveTable.getParameterSpec("P-256");
        org.bouncycastle.jce.spec.ECPrivateKeySpec privateKeySpec =
                new org.bouncycastle.jce.spec.ECPrivateKeySpec(s, spec);

        KeyFactory keyFactory = KeyFactory.getInstance("EC", "BC");
        PrivateKey key = keyFactory.generatePrivate(privateKeySpec);

        Signature signature = Signature.getInstance("SHA256withECDSA", "BC");
        signature.initSign(key);
        signature.update(signingInput.getBytes(StandardCharsets.UTF_8));
        byte[] sigBytes = signature.sign();

        return signingInput + "." + base64Url(sigBytes);
    }

    private byte[] encryptPayload(String payload, String p256dh, String auth) throws Exception {
        byte[] userPublicKeyBytes = Base64.getUrlDecoder().decode(p256dh);
        byte[] userAuth = Base64.getUrlDecoder().decode(auth);

        // 1. Generate ephemeral key pair
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EC", "BC");
        keyGen.initialize(new org.bouncycastle.jce.spec.ECNamedCurveGenParameterSpec("P-256"));
        KeyPair ephemeral = keyGen.generateKeyPair();

        // 2. Decode user's public key manually (P-256 point)
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(userPublicKeyBytes, 1, 33));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(userPublicKeyBytes, 33, 65));
        ECPoint userPoint = new ECPoint(x, y);

        // Get P-256 curve from standard Java
        KeyPair stdP256 = KeyPairGenerator.getInstance("EC").generateKeyPair();
        java.security.spec.ECParameterSpec stdSpec =
                ((java.security.interfaces.ECPublicKey) stdP256.getPublic()).getParams();
        
        PublicKey userPubKey = KeyFactory.getInstance("EC").generatePublic(
                new ECPublicKeySpec(userPoint, stdSpec));

        // 3. ECDH shared secret
        KeyAgreement keyAgreement = KeyAgreement.getInstance("ECDH", "BC");
        keyAgreement.init(ephemeral.getPrivate());
        keyAgreement.doPhase(userPubKey, true);
        byte[] sharedSecret = keyAgreement.generateSecret();

        // 4. HKDF
        byte[] prk = hkdfExtract(userAuth, sharedSecret);
        byte[] cek = hkdfExpand(prk, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.UTF_8), 16);
        byte[] nonce = hkdfExpand(prk, "Content-Encoding: nonce\0".getBytes(StandardCharsets.UTF_8), 12);

        // 5. Encrypt with AES-GCM
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding", "BC");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));

        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);
        byte[] cipherText = cipher.doFinal(payloadBytes);

        // 6. Build final body (header + ciphertext) with correct 32-byte padding
        java.security.spec.ECPoint ephemPoint = ((java.security.interfaces.ECPublicKey) ephemeral.getPublic()).getW();
        byte[] ephemeralPubBytes = new byte[65];
        ephemeralPubBytes[0] = 0x04;

        // Pad X to 32 bytes (handles case where toByteArray returns 31 or 33 bytes)
        byte[] xBytes = ephemPoint.getAffineX().toByteArray();
        int xLen = Math.min(32, xBytes.length);
        int xStart = xBytes.length > 32 ? 1 : 0;
        System.arraycopy(xBytes, xStart, ephemeralPubBytes, 1 + (32 - xLen), xLen);

        // Pad Y to 32 bytes
        byte[] yBytes = ephemPoint.getAffineY().toByteArray();
        int yLen = Math.min(32, yBytes.length);
        int yStart = yBytes.length > 32 ? 1 : 0;
        System.arraycopy(yBytes, yStart, ephemeralPubBytes, 33 + (32 - yLen), yLen);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(ephemeralPubBytes);
        out.write(ByteBuffer.allocate(4).putInt(4096).array());
        out.write((byte) payloadBytes.length);
        out.write(cipherText);

        return out.toByteArray();
    }

    private byte[] hkdfExtract(byte[] salt, byte[] ikm) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256", "BC");
        mac.init(new SecretKeySpec(salt, "HmacSHA256"));
        return mac.doFinal(ikm);
    }

    private byte[] hkdfExpand(byte[] prk, byte[] info, int length) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256", "BC");
        mac.init(new SecretKeySpec(prk, "HmacSHA256"));
        mac.update(info);
        mac.update((byte) 0x01);
        byte[] hash = mac.doFinal();
        byte[] result = new byte[length];
        System.arraycopy(hash, 0, result, 0, length);
        return result;
    }

    private static String base64Url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"");
    }
}