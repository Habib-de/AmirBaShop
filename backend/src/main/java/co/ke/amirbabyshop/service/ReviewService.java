package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.domain.Review;
import co.ke.amirbabyshop.domain.ReviewVote;
import co.ke.amirbabyshop.dto.review.CreateReviewRequest;
import co.ke.amirbabyshop.dto.review.ReplyReviewRequest;
import co.ke.amirbabyshop.dto.review.ReviewDto;
import co.ke.amirbabyshop.mapper.ReviewMapper;
import co.ke.amirbabyshop.repository.ProductRepository;
import co.ke.amirbabyshop.repository.ReviewRepository;
import co.ke.amirbabyshop.repository.ReviewVoteRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewVoteRepository voteRepository;
    private final ProductRepository productRepository;
    private final ReviewMapper mapper;
    private final ObjectMapper objectMapper;

    /* ═══════════════ LIST ═══════════════ */

    @Transactional(readOnly = true)
    public List<ReviewDto> listForProduct(Long productId, boolean includeHidden) {
        List<Review> list = includeHidden
                ? reviewRepository.findByProductIdOrderByCreatedAtDesc(productId)
                : reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(productId, "published");
        return list.stream().map(mapper::toDto).toList();
    }

        @Transactional(readOnly = true)
    public List<ReviewDto> listForTenant(String tenantId, boolean includeHidden) {
        List<Review> list = includeHidden
                ? reviewRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                : reviewRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                        .filter(r -> "published".equals(r.getStatus()))
                        .toList();

        return list.stream().map(mapper::toDto).toList();
    }

    /* ═══════════════ CREATE ═══════════════ */

    @Transactional
    public ReviewDto create(String tenantId, CreateReviewRequest req) {
        if (req.getAuthorEmail() != null
                && reviewRepository.existsByProductIdAndAuthorEmailIgnoreCase(
                        req.getProductId(), req.getAuthorEmail())) {
            throw new ApiException("You've already reviewed this product", HttpStatus.CONFLICT);
        }

        Review r = Review.builder()
                .tenantId(tenantId)
                .productId(req.getProductId())
                .userId(req.getUserId())
                .authorName(req.getAuthorName() != null ? req.getAuthorName() : "Guest")
                .authorEmail(req.getAuthorEmail())
                .authorRole(req.getAuthorRole() != null ? req.getAuthorRole() : "customer")
                .rating(req.getRating())
                .title(req.getTitle())
                .comment(req.getComment())
                .imageUrl(req.getImageUrl())
                .photos(mapper.toJson(req.getPhotos()))
                .verified(req.getUserId() != null)
                .helpful(0)
                .notHelpful(0)
                .status("published")
                .replies("[]")
                .build();

        reviewRepository.save(r);
        recalcProductRating(req.getProductId());
        return mapper.toDto(r);
    }

    /* ═══════════════ VOTE ═══════════════ */

    @Transactional
    public ReviewDto vote(Long reviewId, Long userId, String guestToken, String vote) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        ReviewVote existing = null;
        if (userId != null) {
            existing = voteRepository.findByReviewIdAndUserId(reviewId, userId).orElse(null);
        } else if (guestToken != null && !guestToken.isBlank()) {
            existing = voteRepository.findByReviewIdAndGuestToken(reviewId, guestToken).orElse(null);
        } else {
            throw new ApiException("Either user or guestToken required", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        if (existing != null) {
            if (existing.getVote().equals(vote)) {
                /* Toggle off */
                if ("up".equals(vote))  review.setHelpful(Math.max(0, review.getHelpful() - 1));
                if ("down".equals(vote)) review.setNotHelpful(Math.max(0, review.getNotHelpful() - 1));
                voteRepository.delete(existing);
            } else {
                /* Change vote */
                if ("up".equals(vote)) {
                    review.setHelpful(review.getHelpful() + 1);
                    review.setNotHelpful(Math.max(0, review.getNotHelpful() - 1));
                } else {
                    review.setNotHelpful(review.getNotHelpful() + 1);
                    review.setHelpful(Math.max(0, review.getHelpful() - 1));
                }
                existing.setVote(vote);
                voteRepository.save(existing);
            }
        } else {
            ReviewVote v = ReviewVote.builder()
                    .reviewId(reviewId)
                    .userId(userId)
                    .guestToken(guestToken)
                    .vote(vote)
                    .build();
            voteRepository.save(v);
            if ("up".equals(vote))   review.setHelpful(review.getHelpful() + 1);
            if ("down".equals(vote)) review.setNotHelpful(review.getNotHelpful() + 1);
        }

        reviewRepository.save(review);
        return mapper.toDto(review);
    }

    /* ═══════════════ REPLY (staff) ═══════════════ */

    @Transactional
    public ReviewDto addReply(Long reviewId, String callerRole, ReplyReviewRequest req) {
        if (!"owner".equals(callerRole) && !"sales".equals(callerRole)) {
            throw new ForbiddenException("Only staff can reply to reviews");
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        List<Map<String, Object>> replies = parseReplies(review.getReplies());

        Map<String, Object> reply = Map.of(
                "id", "RR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                "text", req.getText().trim(),
                "author", req.getAuthor() != null ? req.getAuthor() : "Staff",
                "role", req.getRole() != null ? req.getRole() : "owner",
                "createdAt", Instant.now().toString()
        );
        replies.add(reply);

        review.setReplies(mapper.toJson(replies));
        reviewRepository.save(review);
        return mapper.toDto(review);
    }

    /* ═══════════════ UPDATE STATUS (staff) ═══════════════ */

    @Transactional
    public ReviewDto setStatus(Long reviewId, String callerRole, String status) {
        if (!"owner".equals(callerRole) && !"sales".equals(callerRole)) {
            throw new ForbiddenException("Only staff can moderate reviews");
        }
        if (!"published".equals(status) && !"hidden".equals(status)) {
            throw new ApiException("Status must be 'published' or 'hidden'", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setStatus(status);
        reviewRepository.save(review);
        recalcProductRating(review.getProductId());
        return mapper.toDto(review);
    }

    /* ═══════════════ DELETE ═══════════════ */

    @Transactional
    public void delete(Long reviewId, Long callerId, String callerRole, String callerEmail) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));

        boolean isOwnerOrSales = "owner".equals(callerRole) || "sales".equals(callerRole);
        boolean isAuthor = callerEmail != null
                && callerEmail.equalsIgnoreCase(review.getAuthorEmail());

        if (!isOwnerOrSales && !isAuthor) {
            throw new ForbiddenException("You can only delete your own reviews");
        }

        Long productId = review.getProductId();
        reviewRepository.delete(review);
        recalcProductRating(productId);
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private void recalcProductRating(Long productId) {
        List<Review> published = reviewRepository.findByProductIdAndStatusOrderByCreatedAtDesc(
                productId, "published");

        int count = published.size();
        BigDecimal avg;
        if (count == 0) {
            avg = BigDecimal.ZERO;
        } else {
            int sum = published.stream().mapToInt(Review::getRating).sum();
            avg = BigDecimal.valueOf((double) sum / count)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        Product product = productRepository.findById(productId).orElse(null);
        if (product != null) {
            product.setReviewCount(count);
            product.setRatingAvg(avg);
            productRepository.save(product);
        }
    }

    private List<Map<String, Object>> parseReplies(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            return parsed != null ? parsed : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}