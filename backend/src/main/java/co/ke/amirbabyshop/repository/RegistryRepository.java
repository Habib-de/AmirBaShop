package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Registry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistryRepository extends JpaRepository<Registry, String> {

    Optional<Registry> findBySlug(String slug);

    Optional<Registry> findByOwnerEmailIgnoreCase(String ownerEmail);

    boolean existsByOwnerEmailIgnoreCase(String ownerEmail);

    boolean existsBySlug(String slug);
}