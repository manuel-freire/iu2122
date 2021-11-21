package es.ucm.fdi.iu.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * An authorized user of the system.
 */
@Entity
@Data
@NoArgsConstructor
@NamedQueries({
        @NamedQuery(name="User.byUsername",
                query="SELECT u FROM User u "
                        + "WHERE u.username = :username AND u.enabled = 1"),
        @NamedQuery(name="User.hasUsername",
                query="SELECT COUNT(u) "
                        + "FROM User u "
                        + "WHERE u.username = :username")
})
public class User implements Transferable<User.Transfer> {

    public enum Role {
        USER,			// normal users cannot manage movies or users
        ADMIN,          // admin users *can* manage movies users in their realm
        ROOT,			// the root user can manage everything
    }

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gen")
    @SequenceGenerator(name = "gen", sequenceName = "gen")
	private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Realm realm;

    @Column(nullable = false, unique = true)
    private String username;
    @Column(nullable = false)
    private String password;

    // api access token
    private String token;

    private boolean enabled;
    private String roles; // split by ',' to separate roles

    @ManyToMany(mappedBy = "members")
    private List<Group> groups = new ArrayList<>();
    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "user_id")
    private List<Request> requests = new ArrayList<>();
    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "user_id")
    private List<Rating> ratings = new ArrayList<>();

    /**
     * Checks whether this user has a given role.
     * @param role to check
     * @return true iff this user has that role.
     */
    public boolean hasRole(Role role) {
        String roleName = role.name();
        return Arrays.asList(roles.split(",")).contains(roleName);
    }

    @Getter
    @AllArgsConstructor
    public static class Transfer {
        private long id;
        private String username;
        private String role;
        private String token;
        private List<Long> groups;
        private List<Long> requests;
        private List<Long> ratings;
    }

    public Transfer toTransfer() {
        return new Transfer(id, username, roles, token,
                groups.stream().map(Group::getId).collect(Collectors.toList()),
                requests.stream().map(Request::getId).collect(Collectors.toList()),
                ratings.stream().map(Rating::getId).collect(Collectors.toList()));
    }

    @Getter
    @AllArgsConstructor
    public static class TokenTransfer {
        private String token;
    }

    public TokenTransfer toTokenTransfer() {
        return new TokenTransfer(token);
    }
}

