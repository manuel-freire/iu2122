package es.ucm.fdi.iu.model;

import lombok.*;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A group of movie-raters.
 *
 * A single user may be in multiple groups. Minimum group size is 1: the owner.
 */
@Entity(name = "cgroup")
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Group implements Transferable<Group.Transfer> {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gen")
    @SequenceGenerator(name = "gen", sequenceName = "gen")
    @EqualsAndHashCode.Include
	private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Realm realm;

    private String name;

    @ManyToOne
    private User owner;

    @ManyToMany()
    private List<User> members = new ArrayList<>();

    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "group_id")
    private List<Request> requests = new ArrayList<>();

    @Getter
    @AllArgsConstructor
    public static class Transfer {
        private long id;
        private String name;
        private long owner;
        private List<Long> members;
        private List<Long> requests;
    }

    @Override
    public Transfer toTransfer() {
        return new Transfer(id, name, owner.getId(),
                members.stream().map(User::getId).collect(Collectors.toList()),
                requests.stream().map(Request::getId).collect(Collectors.toList()));
    }
}
