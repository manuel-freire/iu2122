package es.ucm.fdi.iu.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A group invitation request.
 */
@Entity
@Data
@NoArgsConstructor
public class Request implements Transferable<Request.Transfer> {

    public enum Status { AWAITING_GROUP, AWAITING_USER, ACCEPTED, REJECTED };

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gen")
    @SequenceGenerator(name = "gen", sequenceName = "gen")
	private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Realm realm;

    @ManyToOne
    private User user;
    @ManyToOne
    private Group group;

    private Status status;

    @Getter
    @AllArgsConstructor
    public static class Transfer {
        private long id;
        private long user;
        private long group;
        private String status;
    }

    @Override
    public Transfer toTransfer() {
        return new Transfer(id, user.getId(), group.getId(),
                status.toString());
    }
}
