package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.ReturnRequest;
import co.ke.amirbabyshop.dto.returnrequest.CreateReturnRequest;
import co.ke.amirbabyshop.dto.returnrequest.ReturnDto;
import co.ke.amirbabyshop.mapper.ReturnMapper;
import co.ke.amirbabyshop.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReturnService {

    private final ReturnRequestRepository returnRepository;
    private final ReturnMapper mapper;

    @Transactional
    public ReturnDto create(String tenantId, CreateReturnRequest req) {
        BigDecimal refundAmount = BigDecimal.ZERO;
        for (Map<String, Object> item : req.getItems()) {
            BigDecimal price = new BigDecimal(String.valueOf(item.getOrDefault("price", 0)));
            int qty = Integer.parseInt(String.valueOf(item.getOrDefault("qty", 1)));
            refundAmount = refundAmount.add(price.multiply(BigDecimal.valueOf(qty)));
        }

        ReturnRequest entry = ReturnRequest.builder()
                .id("RT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .tenantId(tenantId)
                .orderId(req.getOrderId())
                .userId(req.getUserId())
                .customerName(req.getCustomerName() != null ? req.getCustomerName() : "Guest")
                .customerEmail(req.getCustomerEmail())
                .reason(req.getReason())
                .note(req.getNote())
                .status("pending")
                .refundAmount(refundAmount)
                .items(mapper.toJson(req.getItems()))
                .build();

        returnRepository.save(entry);
        return mapper.toDto(entry);
    }

    @Transactional(readOnly = true)
    public List<ReturnDto> listForTenant(String tenantId, String role) {
        requireStaff(role);
        return returnRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ReturnDto> listForCustomer(String email) {
        return returnRepository.findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(email)
                .stream().map(mapper::toDto).toList();
    }

    @Transactional
    public ReturnDto updateStatus(String tenantId, String role, String id, String status, String rejectionReason) {
        requireStaff(role);
        ReturnRequest ret = returnRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Return not found"));
        
        if (!ret.getTenantId().equals(tenantId)) {
            throw new ForbiddenException("Return does not belong to your shop");
        }

        if (!List.of("pending", "approved", "rejected", "completed").contains(status)) {
            throw new ApiException("Invalid status", HttpStatus.BAD_REQUEST);
        }

        ret.setStatus(status);
        if ("rejected".equals(status)) {
            ret.setRejectionReason(rejectionReason != null ? rejectionReason : "No reason provided");
        }
        
        returnRepository.save(ret);
        return mapper.toDto(ret);
    }

    private void requireStaff(String role) {
        if (!"owner".equals(role) && !"sales".equals(role)) {
            throw new ForbiddenException("Only staff can manage returns");
        }
    }
}