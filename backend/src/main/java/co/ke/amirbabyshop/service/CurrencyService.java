package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.CurrencyRate;
import co.ke.amirbabyshop.domain.UserPreference;
import co.ke.amirbabyshop.dto.currency.CurrencyRateDto;
import co.ke.amirbabyshop.repository.CurrencyRateRepository;
import co.ke.amirbabyshop.repository.UserPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CurrencyService {

    private final CurrencyRateRepository currencyRateRepository;
    private final UserPreferenceRepository userPreferenceRepository;

    private static final String DEFAULT_CURRENCY = "KES";

    @Transactional(readOnly = true)
    public Map<String, CurrencyRateDto> getRates() {
        List<CurrencyRate> rows = currencyRateRepository.findAll();
        Map<String, CurrencyRateDto> out = new LinkedHashMap<>();
        for (CurrencyRate r : rows) {
            out.put(r.getCurrencyCode(), CurrencyRateDto.builder()
                    .currencyCode(r.getCurrencyCode())
                    .kesPerUnit(r.getKesPerUnit() != null ? r.getKesPerUnit().doubleValue() : 1.0)
                    .symbol(r.getSymbol())
                    .label(r.getLabel())
                    .build());
        }
        return out;
    }

    @Transactional(readOnly = true)
    public String getPreferred(Long userId) {
        return userPreferenceRepository.findById(userId)
                .map(UserPreference::getCurrency)
                .filter(c -> c != null && !c.isBlank())
                .orElse(DEFAULT_CURRENCY);
    }

    @Transactional
    public String setPreferred(Long userId, String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Currency code is required");
        }
        String normalized = code.trim().toUpperCase();

        CurrencyRate rate = currencyRateRepository.findById(normalized)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Unsupported currency: " + normalized));

        UserPreference pref = userPreferenceRepository.findById(userId)
                .orElseGet(() -> UserPreference.builder()
                        .userId(userId)
                        .theme("light")
                        .language("en")
                        .build());

        pref.setCurrency(rate.getCurrencyCode());
        userPreferenceRepository.save(pref);
        return rate.getCurrencyCode();
    }

    /** Staff-only: update the KES-per-unit rate (and optional symbol/label). */
    @Transactional
    public CurrencyRateDto updateRate(String code, Double kesPerUnit, String symbol, String label) {
        if (kesPerUnit == null || kesPerUnit <= 0) {
            throw new IllegalArgumentException("kesPerUnit must be greater than 0");
        }
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Currency code is required");
        }
        String normalized = code.trim().toUpperCase();

        CurrencyRate rate = currencyRateRepository.findById(normalized)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Currency not found: " + normalized));

        rate.setKesPerUnit(java.math.BigDecimal.valueOf(kesPerUnit));
        if (symbol != null && !symbol.isBlank()) rate.setSymbol(symbol);
        if (label  != null && !label.isBlank())  rate.setLabel(label);

        currencyRateRepository.save(rate);

        return CurrencyRateDto.builder()
                .currencyCode(rate.getCurrencyCode())
                .kesPerUnit(rate.getKesPerUnit().doubleValue())
                .symbol(rate.getSymbol())
                .label(rate.getLabel())
                .build();
    }

    /** Staff-only: create a new currency. */
    @Transactional
    public CurrencyRateDto createRate(String code, Double kesPerUnit, String symbol, String label) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Currency code is required");
        }
        if (kesPerUnit == null || kesPerUnit <= 0) {
            throw new IllegalArgumentException("kesPerUnit must be greater than 0");
        }
        String normalized = code.trim().toUpperCase();
        if (normalized.length() != 3) {
            throw new IllegalArgumentException("Currency code must be 3 letters (e.g. USD, EUR)");
        }
        if ("KES".equals(normalized) && kesPerUnit != 1.0) {
            throw new IllegalArgumentException("KES rate must be 1 (base currency)");
        }
        if (currencyRateRepository.existsById(normalized)) {
            throw new IllegalArgumentException("Currency already exists: " + normalized);
        }

        CurrencyRate rate = CurrencyRate.builder()
                .currencyCode(normalized)
                .kesPerUnit(java.math.BigDecimal.valueOf(kesPerUnit))
                .symbol(symbol != null && !symbol.isBlank() ? symbol : normalized)
                .label(label != null && !label.isBlank() ? label : normalized)
                .build();

        currencyRateRepository.save(rate);

        return CurrencyRateDto.builder()
                .currencyCode(rate.getCurrencyCode())
                .kesPerUnit(rate.getKesPerUnit().doubleValue())
                .symbol(rate.getSymbol())
                .label(rate.getLabel())
                .build();
    }
}