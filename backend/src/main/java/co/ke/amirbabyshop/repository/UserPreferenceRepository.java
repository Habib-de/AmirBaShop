package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
}