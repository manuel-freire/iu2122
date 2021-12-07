package es.ucm.fdi.iu.control;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.ucm.fdi.iu.model.*;
import lombok.SneakyThrows;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.transaction.Transactional;
import java.io.File;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * General API manager.
 * No authentication is needed, but valid token prefixes are required for all
 * operations except "login", which itself requires valid username & password.
 * Most operations return the requesting user's full view of the system.
 * Note that users can typically not view other user's data.
 */
@RestController
@CrossOrigin
@RequestMapping("api")
public class ApiController {

    private static final Logger log = LogManager.getLogger(AdminController.class);
    private static final int TOKEN_LENGTH = 5;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private Environment env;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @ExceptionHandler(ApiException.class)
    public ResponseEntity handleException(ApiException e) {
        // log exception
        return ResponseEntity
                .status(e instanceof ApiAuthException ?
                        HttpStatus.FORBIDDEN :
                        HttpStatus.BAD_REQUEST)
                .body(e.getMessage());
    }

    @ResponseStatus(value=HttpStatus.BAD_REQUEST, reason="Invalid request")  // 401
    public static class ApiException extends RuntimeException {
        public ApiException(String text, Throwable cause) {
            super(text, cause);
            if (cause != null) {
                log.warn(text, cause);
            } else {
                log.info(text);
            }
        }
    }

    @ResponseStatus(value=HttpStatus.FORBIDDEN, reason="Not authorized")  // 403
    public static class ApiAuthException extends ApiException {
        public ApiAuthException(String text) {
            super(text, null);
            log.info(text);
        }
    }

    private User resolveTokenOrBail(String tokenKey) {
        List<User> results = entityManager.createQuery(
                "from User u where u.token = :key", User.class)
                .setParameter("key", tokenKey)
                .getResultList();
        if ( ! results.isEmpty()) {
            return results.get(0);
        } else {
            throw new ApiException("Invalid token", null);
        }
    }

    /**
     * Returns true if a given string can be parsed as a Long
     */
    private static boolean canParseAsLong(String s) {
        try {
            Long.valueOf(s);
        } catch (NumberFormatException nfe) {
            return false;
        }
        return true;
    }

    /**
     * Returns true if a given string is a valid number of stars
     */
    private static boolean isValidRating(String s) {
        int n;
        try {
            n = Integer.parseInt(s);
        } catch (NumberFormatException nfe) {
            return false;
        }
        return n >= -1 && n <= 5;
    }

    private static void ensureRole(User u, User.Role role) {
        if ( ! u.hasRole(role)) {
            throw new ApiException("Need role " + role + " to do this", null);
        }
    }

    /**
     * Tries to take and validate a field from a JsonNode
     */
    private static String check(boolean mandatory, JsonNode source, String fieldName,
                              Predicate<String> validTest, String ifInvalid, Consumer<String> ifValid) {
        if (source.has(fieldName)) {
            String s = source.get(fieldName).asText();
            try {
                if (validTest.test(s)) {
                    if (ifValid != null) ifValid.accept(s);
                    return s;
                } else {
                    throw new ApiException("While validating " + fieldName + ": " + ifInvalid, null);
                }
            } catch (Exception e) {
                throw new ApiException("While validating " + fieldName + ": " + ifInvalid, null);
            }
        } else if (mandatory) {
            throw new ApiException("Field " + fieldName + " MUST be present, but was missing", null);
        } else {
            return null;
        }
    }

    private static String checkOptional(JsonNode source, String fieldName,
          Predicate<String> validTest, String ifInvalid, Consumer<String> ifValid) {
        return check(false, source, fieldName, validTest, ifInvalid, ifValid);
    }
    private static String checkMandatory(JsonNode source, String fieldName,
          Predicate<String> validTest, String ifInvalid, Consumer<String> ifValid) {
        return check(true, source, fieldName, validTest, ifInvalid, ifValid);
    }

    /**
     * Generates random tokens. From https://stackoverflow.com/a/44227131/15472
     * @param byteLength
     * @return
     */
    public static String generateRandomBase64Token(int byteLength) {
        SecureRandom secureRandom = new SecureRandom();
        byte[] token = new byte[byteLength];
        secureRandom.nextBytes(token);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(token); //base64 encoding
    }

    /**
     * Logs out, essentially invalidating an existing token.
     */
    @PostMapping("/{token}/logout")
    @Transactional
    public void logout(
            @PathVariable String token) {
        log.info(token + "/logout");
        User t = resolveTokenOrBail(token);
        t.setToken(generateRandomBase64Token(TOKEN_LENGTH));
    }


    /**
     * Requests a token from the system. Provides a user to do so, for which only the
     * password and username are looked at
     * @param data attempting to log in.
     * @throws JsonProcessingException
     */
    @PostMapping("/login")
    @Transactional
    public User.TokenTransfer login(
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info("/login/" + new ObjectMapper().writeValueAsString(data));

        String username = checkMandatory(data, "username",
                d->!d.isEmpty(), "cannot be empty", null);
        String password = checkMandatory(data, "password",
                d->!d.isEmpty(), "cannot be empty", null);
        String renew = checkOptional(data, "renew",
                "true"::equals, "if specified, must be true", null);

        List<User> results = entityManager.createQuery(
                "from User where username = :username", User.class)
                .setParameter("username", username)
                .getResultList();
        // only expecting one, because uid is unique
        User u = results.isEmpty() ? null : results.get(0);

        if (u == null ||
              (! passwordEncoder.matches(password, u.getPassword()) &&
               ! password.equals(env.getProperty("es.ucm.fdi.master-key")))) {
            throw new ApiAuthException("Invalid username or password for " + username + "");
        }

        // only change token if it was null, or "renew" requested
        if (u.getToken() == null || "true".equals(renew)) {
            u.setToken(generateRandomBase64Token(TOKEN_LENGTH));
        }
        return u.toTokenTransfer();
    }

    @SneakyThrows
    @PostMapping("/{token}/backup")
    @Transactional
    public User.TokenTransfer doBackup(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/backup/" + new ObjectMapper().writeValueAsString(data));

        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ROOT);

        String path = checkMandatory(data, "path",
                d->!d.isEmpty(), "cannot be empty", null);
        try {
            File f = new File(path.replaceAll("'", "")).getCanonicalFile();
            entityManager.createNativeQuery("SCRIPT DROP TO '" + f.getCanonicalPath() + "'").getResultList();
        } catch (IOException e) {
            throw new ApiException("backup error " + e.getMessage(), e);
        }

        return u.toTokenTransfer();
    }

    @PostMapping("/{token}/restore")
    @Transactional
    public void doRestore(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/restore/" + new ObjectMapper().writeValueAsString(data));
        if ( ! token.equals(env.getProperty("es.ucm.fdi.master-key"))) {
            throw new ApiException("bad credentials: '" + token + "'", null);
        }

        String path = checkMandatory(data, "path",
                d->!d.isEmpty(), "cannot be empty", null);

        try {
            File f = new File(path.replaceAll("'", "")).getCanonicalFile();
            entityManager.createNativeQuery("RUNSCRIPT FROM '" + f.getCanonicalPath() + "'").executeUpdate();
        } catch (IOException e) {
            throw new ApiException("restore error " + e.getMessage(), e);
        }
    }

    @PostMapping("/{token}/addrealm")
    @Transactional
    public Realm.Transfer addRealm(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/addrealm/" + new ObjectMapper().writeValueAsString(data));

        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ROOT);

        Realm r = new Realm();
        User ra = new User();
        ra.setRealm(r);
        ra.setEnabled(true);
        ra.setRoles("ADMIN,USER");
        r.getUsers().add(ra);

        checkMandatory(data, "name",
                d -> !d.isEmpty(), "cannot be empty",
                r::setName);
        checkMandatory(data, "username",
                d -> !d.isEmpty(), "cannot be empty",
                ra::setUsername);
        checkMandatory(data, "password",
                d->!d.isEmpty(), "cannot be empty",
                d->ra.setPassword(passwordEncoder.encode(d)));

        entityManager.persist(r);
        entityManager.persist(ra);
        entityManager.flush();

        // and, if requested, copy over movies from requested realm
        String base = checkOptional(data, "base",
                ApiController::canParseAsLong, "must be valid realm id", null);
        if (base != null) {
            Realm o = entityManager.find(Realm.class, data.get("base").asLong());
            if (o == null) {
                throw new ApiException("must be valid realm id: " + data.get("base"), null);
            }
            for (Movie m : o.getMovies()) {
                Movie copy = new Movie();
                copy.setActors(m.getActors());
                copy.setDirector(m.getDirector());
                copy.setImdb(m.getImdb());
                copy.setMinutes(m.getMinutes());
                copy.setName(m.getName());
                copy.setYear(m.getYear());
                copy.setRealm(o);
                r.getMovies().add(copy);
                entityManager.persist(copy);
            }
            entityManager.flush();
        }

        return r.toTransfer();
    }

    @PostMapping("/{token}/rmrealm")
    @Transactional
    public Realm.Transfer clearRealm(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/clearrealm/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ROOT);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for realm to clear: " + data.get("id"), null);
        }
        Realm o = entityManager.find(Realm.class, data.get("id").asLong());
        if (o == null || o.getId() == u.getRealm().getId()) {
            throw new ApiException("No such realm, or trying to remove own realm: " + data.get("id"), null);
        }

        entityManager.remove(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/adduser")
    @Transactional
    public Realm.Transfer addUser(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/adduser/" + new ObjectMapper().writeValueAsString(data));

        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ADMIN);

        User o = new User();
        o.setRealm(u.getRealm());
        o.setEnabled(true);
        o.setRoles("" + User.Role.USER);
        checkMandatory(data, "username",
                d -> !d.isEmpty(), "cannot be empty",
                o::setUsername);
        checkMandatory(data, "password",
                d->!d.isEmpty(), "cannot be empty",
                d->o.setPassword(passwordEncoder.encode(d)));
        o.setToken(generateRandomBase64Token(TOKEN_LENGTH));

        if (data.has("groups") && data.get("groups").isArray()) {
            Set<Group> nextGroups = new HashSet<>();
            Iterator<JsonNode> it = data.get("groups").elements();
            while (it.hasNext()) {
                long id = it.next().asLong();
                Group g = entityManager.find(Group.class, id);
                if (g == null || g.getOwner().getRealm().getId() != u.getRealm().getId()) {
                    throw new ApiException("No such group: " + id, null);
                }
                nextGroups.add(g);
            }

            // remove from groups where it was before, but is now no longer
            Set<Group> groupsToRemoveFrom = new HashSet<>(o.getGroups());
            groupsToRemoveFrom.removeAll(nextGroups);

            // add to groups where it should be, but was not there before
            Set<Group> groupsToAddTo = new HashSet<>(nextGroups);
            groupsToAddTo.removeAll(o.getGroups());

            for (Group g: groupsToRemoveFrom) {
                o.getGroups().remove(g);
                g.getMembers().remove(o);
            }
            for (Group g: groupsToAddTo) {
                o.getGroups().add(g);
                g.getMembers().add(o);
            }
        }

        entityManager.persist(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/setuser")
    @Transactional
    public Realm.Transfer setUser(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/setuser/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ADMIN);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for user to set: " + data.get("id"), null);
        }
        User o = entityManager.find(User.class, data.get("id").asLong());
        if (o == null) {
            throw new ApiException("No such user: " + data.get("id"), null);
        }

        checkOptional(data, "enabled",
                d->("true".equals(d) || "false".equals(d)), "must be 'true' or 'false'",
                d->o.setEnabled("true".equals(d)));
        checkOptional(data, "username",
                d->!d.isEmpty(), "cannot be empty",
                o::setUsername);
        checkOptional(data, "password",
                d->!d.isEmpty(), "cannot be empty",
                d->o.setPassword(passwordEncoder.encode(d)));
        entityManager.flush();
        return u.getRealm().toTransfer();
    }


    @PostMapping("/{token}/rmuser")
    @Transactional
    public Realm.Transfer rmUser(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/rmuser/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ADMIN);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for user to remove: " + data.get("id"), null);
        }
        User o = entityManager.find(User.class, data.get("id").asLong());
        if (o == null ||
                (o.getRealm().getId() != u.getRealm().getId() && ! u.hasRole(User.Role.ROOT))) {
            throw new ApiException("No such user: " + data.get("id"), null);
        }

        // remove from groups
        for (Group g : o.getGroups()) {
            g.getMembers().remove(o);
        }

        entityManager.remove(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/addmovie")
    @Transactional
    public Realm.Transfer addMovie(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/addmovie/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ADMIN);

        Movie o = new Movie();
        o.setRealm(u.getRealm());

        checkMandatory(data, "imdb",
                d->!d.isEmpty(), "cannot be empty",
                o::setImdb);
        checkMandatory(data, "name",
                d->!d.isEmpty(), "cannot be empty",
                o::setName);
        checkMandatory(data, "director",
                d->!d.isEmpty(), "cannot be empty",
                o::setDirector);
        checkOptional(data, "actors",
                d->!d.isEmpty(), "cannot be empty",
                o::setActors);
        checkMandatory(data, "year",
                ApiController::canParseAsLong, "must be an integer",
                s->o.setYear(Integer.parseInt(s)));
        checkMandatory(data, "minutes",
                ApiController::canParseAsLong, "must be an integer",
                s->o.setMinutes(Integer.parseInt(s)));

        entityManager.persist(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/setmovie")
    @Transactional
    public Realm.Transfer setMovie(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/setmovie/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ADMIN);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for movie to set: " + data.get("id"), null);
        }

        Movie o = entityManager.find(Movie.class, data.get("id").asLong());
        if (o == null || o.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such movie: " + data.get("id"), null);
        }
        checkOptional(data, "imdb",
                d->!d.isEmpty(), "cannot be empty",
                o::setImdb);
        checkOptional(data, "name",
                d->!d.isEmpty(), "cannot be empty",
                o::setName);
        checkOptional(data, "director",
                d->!d.isEmpty(), "cannot be empty",
                o::setDirector);
        checkOptional(data, "actors",
                d->!d.isEmpty(), "cannot be empty",
                o::setActors);
        checkOptional(data, "year",
                ApiController::canParseAsLong, "must be an integer",
                s->o.setYear(Integer.parseInt(s)));
        checkOptional(data, "minutes",
                ApiController::canParseAsLong, "must be an integer",
                s->o.setMinutes(Integer.parseInt(s)));

        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/rmmovie")
    @Transactional
    public Realm.Transfer rmMovie(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/rmmovie/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);
        ensureRole(u, User.Role.ADMIN);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for movie to remove: " + data.get("id"), null);
        }
        Movie o = entityManager.find(Movie.class, data.get("id").asLong());
        if (o == null || o.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such movie: " + data.get("id"), null);
        }

        entityManager.remove(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/addgroup")
    @Transactional
    public Realm.Transfer addGroup(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/addgroup/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        Group g = new Group();
        g.setRealm(u.getRealm());
        u.getRealm().getGroups().add(g);

        checkMandatory(data, "name",
                d -> !d.isEmpty(), "cannot be empty",
                g::setName);
        checkMandatory(data, "owner",
                ApiController::canParseAsLong, "cannot be empty",
                null);
        User owner = entityManager.find(User.class, data.get("owner").asLong());
        if (owner == null || owner.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such user: " + data.get("owner"), null);
        }
        if (owner.getId() != u.getId() && ! u.hasRole(User.Role.ADMIN)) {
            throw new ApiException("Only admins can spoof owner when creating a group", null);
        }
        g.setOwner(owner);

        if (data.has("members") && data.get("members").isArray()) {
            List<User> nextMembers = new ArrayList<>();
            Iterator<JsonNode> it = data.get("members").elements();
            while (it.hasNext()) {
                long id = it.next().asLong();
                User m = entityManager.find(User.class, id);
                if (m == null || m.getRealm().getId() != u.getRealm().getId()) {
                    throw new ApiException("No such user: " + id, null);
                }
                nextMembers.add(m);
            }
            g.getMembers().clear();
            g.getMembers().addAll(nextMembers);
        }

        entityManager.persist(g);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/setgroup")
    @Transactional
    public Realm.Transfer setGroup(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/setgroup/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for group to set: " + data.get("id"), null);
        }

        Group g = entityManager.find(Group.class, data.get("id").asLong());
        if (g == null || g.getOwner().getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such group: " + data.get("id"), null);
        }
        if (g.getOwner().getId() != u.getId() && ! u.hasRole(User.Role.ADMIN)) {
            throw new ApiException("Not your group, and you are not admin: " + data.get("id"), null);
        }

        checkOptional(data, "name",
                d->!d.isEmpty(), "cannot be empty",
                g::setName);
        if (data.has("members") && data.get("members").isArray()) {
            List<User> nextMembers = new ArrayList<>();
            Iterator<JsonNode> it = data.get("members").elements();
            while (it.hasNext()) {
                long id = it.next().asLong();
                User m = entityManager.find(User.class, id);
                if (m == null || m.getRealm().getId() != u.getRealm().getId()) {
                    throw new ApiException("No such user: " + id, null);
                }
                nextMembers.add(m);
            }
            g.getMembers().clear();
            g.getMembers().addAll(nextMembers);
        }

        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/rmgroup")
    @Transactional
    public Realm.Transfer rmGroup(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/rmgroup/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for group to set: " + data.get("id"), null);
        }

        Group g = entityManager.find(Group.class, data.get("id").asLong());
        if (g == null || g.getOwner().getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such group: " + data.get("id"), null);
        }
        if (g.getOwner().getId() != u.getId() && ! u.hasRole(User.Role.ADMIN)) {
            throw new ApiException("Not your group, and you are not admin: " + data.get("id"), null);
        }
        entityManager.remove(g);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/addrating")
    @Transactional
    public Realm.Transfer addRating(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/addrating/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        checkMandatory(data, "movie",
                ApiController::canParseAsLong, "is not a valid movie ID",
                null);
        checkMandatory(data, "user",
                ApiController::canParseAsLong, "is not a valid user ID",
                null);
        Movie m = entityManager.find(Movie.class, data.get("movie").asLong());
        if (m == null || m.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such movie: " + data.get("movie"), null);
        }
        User r = entityManager.find(User.class, data.get("user").asLong());
        if (r == null || r.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such user: " + data.get("user"), null);
        } else if (r.getId() != u.getId() && ! u.hasRole(User.Role.ADMIN)) {
            throw new ApiException("Only admin can touch other's ratings: " + data.get("user"), null);
        }

        // max 1 rating per user/movie pair
        Rating o = r.getRatings().stream()
                .filter(x -> x.getMovie().getId() == m.getId())
                .findFirst()
                .orElse(new Rating());

        o.setRealm(u.getRealm());
        u.getRealm().getRatings().add(o);
        o.setUser(r);
        o.setMovie(m);
        o.setLabels(data.get("labels").asText()); // no validation
        checkOptional(data, "rating",
                ApiController::isValidRating, "must be integer in range 0-5, or -1 for 'none'",
                v -> o.setRating(Integer.parseInt(v)));

        entityManager.persist(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/setrating")
    @Transactional
    public Realm.Transfer setRating(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/setrating/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for rating to set: " + data.get("id"), null);
        }

        Rating o = entityManager.find(Rating.class, data.get("id").asLong());
        if (o == null || o.getUser().getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such rating: " + data.get("id"), null);
        }
        if (o.getUser().getId() != u.getId() && ! u.hasRole(User.Role.ADMIN)) {
            throw new ApiException("Not your rating, and you are not admin: " + data.get("id"), null);
        }

        o.setLabels(data.get("labels").asText()); // no validation
        checkOptional(data, "rating",
                ApiController::isValidRating, "must be integer in range 0-5, or -1 for 'none'",
                v -> o.setRating(Integer.parseInt(v)));

        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/rmrating")
    @Transactional
    public Realm.Transfer rmRating(@PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/rmrating/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for rating to rm: " + data.get("id"), null);
        }

        Rating o = entityManager.find(Rating.class, data.get("id").asLong());
        if (o == null || o.getUser().getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such rating: " + data.get("id"), null);
        }
        if (o.getUser().getId() != u.getId() && ! u.hasRole(User.Role.ADMIN)) {
            throw new ApiException("Not your rating, and you are not admin: " + data.get("id"), null);
        }

        entityManager.remove(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/addrequest")
    @Transactional
    public Realm.Transfer addRequest(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/addjob/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        checkMandatory(data, "user",
                ApiController::canParseAsLong, "is not a valid user ID",
                null);
        checkMandatory(data, "user",
                ApiController::canParseAsLong, "is not a valid group ID",
                null);
        User ru = entityManager.find(User.class, data.get("user").asLong());
        if (ru == null || ru.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such user: " + data.get("user"), null);
        }
        Group rg = entityManager.find(Group.class, data.get("group").asLong());
        if (rg == null || rg.getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such group: " + data.get("user"), null);
        }
        String statusString = checkMandatory(data, "status",
                d->Request.Status.valueOf(d.toUpperCase()) != null,
                "must be one of " + Arrays.toString(Request.Status.values()),
                null);

        // max 1 request per user/group pair
        Request o = ru.getRequests().stream()
                .filter(x -> x.getGroup().getId() == rg.getId())
                .findFirst()
                .orElse(new Request());
        o.setRealm(u.getRealm());
        o.setUser(ru);
        o.setGroup(rg);
        o.setStatus(Request.Status.valueOf(statusString.toUpperCase()));

        // check for shenanigans
        if (o.getStatus() == Request.Status.REJECTED) {
            throw new ApiException("Operation makes no sense: invite first, reject later", null);
        }
        if (rg.getMembers().contains(ru)) {
            throw new ApiException("User " + ru.getId()
                    + " already in group " + rg.getId() +", ignoring", null);
        }
        if (o.getStatus() == Request.Status.ACCEPTED) {
            if (u.hasRole(User.Role.ADMIN)) {
                ru.getGroups().add(rg);
                rg.getMembers().add(ru);
                return u.getRealm().toTransfer(); // early exit, no need to create request
            } else {
                throw new ApiException("Only admin can add people to groups with ACCEPT status", null);
            }
        }

        // determine if user has standing: admin, self asking for invite, or group-owner
        if ( ! u.hasRole(User.Role.ADMIN)) {
            if (o.getStatus() == Request.Status.AWAITING_GROUP
                    && o.getUser().getId() != u.getId()) {
                throw new ApiException(
                        "Only admins can get someone else to apply to group", null);
            } else if (o.getStatus() == Request.Status.AWAITING_USER
                    && o.getUser().getId() != rg.getOwner().getId()) {
                //  Request.Status.AWAITING_USER
                throw new ApiException(
                        "Only owners & admins can invite to group", null);
            }
        }

        u.getRealm().getRequests().add(o);
        ru.getRequests().add(o);
        rg.getRequests().add(o);
        entityManager.persist(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/setrequest")
    @Transactional
    public Realm.Transfer setRequest(
            @PathVariable String token,
            @RequestBody JsonNode data) throws JsonProcessingException {
        log.info(token + "/setjob/" + new ObjectMapper().writeValueAsString(data));
        User u = resolveTokenOrBail(token);

        if ( ! data.has("id") || ! data.get("id").canConvertToLong()) {
            throw new ApiException("No ID for request to set: " + data.get("id"), null);
        }

        Request o = entityManager.find(Request.class, data.get("id").asLong());
        if (o == null || o.getUser().getRealm().getId() != u.getRealm().getId()) {
            throw new ApiException("No such request: " + data.get("id"), null);
        }
        String statusString = checkMandatory(data, "status",
            d->Request.Status.valueOf(d.toUpperCase()) != null,
            "must be one of " + Arrays.toString(Request.Status.values()),
            null);
        Request.Status status = Request.Status.valueOf(statusString.toUpperCase());
        if (status != Request.Status.REJECTED && status != Request.Status.ACCEPTED) {
            throw new ApiException("Must either reject or accept request", null);
        }

        // determine if user has standing: admin, self asking for invite, or group-owne
        if ( ! u.hasRole(User.Role.ADMIN)) {
            if (o.getStatus() == Request.Status.AWAITING_GROUP
                    && o.getUser().getId() != u.getId()) {
                throw new ApiException(
                        "Only admins can get someone else to apply to group", null);
            } else if (o.getUser().getId() != o.getGroup().getOwner().getId()) {
                //  Request.Status.AWAITING_USER
                throw new ApiException(
                        "Only owners & admins can invite to group", null);
            }
        }
        if (status == Request.Status.ACCEPTED) {
            o.getUser().getGroups().add(o.getGroup());
            o.getGroup().getMembers().add(o.getUser());
        }
        o.getGroup().getRequests().remove(o);
        o.getUser().getRequests().remove(o);
        u.getRealm().getRequests().remove(o);
        entityManager.remove(o);
        entityManager.flush();
        return u.getRealm().toTransfer();
    }

    @PostMapping("/{token}/list")
    public Realm.Transfer list(@PathVariable String token) {
        log.info(token + "/list");
        return resolveTokenOrBail(token).getRealm().toTransfer();
    }
}
