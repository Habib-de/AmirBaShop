package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.ReviewVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReviewVoteRepository extends JpaRepository<ReviewVote, Long> {

    Optional<ReviewVote> findByReviewIdAndUserId(Long reviewId, Long userId);

    Optional<ReviewVote> findByReviewIdAndGuestToken(Long reviewId, String guestToken);
}