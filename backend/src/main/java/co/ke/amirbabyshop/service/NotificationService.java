package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Notification;
import co.ke.amirbabyshop.domain.User;
import co.ke.amirbabyshop.dto.notification.NotificationDto;
import co.ke.amirbabyshop.repository.NotificationRepository;
import co.ke.amirbabyshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<NotificationDto> listMine(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public NotificationDto markRead(Long userId, String id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!n.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }
        n.setIsRead(true);
        notificationRepository.save(n);
        return toDto(n);
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).forEach(n -> {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void delete(Long userId, String id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!n.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notificationRepository.delete(n);
    }

    @Transactional
    public void clearAll(Long userId) {
        notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .forEach(notificationRepository::delete);
    }

    /* ═══════════════════════════════════════════════
       INTERNAL — emit notifications from other services
       ═══════════════════════════════════════════════ */

    @Transactional
    public void createForUser(Long userId, String type, String title, String body, String link) {
        if (userId == null) return;
        Notification n = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .isRead(false)
                .build();
        notificationRepository.save(n);
    }

    @Transactional
    public void createForEmail(String email, String type, String title, String body, String link) {
        if (email == null || email.isBlank()) return;
        Optional<User> user = userRepository.findByEmailIgnoreCase(email);
        if (user.isPresent()) {
            createForUser(user.get().getId(), type, title, body, link);
        }
        // Guests with no account: skip for now (schema supports user_email but no userId)
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .link(n.getLink())
                .read(Boolean.TRUE.equals(n.getIsRead()))
                .createdAt(n.getCreatedAt())
                .build();
    }
}