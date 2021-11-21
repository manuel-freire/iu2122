package es.ucm.fdi.iu.model;

import lombok.*;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A label on a movie, authored by a user. Can optionally provide a rating.
 *
 * printers have a unique alias, a model, a location, an IP,
 * a print-queue with jobs, and a state.
 * the state can be printing (because queue not empty and not blocked), paused
 * (because queue empty and not blocked), out of paper, or out of ink
 * (the last two mean that it is blocked, and thus neither printing or paused)
 */
@Entity
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Rating implements Transferable<Rating.Transfer> {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gen")
    @SequenceGenerator(name = "gen", sequenceName = "gen")
    @EqualsAndHashCode.Include
    private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Realm realm;

    private Integer rating; // -1 for null
    private String labels;  // empty for null

    @ManyToOne
    private User user;
    @ManyToOne
    private Movie movie;

    @Getter
    @AllArgsConstructor
    public static class Transfer {
        private long id;
        private long user;
        private long movie;
        private int rating;
        private String labels;
    }

    @Override
    public Transfer toTransfer() {
        return new Transfer(
                id, user.getId(), movie.getId(),
                rating != null ? rating : -1,
                labels != null ? labels : "");
    }
}
