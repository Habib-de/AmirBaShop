package co.ke.amirbabyshop.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.payments.mpesa")
public class MpesaConfig {

    private boolean enabled;
    private String env;              // 'sandbox' | 'production'
    private String consumerKey;
    private String consumerSecret;
    private String shortcode;
    private String passkey;
    private String callbackUrl;

    /** Daraja base URL — sandbox vs production. */
    public String getBaseUrl() {
        return "production".equalsIgnoreCase(env)
                ? "https://api.safaricom.co.ke"
                : "https://sandbox.safaricom.co.ke";
    }

    @jakarta.annotation.PostConstruct
void logConfig() {
    System.out.println("🔧 MpesaConfig loaded: enabled=" + enabled
            + ", env=" + env
            + ", shortcode=" + shortcode
            + ", consumerKey=" + (consumerKey == null || consumerKey.isEmpty()
                    ? "MISSING" : "SET")
            + ", consumerSecret=" + (consumerSecret == null || consumerSecret.isEmpty()
                    ? "MISSING" : "SET")
            + ", passkey=" + (passkey == null || passkey.isEmpty() ? "MISSING" : "SET")
            + ", callbackUrl=" + callbackUrl);
}

}