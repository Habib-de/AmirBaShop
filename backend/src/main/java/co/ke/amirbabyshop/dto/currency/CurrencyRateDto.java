package co.ke.amirbabyshop.dto.currency;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CurrencyRateDto {
    private String currencyCode;
    private Double kesPerUnit;
    private String symbol;
    private String label;
}