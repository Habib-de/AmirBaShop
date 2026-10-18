package co.ke.amirbabyshop.security;

import co.ke.amirbabyshop.domain.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    private final Long id;
    private final String tenantId;
     private final String name;
    private final String email;
    private final String password;
    private final String role;
    private final String status;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.tenantId = user.getTenantId();
        this.name = user.getName(); 
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.role = user.getRole();
        this.status = user.getStatus();
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase()));
    }

    @Override public String getUsername() { return email; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return !"suspended".equals(status); }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return "active".equals(status); }
}