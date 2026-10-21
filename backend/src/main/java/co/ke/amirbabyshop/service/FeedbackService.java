package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Feedback;
import co.ke.amirbabyshop.dto.feedback.CreateFeedbackRequest;
import co.ke.amirbabyshop.dto.feedback.FeedbackDto;
import co.ke.amirbabyshop.repository.FeedbackRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    @Transactional
    public FeedbackDto create(String tenantId, CreateFeedbackRequest req) {
        Feedback entry = Feedback.builder()
                .id("FB-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                .tenantId(tenantId)
                .userId(req.getUserId())
                .name(req.getName())
                .email(req.getEmail())
                .subject(req.getSubject())
                .message(req.getMessage())
                .sentBy(req.getSentBy() != null ? req.getSentBy() : "guest")
                .status("unread")
                .replies("[]")
                .build();
        feedbackRepository.save(entry);
        return toDto(entry);
    }

    @Transactional(readOnly = true)
    public List<FeedbackDto> listForTenant(String tenantId, String role) {
        requireStaff(role);
        return feedbackRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<FeedbackDto> listForCustomer(String email) {
        return feedbackRepository.findByEmailIgnoreCaseOrderByCreatedAtDesc(email)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public FeedbackDto updateStatus(String tenantId, String role, String id, String status) {
        requireStaff(role);
        Feedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));
        
        if (!fb.getTenantId().equals(tenantId)) {
            throw new ForbiddenException("Feedback does not belong to your shop");
        }
        fb.setStatus(status);
        feedbackRepository.save(fb);
        return toDto(fb);
    }

    @Transactional
    public FeedbackDto addReply(String tenantId, String role, String id, Map<String, String> body) {
        requireStaff(role);
        Feedback fb = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));
        
        List<Map<String, Object>> replies = new ArrayList<>();
        try {
            if (fb.getReplies() != null && !fb.getReplies().isBlank()) {
                replies = objectMapper.readValue(fb.getReplies(), new TypeReference<>() {});
            }
        } catch (Exception ignored) {}

        Map<String, Object> reply = new java.util.HashMap<>();
        reply.put("id", "R-" + UUID.randomUUID().toString().substring(0, 6));
        reply.put("text", body.get("text") != null ? body.get("text") : "");
        reply.put("author", body.get("author") != null ? body.get("author") : "Staff");
        reply.put("role", body.get("role") != null ? body.get("role") : "owner");
        reply.put("createdAt", Instant.now().toString());
        replies.add(reply);

        try {
            fb.setReplies(objectMapper.writeValueAsString(replies));
        } catch (Exception ignored) {}

        fb.setStatus("read"); // Auto-mark read when replying
        feedbackRepository.save(fb);
        if (fb.getUserId() != null) {
    notificationService.createForUser(
        fb.getUserId(),
        "system",
        "New reply to your message",
        "Check the reply on \"" + (fb.getSubject() != null ? fb.getSubject() : "your message") + "\".",
        "/contact"
    );
} else if (fb.getEmail() != null && !fb.getEmail().isBlank()) {
    notificationService.createForEmail(
        fb.getEmail(),
        "system",
        "New reply to your message",
        "Check the reply on \"" + (fb.getSubject() != null ? fb.getSubject() : "your message") + "\".",
        "/contact"
    );
}
        return toDto(fb);
    }

    private void requireStaff(String role) {
        if (!"owner".equals(role) && !"sales".equals(role)) {
            throw new ForbiddenException("Only staff can manage feedback");
        }
    }

    private FeedbackDto toDto(Feedback fb) {
        List<Map<String, Object>> parsedReplies = new ArrayList<>();
        try {
            if (fb.getReplies() != null) {
                parsedReplies = objectMapper.readValue(fb.getReplies(), new TypeReference<>() {});
            }
        } catch (Exception ignored) {}

        return FeedbackDto.builder()
                .id(fb.getId())
                .userId(fb.getUserId())
                .name(fb.getName())
                .email(fb.getEmail())
                .subject(fb.getSubject())
                .message(fb.getMessage())
                .sentBy(fb.getSentBy())
                .status(fb.getStatus())
                .replies(parsedReplies)
                .createdAt(fb.getCreatedAt())
                .updatedAt(fb.getUpdatedAt())
                .build();
    }
}