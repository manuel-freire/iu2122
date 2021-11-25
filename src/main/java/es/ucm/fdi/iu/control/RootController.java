package es.ucm.fdi.iu.control;

import es.ucm.fdi.iu.LocalData;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import javax.persistence.EntityManager;
import java.io.*;
import java.util.Objects;

/**
 *  Allows user management, and generating random values for
 *  users.
 *
 *  Access to this end-point is authenticated.
 */
@Controller
public class RootController {

	private static final Logger log = LogManager.getLogger(RootController.class);

	@Autowired
	private EntityManager entityManager;

	@Autowired
    private LocalData localData;

	@GetMapping("/login")
    public String login(Model model) {
        return "login";
    }

    private static InputStream defaultPoster() {
	    return new BufferedInputStream(Objects.requireNonNull(
            RootController.class.getClassLoader().getResourceAsStream(
                "static/img/default-poster.jpg")));
    }

    @GetMapping("/poster/{id}")
    public StreamingResponseBody getPoster(@PathVariable String id) throws IOException {
	    if ( ! id.matches("tt[0-9]+")) {
	        return os -> FileCopyUtils.copy(RootController.defaultPoster(), os);
        } else {
            File f = localData.getFile("posters", ""+id+".jpg");
            InputStream in = new BufferedInputStream(f.exists() ?
                new FileInputStream(f) : RootController.defaultPoster());
            return os -> FileCopyUtils.copy(in, os);
        }
	}
}
