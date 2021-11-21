package es.ucm.fdi.iu.model;

import lombok.*;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * An independent realm. Users, groups, movie-ratings and so on are per-realm.
 *
 * Note that IDs are global.
 */
@Entity
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Realm implements Transferable<Realm.Transfer> {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gen")
    @SequenceGenerator(name = "gen", sequenceName = "gen")
    @EqualsAndHashCode.Include
	private long id;

    private String name;

    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "realm_id")
    private List<User> users = new ArrayList<>();
    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "realm_id")
    private List<Group> groups = new ArrayList<>();
    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "realm_id")
    private List<Movie> movies = new ArrayList<>();
    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "realm_id")
    private List<Rating> ratings = new ArrayList<>();
    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "realm_id")
    private List<Request> requests = new ArrayList<>();

    @Getter
    @AllArgsConstructor
    public static class Transfer {
        private long id;
        private String name;
        private List<User.Transfer> users;
        private List<Group.Transfer> groups;
        private List<Movie.Transfer> movies;
        private List<Rating.Transfer> ratings;
        private List<Request.Transfer> requests;
    }

    @Override
    public Transfer toTransfer() {
        return new Transfer(id, name,
            users.stream().map(Transferable::toTransfer).collect(Collectors.toList()),
            groups.stream().map(Transferable::toTransfer).collect(Collectors.toList()),
            movies.stream().map(Transferable::toTransfer).collect(Collectors.toList()),
            ratings.stream().map(Transferable::toTransfer).collect(Collectors.toList()),
            requests.stream().map(Transferable::toTransfer).collect(Collectors.toList())
        );
    }
}
