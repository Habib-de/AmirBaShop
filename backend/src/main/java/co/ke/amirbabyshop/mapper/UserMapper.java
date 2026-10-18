package co.ke.amirbabyshop.mapper;

import co.ke.amirbabyshop.domain.User;
import co.ke.amirbabyshop.dto.user.UserDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "tenantName", ignore = true)   // ← ADD
    UserDto toDto(User user);
}