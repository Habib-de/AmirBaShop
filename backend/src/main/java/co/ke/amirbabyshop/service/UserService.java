package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Tenant;
import co.ke.amirbabyshop.domain.User;
import co.ke.amirbabyshop.dto.user.UserDto;
import co.ke.amirbabyshop.mapper.UserMapper;
import co.ke.amirbabyshop.repository.TenantRepository;
import co.ke.amirbabyshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    /* ═══════════════ HELPERS ═══════════════ */

    private UserDto enrichWithTenant(UserDto dto, String tenantId) {
        if (tenantId == null) return dto;
        tenantRepository.findById(tenantId)
                .map(Tenant::getName)
                .ifPresent(dto::setTenantName);
        return dto;
    }

    /* ═══════════════ READ ═══════════════ */

    @Transactional(readOnly = true)
    public UserDto getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return enrichWithTenant(userMapper.toDto(user), user.getTenantId());
    }

    /* ═══════════════ UPDATE PROFILE ═══════════════ */

    @Transactional
    public UserDto updateProfile(Long id, Map<String, String> patch) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (patch.containsKey("name")) {
            String name = patch.get("name");
            if (name == null || name.trim().length() < 2) {
                throw new ApiException("Name is too short", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            user.setName(name.trim());
        }
        if (patch.containsKey("phone")) {
            user.setPhone(patch.get("phone") != null ? patch.get("phone").trim() : null);
        }
        if (patch.containsKey("avatarUrl")) {
            user.setAvatarUrl(patch.get("avatarUrl"));
        }

        userRepository.save(user);
        return enrichWithTenant(userMapper.toDto(user), user.getTenantId());
    }

    /* ═══════════════ CHANGE PASSWORD ═══════════════ */

    @Transactional
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException("Current password is incorrect", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new ApiException("New password must be at least 6 characters", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ApiException("New password must be different", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /* ═══════════════ TEAM MANAGEMENT (owner only) ═══════════════ */

    @Transactional(readOnly = true)
    public List<UserDto> listByTenant(String tenantId) {
        String shopName = tenantRepository.findById(tenantId)
                .map(Tenant::getName)
                .orElse(null);

        return userRepository.findByTenantId(tenantId).stream()
                .map(u -> {
                    UserDto dto = userMapper.toDto(u);
                    dto.setTenantName(shopName);
                    return dto;
                })
                .toList();
    }

    @Transactional
    public UserDto approveUser(Long callerId, String callerRole, Long targetId) {
        requireOwner(callerRole);
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if ("owner".equals(target.getRole())) {
            throw new ApiException("Cannot approve another owner", HttpStatus.FORBIDDEN);
        }

        target.setStatus("active");
        target.setApprovedAt(Instant.now());
        target.setRejectedAt(null);
        userRepository.save(target);
        return enrichWithTenant(userMapper.toDto(target), target.getTenantId());
    }

    @Transactional
    public UserDto rejectUser(Long callerId, String callerRole, Long targetId) {
        requireOwner(callerRole);
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if ("owner".equals(target.getRole())) {
            throw new ApiException("Cannot reject an owner", HttpStatus.FORBIDDEN);
        }

        target.setStatus("rejected");
        target.setRejectedAt(Instant.now());
        userRepository.save(target);
        return enrichWithTenant(userMapper.toDto(target), target.getTenantId());
    }

    @Transactional
    public void deleteTeamMember(Long callerId, String callerRole, String callerTenantId, Long targetId) {
        requireOwner(callerRole);
        User target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (target.getId().equals(callerId)) {
            throw new ApiException("Cannot delete yourself", HttpStatus.FORBIDDEN);
        }
        if ("owner".equals(target.getRole())) {
            throw new ApiException("Cannot delete another owner", HttpStatus.FORBIDDEN);
        }
        if (!target.getTenantId().equals(callerTenantId)) {
            throw new ForbiddenException("User does not belong to your shop");
        }

        userRepository.delete(target);
    }

    private void requireOwner(String role) {
        if (!"owner".equals(role)) {
            throw new ForbiddenException("Only the shop owner can do this");
        }
    }
}