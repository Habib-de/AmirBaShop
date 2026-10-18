package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Tenant;
import co.ke.amirbabyshop.dto.tenant.TenantDto;
import co.ke.amirbabyshop.dto.tenant.UpdateTenantRequest;
import co.ke.amirbabyshop.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private static final List<String> VALID_CURRENCIES = List.of("KES", "USD", "EUR", "GBP", "TZS", "UGX");

    private final TenantRepository tenantRepository;

    /* ═══════════════ READ ═══════════════ */

    @Transactional(readOnly = true)
    public TenantDto getMyTenant(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new ResourceNotFoundException("No shop is associated with this account");
        }
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        return toDto(tenant);
    }

    /* ═══════════════ UPDATE (owner only) ═══════════════ */

    @Transactional
    public TenantDto updateMyTenant(String tenantId, String callerRole, UpdateTenantRequest req) {
        if (!"owner".equals(callerRole)) {
            throw new ForbiddenException("Only the shop owner can edit shop details");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));

        // Validate currency
        if (req.getCurrency() != null) {
            String code = req.getCurrency().trim().toUpperCase();
            if (!VALID_CURRENCIES.contains(code)) {
                throw new ApiException(
                        "Unsupported currency: " + code,
                        HttpStatus.UNPROCESSABLE_ENTITY);
            }
            tenant.setCurrency(code);
        }

        // Validate lat/lng ranges
        if (req.getLat() != null
                && (req.getLat().doubleValue() < -90 || req.getLat().doubleValue() > 90)) {
            throw new ApiException("Latitude must be between -90 and 90", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (req.getLng() != null
                && (req.getLng().doubleValue() < -180 || req.getLng().doubleValue() > 180)) {
            throw new ApiException("Longitude must be between -180 and 180", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Apply fields
        if (req.getName() != null && !req.getName().isBlank()) {
            tenant.setName(req.getName().trim());
        }
        if (req.getPhone() != null) {
            tenant.setPhone(req.getPhone().trim().isEmpty() ? null : req.getPhone().trim());
        }
        if (req.getEmail() != null) {
            tenant.setEmail(req.getEmail().trim().isEmpty() ? null : req.getEmail().trim());
        }
        if (req.getAddressStreet() != null) {
            tenant.setAddressStreet(req.getAddressStreet().trim());
        }
        if (req.getAddressCity() != null) {
            tenant.setAddressCity(req.getAddressCity().trim());
        }
        if (req.getAddressCountry() != null) {
            tenant.setAddressCountry(req.getAddressCountry().trim());
        }
        if (req.getLat() != null) {
            tenant.setLat(req.getLat());
        }
        if (req.getLng() != null) {
            tenant.setLng(req.getLng());
        }
        if (req.getLogoUrl() != null) {
            tenant.setLogoUrl(req.getLogoUrl().trim().isEmpty() ? null : req.getLogoUrl().trim());
        }
        if (req.getDescription() != null) {
            tenant.setDescription(req.getDescription().trim());
        }

        tenantRepository.save(tenant);
        return toDto(tenant);
    }

    /* ═══════════════ MAPPER ═══════════════ */

    private TenantDto toDto(Tenant t) {
        return TenantDto.builder()
                .id(t.getId())
                .name(t.getName())
                .slug(t.getSlug())
                .ownerEmail(t.getOwnerEmail())
                .logoUrl(t.getLogoUrl())
                .description(t.getDescription())
                .phone(t.getPhone())
                .email(t.getEmail())
                .addressStreet(t.getAddressStreet())
                .addressCity(t.getAddressCity())
                .addressCountry(t.getAddressCountry())
                .lat(t.getLat())
                .lng(t.getLng())
                .currency(t.getCurrency())
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}