package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.domain.Wishlist;
import co.ke.amirbabyshop.dto.wishlist.WishlistItemDto;
import co.ke.amirbabyshop.repository.ProductRepository;
import co.ke.amirbabyshop.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<WishlistItemDto> listMine(Long userId) {
        List<Wishlist> rows = wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return rows.stream().map(w -> {
            Product p = productRepository.findById(w.getProductId()).orElse(null);
            if (p == null) return null;
            return WishlistItemDto.builder()
                    .productId(p.getId())
                    .name(p.getName())
                    .imageUrl(p.getImageUrl())
                    .price(p.getPrice())
                    .originalPrice(p.getOriginalPrice())
                    .badge(p.getBadge())
                    .totalStock(p.getTotalStock())
                    .categoryId(p.getCategoryId())
                    .addedAt(w.getCreatedAt())
                    .build();
        }).filter(dto -> dto != null).toList();
    }

    @Transactional
    public void add(Long userId, Long productId) {
        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)) {
            return; // idempotent — already there
        }
        // Validate product exists
        productRepository.findById(productId)
                .orElseThrow(() -> new co.ke.amirbabyshop.common.exception.ResourceNotFoundException(
                        "Product not found: " + productId));

        Wishlist w = Wishlist.builder()
                .userId(userId)
                .productId(productId)
                .build();
        wishlistRepository.save(w);
    }

    @Transactional
    public void remove(Long userId, Long productId) {
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
    }

    @Transactional
    public void clear(Long userId) {
        wishlistRepository.deleteByUserId(userId);
    }
}