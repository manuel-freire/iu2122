package es.ucm.fdi.iu.model;

import javax.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A movie. It can be edited by admins, and rated, and so on and so forth.
 */
@Entity
@Data
@NoArgsConstructor
public class Movie implements Transferable<Movie.Transfer> {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gen")
    @SequenceGenerator(name = "gen", sequenceName = "gen")
	private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Realm realm;

    @OneToMany(cascade = CascadeType.REMOVE)
    @JoinColumn(name = "movie_id")
    private List<Rating> ratings = new ArrayList<>();
    private String imdb;
    private String name;
    private String director;
    private String actors;
    private int year;
    private int minutes;

    @Getter
    @AllArgsConstructor
    public static class Transfer {
        private long id;
        private String imdb;
        private String name;
        private String director;
        private String actors;
        private int year;
        private int minutes;
        private List<Long> ratings;
    }

    @Override
    public Transfer toTransfer() {
        List<Long> rs = ratings.stream().map(Rating::getId)
                .collect(Collectors.toList());
        return new Movie.Transfer(
                id, imdb, name, director, actors, year, minutes, rs);
    }
}
