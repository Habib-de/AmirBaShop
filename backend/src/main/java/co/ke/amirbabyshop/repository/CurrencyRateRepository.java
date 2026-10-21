package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.CurrencyRate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurrencyRateRepository extends JpaRepository<CurrencyRate, String> {
}