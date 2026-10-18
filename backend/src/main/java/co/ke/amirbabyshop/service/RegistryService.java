package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Registry;
import co.ke.amirbabyshop.dto.registry.AddRegistryItemRequest;
import co.ke.amirbabyshop.dto.registry.CreateRegistryRequest;
import co.ke.amirbabyshop.dto.registry.GiftRegistryItemRequest;
import co.ke.amirbabyshop.dto.registry.RegistryDto;
import co.ke.amirbabyshop.dto.registry.UpdateRegistryRequest;
import co.ke.amirbabyshop.mapper.RegistryMapper;
import co.ke.amirbabyshop.repository.RegistryRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistryService {

    private final RegistryRepository registryRepository;
    private final RegistryMapper mapper;
    private final ObjectMapper objectMapper;

    /* ═══════════════ CREATE ═══════════════ */

    @Transactional
    public RegistryDto create(CreateRegistryRequest req) {
        if (registryRepository.existsByOwnerEmailIgnoreCase(req.getOwnerEmail())) {
            throw new ApiException("You already have a registry", HttpStatus.CONFLICT);
        }

        String slug = generateUniqueSlug(req.getBabyName());
        String id = generateRegistryId();

        Registry registry = Registry.builder()
                .id(id)
                .slug(slug)
                .ownerUserId(req.getOwnerUserId())
                .ownerEmail(req.getOwnerEmail().toLowerCase())
                .ownerName(req.getOwnerName())
                .babyName(req.getBabyName().trim())
                .dueDate(req.getDueDate())
                .theme(req.getTheme())
                .message(req.getMessage())
                .coverImageUrl(req.getCoverImageUrl())
                .items("[]")
                .gifts("[]")
                .build();

        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    /* ═══════════════ UPDATE ═══════════════ */

    @Transactional
    public RegistryDto update(String id, String callerEmail, UpdateRegistryRequest req) {
        Registry registry = loadAndAuthorize(id, callerEmail);

        if (req.getBabyName() != null) registry.setBabyName(req.getBabyName().trim());
        if (req.getDueDate() != null) registry.setDueDate(req.getDueDate());
        if (req.getTheme() != null) registry.setTheme(req.getTheme());
        if (req.getMessage() != null) registry.setMessage(req.getMessage());
        if (req.getCoverImageUrl() != null) registry.setCoverImageUrl(req.getCoverImageUrl());

        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    /* ═══════════════ DELETE ═══════════════ */

    @Transactional
    public void delete(String id, String callerEmail) {
        Registry registry = loadAndAuthorize(id, callerEmail);
        registryRepository.delete(registry);
    }

    /* ═══════════════ READ ═══════════════ */

    @Transactional(readOnly = true)
    public RegistryDto getMine(String ownerEmail) {
        Registry registry = registryRepository.findByOwnerEmailIgnoreCase(ownerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No registry found for this account"));
        return mapper.toDto(registry);
    }

    @Transactional(readOnly = true)
    public RegistryDto getBySlug(String slug) {
        Registry registry = registryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Registry not found"));
        return mapper.toDto(registry);
    }

    @Transactional(readOnly = true)
    public RegistryDto getById(String id) {
        return registryRepository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Registry not found"));
    }

    /* ═══════════════ ITEMS ═══════════════ */

    @Transactional
    public RegistryDto addItem(String id, String callerEmail, AddRegistryItemRequest req) {
        Registry registry = loadAndAuthorize(id, callerEmail);
        List<Map<String, Object>> items = parseJsonList(registry.getItems());

        boolean dup = items.stream()
                .anyMatch(m -> String.valueOf(m.get("productId")).equals(String.valueOf(req.getProductId())));
        if (dup) {
            throw new ApiException("Product already in your registry", HttpStatus.CONFLICT);
        }

        Map<String, Object> newItem = new java.util.LinkedHashMap<>();
        newItem.put("id", "RI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        newItem.put("productId", req.getProductId());
        newItem.put("name", req.getName().trim());
        newItem.put("image", req.getImage() != null ? req.getImage() : "");
        newItem.put("price", req.getPrice());
        newItem.put("category", req.getCategory());
        newItem.put("priority", req.getPriority() != null ? req.getPriority() : "medium");
        newItem.put("note", req.getNote() != null ? req.getNote() : "");
        newItem.put("addedAt", Instant.now().toString());

        items.add(newItem);
        registry.setItems(mapper.toJson(items));
        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    @Transactional
    public RegistryDto removeItem(String id, String callerEmail, String itemId) {
        Registry registry = loadAndAuthorize(id, callerEmail);
        List<Map<String, Object>> items = parseJsonList(registry.getItems());
        items.removeIf(m -> itemId.equals(m.get("id")));
        registry.setItems(mapper.toJson(items));
        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    @Transactional
    public RegistryDto updateItemPriority(String id, String callerEmail, String itemId, String priority) {
        if (!"low".equals(priority) && !"medium".equals(priority) && !"high".equals(priority)) {
            throw new ApiException("Priority must be low, medium, or high", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        Registry registry = loadAndAuthorize(id, callerEmail);
        List<Map<String, Object>> items = parseJsonList(registry.getItems());
        for (Map<String, Object> item : items) {
            if (itemId.equals(item.get("id"))) {
                item.put("priority", priority);
                break;
            }
        }
        registry.setItems(mapper.toJson(items));
        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    /* ═══════════════ GIFTS (public) ═══════════════ */

    @Transactional
    public RegistryDto markGifted(String id, String itemId, GiftRegistryItemRequest req) {
        Registry registry = registryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registry not found"));

        List<Map<String, Object>> items = parseJsonList(registry.getItems());
        Map<String, Object> targetItem = items.stream()
                .filter(m -> itemId.equals(m.get("id")))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Item not found"));

        List<Map<String, Object>> gifts = parseJsonList(registry.getGifts());
        boolean already = gifts.stream().anyMatch(g -> itemId.equals(g.get("itemId")));
        if (already) {
            throw new ApiException("Someone already claimed this item", HttpStatus.CONFLICT);
        }

        Map<String, Object> gift = new java.util.LinkedHashMap<>();
        gift.put("id", "GF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        gift.put("itemId", itemId);
        gift.put("itemName", targetItem.get("name"));
        gift.put("giverName", req.getGiverName().trim());
        gift.put("giverEmail", req.getGiverEmail() != null ? req.getGiverEmail().trim().toLowerCase() : "");
        gift.put("message", req.getMessage() != null ? req.getMessage() : "");
        gift.put("qty", req.getQty() != null ? req.getQty() : 1);
        gift.put("giftedAt", Instant.now().toString());
        gift.put("thanked", false);

        gifts.add(gift);
        registry.setGifts(mapper.toJson(gifts));
        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    @Transactional
    public RegistryDto unmarkGifted(String id, String callerEmail, String giftId) {
        Registry registry = loadAndAuthorize(id, callerEmail);
        List<Map<String, Object>> gifts = parseJsonList(registry.getGifts());
        gifts.removeIf(g -> giftId.equals(g.get("id")));
        registry.setGifts(mapper.toJson(gifts));
        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    @Transactional
    public RegistryDto markThanked(String id, String callerEmail, String giftId, boolean thanked) {
        Registry registry = loadAndAuthorize(id, callerEmail);
        List<Map<String, Object>> gifts = parseJsonList(registry.getGifts());
        for (Map<String, Object> gift : gifts) {
            if (giftId.equals(gift.get("id"))) {
                gift.put("thanked", thanked);
                gift.put("thankedAt", thanked ? Instant.now().toString() : null);
                break;
            }
        }
        registry.setGifts(mapper.toJson(gifts));
        registryRepository.save(registry);
        return mapper.toDto(registry);
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private Registry loadAndAuthorize(String id, String callerEmail) {
        Registry registry = registryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registry not found"));
        if (callerEmail == null || !callerEmail.equalsIgnoreCase(registry.getOwnerEmail())) {
            throw new ForbiddenException("You can only manage your own registry");
        }
        return registry;
    }

    private String generateUniqueSlug(String babyName) {
        String base = babyName.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        if (base.length() > 20) base = base.substring(0, 20);
        if (base.isEmpty()) base = "baby";

        for (int i = 0; i < 10; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 4);
            String candidate = base + "-" + suffix;
            if (!registryRepository.existsBySlug(candidate)) return candidate;
        }
        throw new ApiException("Could not generate unique slug", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private String generateRegistryId() {
        return "RG-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private List<Map<String, Object>> parseJsonList(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            return parsed != null ? parsed : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}