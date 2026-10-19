package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.ReturnRequest;
import co.ke.amirbabyshop.dto.returnrequest.ReturnDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class ReturnMapper {

    @Autowired
    private ObjectMapper objectMapper;

    public ReturnDto toDto(ReturnRequest r) {
        if (r == null) return null;
        return ReturnDto.builder()
                .id(r.getId())
                .orderId(r.getOrderId())
                .userId(r.getUserId())
                .customerName(r.getCustomerName())
                .customerEmail(r.getCustomerEmail())
                .reason(r.getReason())
                .note(r.getNote())
                .status(r.getStatus())
                .rejectionReason(r.getRejectionReason())
                .refundAmount(r.getRefundAmount())
                .items(parseList(r.getItems()))
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    public String toJson(Object obj) {
        if (obj == null) return "[]";
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    private List<Map<String, Object>> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() {}); }
        catch (Exception e) { return List.of(); }
    }
}