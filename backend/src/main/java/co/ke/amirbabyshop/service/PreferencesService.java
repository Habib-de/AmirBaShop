package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.domain.UserPreference;
import co.ke.amirbabyshop.dto.user.UpdatePreferenceRequest;
import co.ke.amirbabyshop.repository.UserPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PreferencesService {

    private final UserPreferenceRepository userPreferenceRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> get(Long userId) {
        UserPreference p = userPreferenceRepository.findById(userId).orElse(null);
        Map<String, Object> out = new HashMap<>();
        out.put("theme", p == null || p.getTheme() == null ? "light" : p.getTheme());
        out.put("language", p == null || p.getLanguage() == null ? "en" : p.getLanguage());
        out.put("notifications", p == null || p.getNotifications() == null ? "{}" : p.getNotifications());
        return out;
    }

    @Transactional
    public Map<String, Object> update(Long userId, UpdatePreferenceRequest req) {
        UserPreference pref = userPreferenceRepository.findById(userId)
                .orElseGet(() -> UserPreference.builder()
                        .userId(userId)
                        .currency("KES")
                        .theme("light")
                        .language("en")
                        .build());

        if (req.getTheme() != null && !req.getTheme().isBlank()) {
            String t = req.getTheme().trim().toLowerCase();
            if (!"light".equals(t) && !"dark".equals(t)) {
                throw new IllegalArgumentException("theme must be 'light' or 'dark'");
            }
            pref.setTheme(t);
        }
        if (req.getLanguage() != null && !req.getLanguage().isBlank()) {
            pref.setLanguage(req.getLanguage().trim().toLowerCase());
        }
        if (req.getNotifications() != null) {
            pref.setNotifications(req.getNotifications());
        }

        userPreferenceRepository.save(pref);

        Map<String, Object> out = new HashMap<>();
        out.put("theme", pref.getTheme());
        out.put("language", pref.getLanguage());
        out.put("notifications", pref.getNotifications() == null ? "{}" : pref.getNotifications());
        return out;
    }
}