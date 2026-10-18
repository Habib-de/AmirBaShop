package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByTenantId(String tenantId);

    List<User> findByTenantIdAndStatus(String tenantId, String status);
}