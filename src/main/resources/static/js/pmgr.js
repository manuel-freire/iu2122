"use strict"

import * as Pmgr from './pmgrapi.js'

/**
 * Librería de cliente para interaccionar con el servidor de PeliManager (pmgr).
 * Prácticas de IU 2021-22
 *
 * Para las prácticas de IU, pon aquí (o en otros js externos incluidos desde tus .htmls) el código
 * necesario para añadir comportamientos a tus páginas.
 *
 * Recomiendo separar el fichero en 2 partes:
 * - parte "página-independiente": funciones que pueden generar cachos de
 *   contenido a partir del modelo, pero que no tienen referencias directas a la página
 * - parte pequeña, al final, de "pegamento": asocia comportamientos a
 *   elementos de la página.
 * Esto tiene la ventaja de que, si cambias tu página, sólo deberías tener
 * que cambiar el pegamento.
 *
 * Fuera de las prácticas, lee la licencia: dice lo que puedes hacer con él:
 * lo que quieras siempre y cuando
 * - no digas que eres el autor original.
 * - no me eches la culpa de haberlo escrito mal.
 *
 * @Author manuel.freire@fdi.ucm.es
 */

//
// PARTE 1:
// Código de comportamiento, que sólo se llama desde consola (para probarlo) o desde la parte 2,
// en respuesta a algún evento.
//

/**
 * 
 * @param {string} sel CSS usado para indicar qué fieldset quieres convertir
 * en estrellitas. Se espera que el fieldset tenga este aspecto:
 *      <label title="Atómico - 5 estrellas">
            <input type="radio" name="rating" value="5" />
        </label>

        <label title="Muy buena - 4 estrellas">
            <input type="radio" name="rating" value="4" />
        </label>

        <label title="Pasable - 3 estrellas">
            <input type="radio" name="rating" value="3" />
        </label>

        <label title="Más bien mala - 2 estrellas">
            <input type="radio" name="rating" value="2" />
        </label>

        <label title="Horrible - 1 estrella">
            <input type="radio" name="rating" value="1" />
        </label>
 */
function stars(sel) {
    const changeClassOnEvents = (ss, s) => {
        s.addEventListener("change", e => {
            // find current index
            const idx = e.target.value;
            // set selected for previous & self, remove for next
            ss.querySelectorAll("label").forEach(label => {
                if (label.children[0].value <= idx) {
                    label.classList.add("selected");
                } else {
                    label.classList.remove("selected");
                }
            });
        });
    };
    const activateStars = (ss) => {
        ss.classList.add("rating");
        ss.querySelectorAll("input").forEach(s =>
            changeClassOnEvents(ss, s));
        let parent = ss;
        while (!parent.matches("form")) {
            parent = parent.parentNode;
        }
        parent.addEventListener("reset", () => {
            ss.querySelectorAll("input").forEach(e => e.checked = false);
            ss.querySelectorAll("label").forEach(e => e.classList.remove("selected"));
        });
    }
    document.querySelectorAll(sel).forEach(activateStars);
}

function createMovieItem(movie) {
    const r2s = r => r > 0 ? Pmgr.Util.fill(r, () => "⭐").join("") : "";
    const ratings = movie.ratings.map(id => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${r.user == userId ? "primary" : "secondary"}">
        ${Pmgr.resolve(r.user).username}: ${r.labels} ${r2s(r.rating)}
        </span>
        `
    ).join("");

    return `
    <div class="col" data-id="${movie.id}">
        <div class="card">
            <img class="card-img-top rounded" alt="${movie.id}" src="${serverUrl}poster/${movie.imdb}">

    <!-- Codigo de ejemplo
    
    <div class="card-header"">
        <h4 class="mb-0" title="${movie.id}">
            ${movie.name} <small><i>(${movie.year})</i></small>
        </h4>
        </div>
    </div>

    <div>
        <div class="card-body pcard">
            <div class="row">
                <div class="col-auto">
                    <img class="iuthumb" src="${serverUrl}poster/${movie.imdb}"/>
                </div>
                <div class="col">
                    <div class="row-12">
                        ${movie.director} / ${movie.actors} (${movie.minutes} min.)
                    </div>        
                    <div class="row-12">
                        ${ratings}
                    </div>        
                    <div class="iucontrol movie">
                        <button class="rm" data-id="${movie.id}">🗑️</button>
                        <button class="edit" data-id="${movie.id}">✏️</button>
                        <button class="rate" data-id="${movie.id}">⭐</button>
                    </div>  
                </div>
            </div>
        </div>
    </div>
    
    -->
    </div>
 `;
}

function createGroupItem(group) {
    let allMembers = group.members.map((id) =>
        `<span class="badge bg-secondary">${Pmgr.resolve(id).username}</span>`
    ).join(" ");
    const waitingForGroup = r => r.status.toLowerCase() == Pmgr.RequestStatus.AWAITING_GROUP;
    let allPending = group.requests.map((id) => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${waitingForGroup(r) ? "warning" : "info"}"
            title="Esperando aceptación de ${waitingForGroup(r) ? "grupo" : "usuario"}">
            ${Pmgr.resolve(r.user).username}</span>`

    ).join(" ");

    return `
    <div class="card">
    <div class="card-header">
        <h4 class="mb-0" title="${group.id}">
            <b class="pcard">${group.name}</b>
        </h4>
    </div>
    <div class="card-body pcard">
        <div class="row-sm-11">
            <span class="badge bg-primary">${Pmgr.resolve(group.owner).username}</span>
            ${allMembers}
            ${allPending}
        </div>
        <div class="row-sm-1 iucontrol group">
            <button class="rm" data-id="${group.id}">🗑️</button>
            <button class="edit" data-id="${group.id}">✏️</button>
        </div>
    </div>              
    </div>
    </div>
`;
}

function createUserItem(user) {
    let allGroups = user.groups.map((id) =>
        `<span class="badge bg-secondary">${Pmgr.resolve(id).name}</span>`
    ).join(" ");
    const waitingForGroup = r => r.status.toLowerCase() == Pmgr.RequestStatus.AWAITING_GROUP;
    let allPending = user.requests.map((id) => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${waitingForGroup(r) ? "warning" : "info"}"
            title="Esperando aceptación de ${waitingForGroup(r) ? "grupo" : "usuario"}">
            ${Pmgr.resolve(r.group).name}</span>`
    ).join(" ");

    return `
    <div class="card">
    <div class="card-header">
        <h4 class="mb-0" title="${user.id}">
            <b class="pcard">${user.username}</b>
        </h4>
    </div>
    <div class="card-body pcard">
        <div class="row-sm-11">
            ${allGroups}
            ${allPending}
        <div>
        <div class="row-sm-1 iucontrol user">
            <button class="rm" data-id="${user.id}">🗑️</button>
            <button class="edit" data-id="${user.id}">✏️</button>
        </div>        
    </div>
    </div>
`;
}

/**
 * Usa valores de un formulario para añadir una película
 * @param {Element} formulario para con los valores a subir
 */
function nuevaPelicula(formulario) {
    const movie = new Pmgr.Movie(-1,
        formulario.querySelector('input[name="imdb"]').value,
        formulario.querySelector('input[name="name"]').value,
        formulario.querySelector('input[name="director"]').value,
        formulario.querySelector('input[name="actors"]').value,
        formulario.querySelector('input[name="year"]').value,
        formulario.querySelector('input[name="minutes"]').value);
    Pmgr.addMovie(movie).then(() => {
        formulario.reset() // limpia el formulario si todo OK
        update();
    });
}

/**
 * Usa valores de un formulario para modificar una película
 * @param {Element} formulario para con los valores a subir
 */
function modificaPelicula(formulario) {
    const movie = new Pmgr.Movie(
        formulario.querySelector('input[name="id"]').value,
        formulario.querySelector('input[name="imdb"]').value,
        formulario.querySelector('input[name="name"]').value,
        formulario.querySelector('input[name="director"]').value,
        formulario.querySelector('input[name="actors"]').value,
        formulario.querySelector('input[name="year"]').value,
        formulario.querySelector('input[name="minutes"]').value)
    Pmgr.setMovie(movie).then(() => {
        formulario.reset() // limpia el formulario si todo OK
        modalEditMovie.hide(); // oculta el formulario
        update();
    }).catch(e => console.log(e));
}

/**
 * Usa valores de un formulario para añadir un rating
 * @param {Element} formulario para con los valores a subir
 */
function nuevoRating(formulario) {
    console.log(formulario)
    const rating = new Pmgr.Rating(-1,
        userId,
        formulario.querySelector('input[name="id"]').value,
        formulario.querySelector('input[name="myRating"]:checked').value,
        formulario.querySelector('textArea[name="myLabels"]').value);
    Pmgr.addRating(rating).then(() => {
        formulario.reset() // limpia el formulario si todo OK
        modalRateMovie.hide(); // oculta el formulario
        update();
    }).catch(e => console.log(e));
}

/**
 * Usa valores de un formulario para modificar un rating
 * @param {Element} formulario para con los valores a subir
 */
function modificaRating(formulario, ratingID) {
    console.log(formulario.querySelector('input[name="myRating"]:checked').value)
    const rating = new Pmgr.Rating(
        ratingID,
        userId,
        formulario.querySelector('input[name="id"]').value,
        formulario.querySelector('input[name="myRating"]:checked').value,
        formulario.querySelector('textArea[name="myLabels"]').value);
    Pmgr.setRating(rating).then(() => {
        formulario.reset() // limpia el formulario si todo OK
        modalRateMovie.hide(); // oculta el formulario
        update();
    }).catch(e => console.log(e));
}

/**
 * Usa valores de un formulario para añadir una película
 * @param {Element} formulario para con los valores a subir
 */
function generaPelicula(formulario) {
    const movie = Pmgr.Util.randomMovie();
    for (let [k, v] of Object.entries(movie)) {
        const input = formulario.querySelector(`input[name="${k}"]`);
        if (input) input.value = v;
    }
}

/**
 * En un div que contenga un campo de texto de búsqueda
 * y un select, rellena el select con el resultado de la
 * funcion actualizaElementos (que debe generar options), y hace que
 * cualquier búsqueda filtre los options visibles.
 */
let oldHandler = false;
/**
 * Comportamiento de filtrado dinámico para un select-con-busqueda.
 * 
 * Cada vez que se modifica la búsqueda, se refresca el select para mostrar sólo 
 * aquellos elementos que contienen lo que está escrito en la búsqueda
 * 
 * @param {string} div selector que devuelve el div sobre el que operar
 * @param {Function} actualiza el contenido del select correspondiente
 */
function activaBusquedaDropdown(div, actualiza) {
    let search = document.querySelector(`${div} input[type=search]`);
    let select = document.querySelector(`${div} select`);

    // vacia el select, lo llena con elementos validos
    actualiza(`${div} select`);

    // manejador
    const handler = () => {
        let w = search.value.trim().toLowerCase();
        let items = document.querySelectorAll(`${div} select>option`);

        // filtrado; poner o.style.display = '' muestra, = 'none' oculta
        items.forEach(o =>
            o.style.display = (o.innerText.toLowerCase().indexOf(w) > -1) ? '' : 'none');

        // muestra un array JS con los seleccionados
        console.log("Seleccionados:", select.value);
    };

    // filtrado dinámico
    if (oldHandler) {
        search.removeEventListener('input', handler);
    }
    oldHandler = search.addEventListener('input', handler);
}

//
// Función que refresca toda la interfaz. Debería llamarse tras cada operación
// por ejemplo, Pmgr.addGroup({"name": "nuevoGrupo"}).then(update); // <--
//
function update() {
    const appendTo = (sel, html) =>
        document.querySelector(sel).insertAdjacentHTML("beforeend", html);
    const empty = (sel) => {
        const destino = document.querySelector(sel);
        while (destino.firstChild) {
            destino.removeChild(destino.firstChild);
        }
    }
    try {
        // vaciamos los contenedores
        empty("#movies");
        empty("#groups");
        empty("#users");

        // y los volvemos a rellenar con su nuevo contenido
        Pmgr.state.movies.forEach(o => appendTo("#movies", createMovieItem(o)));
        Pmgr.state.users.forEach(o => appendTo("#users", createUserItem(o)));
        var userGroups = Pmgr.resolve(userId)
        if(userGroups != undefined && userGroups.groups.length > 0){
            console.log(userGroups.groups)
            Pmgr.state.groups.forEach(o => {
                if(userGroups.groups.indexOf(o.id) >= 0){
                    console.log("Adding group",o)
                    appendTo("#groups", createGroupItem(o))
                }
            });
        }else{
            appendTo("#groups","<p>You aren't in any groups!</h1>")
        }
        
        

        // y añadimos manejadores para los eventos de los elementos recién creados
        // botones de borrar películas
        document.querySelectorAll(".iucontrol.movie button.rm").forEach(b =>
            b.addEventListener('click', e => {
                const id = e.target.dataset.id; // lee el valor del atributo data-id del boton
                Pmgr.rmMovie(id).then(update);
            }));
        // botones de editar películas
        document.querySelectorAll(".iucontrol.movie button.edit").forEach(b =>
            b.addEventListener('click', e => {
                const id = e.target.dataset.id; // lee el valor del atributo data-id del boton
                const movie = Pmgr.resolve(id);
                const formulario = document.querySelector("#movieEditForm");
                for (let [k, v] of Object.entries(movie)) {
                    // rellenamos el formulario con los valores actuales
                    const input = formulario.querySelector(`input[name="${k}"]`);
                    if (input) input.value = v;
                }

                modalEditMovie.show(); // ya podemos mostrar el formulario
            }));
        // botones de evaluar películas
        document.querySelectorAll(".iucontrol.movie button.rate").forEach(b =>
            b.addEventListener('click', e => {
                const id = e.target.dataset.id; // lee el valor del atributo data-id del boton
                const formulario = document.querySelector("#movieRateForm");
                const prev = Pmgr.state.ratings.find(r => r.movie == id && r.user == userId);
                if (prev) {
                    // viejo: copia valores
                    formulario.querySelector("input[name=id]").value = prev.id;
                    const input = formulario.querySelector(`input[value="${prev.rating}"]`);
                    if (input) {
                        input.checked;
                    }
                    // lanza un envento para que se pinten las estrellitas correctas
                    // see https://stackoverflow.com/a/2856602/15472
                    if ("createEvent" in document) {
                        const evt = document.createEvent("HTMLEvents");
                        evt.initEvent("change", false, true);
                        input.dispatchEvent(evt);
                    } else {
                        input.fireEvent("onchange");
                    }
                    formulario.querySelector("input[name=labels]").value = prev.labels;
                } else {
                    // nuevo
                    formulario.reset();
                    formulario.querySelector("input[name=id]").value = -1;
                }
                formulario.querySelector("input[name=movie]").value = id;
                formulario.querySelector("input[name=user]").value = userId;
                modalRateMovie.show(); // ya podemos mostrar el formulario
            }));
        // botones de borrar grupos
        document.querySelectorAll(".iucontrol.group button.rm").forEach(b =>
            b.addEventListener('click', e => Pmgr.rmGroup(e.target.dataset.id).then(update)));
        // botones de borrar usuarios
        document.querySelectorAll(".iucontrol.user button.rm").forEach(b =>
            b.addEventListener('click', e => Pmgr.rmUser(e.target.dataset.id).then(update)));
        // botones de informacion de cada pelicula
        document.querySelectorAll("#movies .card").forEach(m => {
            m.addEventListener('click', e => {
                const movieId = e.target.getAttribute("alt")
                // console.log(id);
                // console.log(e.target)
                console.log(`Seleccionada película ${movieId}`);

                var movie = Pmgr.resolve(movieId)
                var modalTitle = document.getElementById('movieInfoLabel')
                var modalImage = document.getElementById('movieInfoImage')
                var modalDirector = document.getElementById('movieInfoDirector')
                var modalYear = document.getElementById('movieInfoYear')
                var modalLength = document.getElementById('movieInfoLength')
                var modalActors = document.getElementById('movieInfoActors')
                var modelTags = document.getElementById('movieInfoLable')
				var modalRating = document.getElementById('movieInfoRating')


                modalTitle.textContent = movie.name + " - " + movie.year
                modalDirector.textContent = movie.director
                modalLength.textContent = movie.minutes + " minutes"
                modalYear.textContent = movie.year
                modalActors.textContent = movie.actors
                modalImage.src = serverUrl + "poster/" + movie.imdb
                modelTags.textContent = ""

                //Set edit button id for later use
                document.getElementById('editMovieButton').setAttribute("data-id", movieId)

                let ratingFinal = 0;
				let elementsCounted = 0;

				for (let i = 0; i < movie.ratings.length; i++) {
					var rat = movie.ratings[i];
					let mov = Pmgr.state.ratings.find(element => element.id == rat)
                

					if (mov.rating != -1) {
						ratingFinal += mov.rating
						elementsCounted++
					}


					if (mov.labels.length > 0)
						modelTags.textContent = (modelTags.textContent + mov.labels + ",");
				}
				if (modelTags.textContent == "")
					modelTags.textContent = ("No tags");
				else
					modelTags.textContent = modelTags.textContent.substring(0, modelTags.textContent.length - 1);


				var fullstars = Math.round(ratingFinal / elementsCounted)


				if (!fullstars)
					modalRating.textContent = "No rating"
				else
					modalRating.textContent = '⭐'.repeat(fullstars)

                modalMovieInfo.show()
            })
        })

    } catch (e) {
        console.log('Error actualizando', e);
    }

    // /* para que siempre muestre los últimos elementos disponibles */
    // activaBusquedaDropdown('#dropdownBuscablePelis',
    //     (select) => {
    //         empty(select);
    //         Pmgr.state.movies.forEach(m =>
    //             appendTo(select, `<option value="${m.id}">${m.name}</option>`));
    //     }
    // );
}

//
// PARTE 2:
// Código de pegamento, ejecutado sólo una vez que la interfaz esté cargada.
//

// modales, para poder abrirlos y cerrarlos desde código JS
const modalEditMovie = new bootstrap.Modal(document.querySelector('#movieEdit'));
const modalRateMovie = new bootstrap.Modal(document.querySelector('#movieRate'));
const modalMovieInfo = new bootstrap.Modal(document.querySelector('#movieInfo'));
const modalConfirmDelete = new bootstrap.Modal(document.querySelector('#confirmDelete'));

// si lanzas un servidor en local, usa http://localhost:8080/
const serverUrl = "http://gin.fdi.ucm.es/iu/";

Pmgr.connect(serverUrl + "api/");

// guarda el ID que usaste para hacer login en userId
let userId = -1;
const login = (username, password) => {
    Pmgr.login(username, password)
        .then(d => {
            console.log("login ok!", d);
            beforeLoginCleanup.forEach(lb => lb())
            userId = Pmgr.state.users.find(u =>
                u.username == username).id;
            update(d);
        })
        .catch(e => {
            console.log(e, `error ${e.status} en login (revisa la URL: ${e.url}, y verifica que está vivo)`);
            console.log(`el servidor dice: "${e.text}"`);
        });
}

// -- IMPORTANTE --
login("g4", "aGPrD"); // <-- tu nombre de usuario y password aquí
//   y puedes re-logearte como alguien distinto desde  la consola
//   llamando a login() con otro usuario y contraseña
{
    /** 
     * Asocia comportamientos al formulario de añadir películas 
     * en un bloque separado para que las constantes y variables no salgan de aquí, 
     * manteniendo limpio el espacio de nombres del fichero
     */
    const f = document.querySelector("#addMovie form");
    // botón de enviar
    f.querySelector("button[type='submit']").addEventListener('click', (e) => {
        if (f.checkValidity()) {
            e.preventDefault(); // evita que se haga lo normal cuando no hay errores
            nuevaPelicula(f); // añade la pelicula según los campos previamente validados
        }
    });

    /*
    // botón de generar datos (sólo para pruebas)
    f.querySelector("button.generar").addEventListener('click',
        (e) => generaPelicula(f)); // aquí no hace falta hacer nada raro con el evento
    */
}
{
    /**
     * formulario para modificar películas
     */
    const f = document.querySelector("#movieEditForm");
    // botón de enviar
    document.querySelector("#movieEdit button.edit").addEventListener('click', e => {
        console.log("enviando formulario!");
        if (f.checkValidity()) {
            modificaPelicula(f); // modifica la pelicula según los campos previamente validados
            let ratings = Pmgr.resolve(f.querySelector('input[name="id"]').value).ratings
            let ratingID = ratings.find(ratingID => Pmgr.resolve(ratingID).user == userId );
            if(!ratingID){
                nuevoRating(f)
            }
            else{
                modificaRating(f, ratingID);
            }
        } else {
            e.preventDefault();
            f.querySelector("button[type=submit]").click(); // fuerza validacion local
        }
    });
}
{
    /**
     * formulario para evaluar películas; usa el mismo modal para añadir y para editar
     */
    const f = document.querySelector("#movieRateForm");
    // botón de enviar
    document.querySelector("#movieRate button.edit").addEventListener('click', e => {
        console.log("enviando formulario!");
        if (f.checkValidity()) {
            if (f.querySelector("input[name=id]").value == -1) {
                nuevoRating(f);
            } else {
                modificaRating(f); // modifica la evaluación según los campos previamente validados
            }
        } else {
            e.preventDefault();
            f.querySelector("button[type=submit]").click(); // fuerza validacion local
        }
    });
    // activa rating con estrellitas
    stars("#movieRateForm .estrellitas");
}

/**
 * búsqueda básica de películas, por título
 */
document.querySelector("#movieSearch").addEventListener("input", e => {
    const v = e.target.value.toLowerCase();
    searchMovie(v)
})

document.querySelector("#submitSearch").addEventListener('click', e => {
    const v = document.querySelector("#movieSearch").value.toLowerCase()
    searchMovie(v)
})

//Edit movie
document.querySelector("#editMovieButton").addEventListener('click', e => {
    //Set editMovie details to existing ones
    let movieEditForm = document.querySelector("#movieEditForm")
    const movieId = e.target.getAttribute("data-id")
    var movie = Pmgr.resolve(movieId)

    movieEditForm.querySelector("input[name='id']").value = movie.id
    movieEditForm.querySelector("input[name='name']").value = movie.name
    movieEditForm.querySelector("input[name='imdb']").value = movie.imdb
    movieEditForm.querySelector("input[name='director']").value = movie.director
    movieEditForm.querySelector("input[name='actors']").value = movie.actors
    movieEditForm.querySelector("input[name='year']").value = movie.year
    movieEditForm.querySelector("input[name='minutes']").value = movie.minutes
    movieEditForm.querySelector("img").src = serverUrl + "poster/" + movie.imdb
    
    let userRatingID = movie.ratings.find(ratingID => Pmgr.resolve(ratingID).user == userId)
    if(userRatingID){
        let userRating = Pmgr.resolve(userRatingID)
        console.log("ratiaste")
        if(userRating.rating != -1){
            var modalUserRating = document.querySelectorAll('fieldset.estrellitas label input[name=myRating]')
            modalUserRating.forEach(element => {
                element.checked  = (element.value == userRating.rating)
            });
        }
        else{

        }
        var modalUserTags = document.querySelector('textArea[name=myLabels')
        modalUserTags.value = (userRating.labels.length > 0) ? userRating.labels : ""
    }

    modalMovieInfo.hide()
    modalEditMovie.show()
})

//Add movie
document.querySelector("#addMovieButton").addEventListener('click', e => {
    //Clear all existing input
    var movieEditForm = document.querySelector("#movieEditForm")
    movieEditForm.querySelector("img").src = "img/default-poster.jpg"
    movieEditForm.querySelectorAll("input").forEach(inp => {
        inp.value = ''
    })

    modalEditMovie.show()
})

//delete movie prompt
document.querySelector("#deleteEditingMovie").addEventListener('click',e=>{
    modalConfirmDelete.show()
})

//confirm movie deletion
document.querySelector("#confirmMovieDeletion").addEventListener('click',e=>{
    //Borrar la peli
    let movieEditForm = document.querySelector("#movieEditForm")
    let movieId = movieEditForm.querySelector("input[name='id']").value
    if(movieId != ''){
        Pmgr.rmMovie(movieId)
    }
    //Toast de borrado exitoso

    //hide modals
    modalConfirmDelete.hide()
    modalEditMovie.hide()
})

function rateBelongsAnyGroup(rating, groups){
	let raterGroups = Pmgr.state.users.find(usr => usr.id == rating.user).groups;
	return raterGroups.some(grp => groups.map(gr => gr.id).indexOf(grp) >= 0)
}

function searchMovie(title) {
    let criteria = null;
    //Los criterios solo se aplican si el Collapsable esta activo
    if (document.querySelector("#buttonAdvSearch[aria-expanded=true]") != null) {
        criteria = document.querySelector("#form-advSearch");
    }
    document.querySelectorAll("#movies div.col").forEach(c => {
		const m = Pmgr.resolve(c.dataset.id);
		let ok = m.name.toLowerCase().indexOf(title) >= 0;
		//Los criterios solo se aplican si el Collapsable esta activo
		if (criteria != null) {
			//Director
			const dirCrit = criteria.querySelector("#searchDirector").value
			if (dirCrit)
				ok = ok && (m.director.indexOf(dirCrit) >= 0)
			//Estos valores siempre serán válidos
			//Year
			const minYear = criteria.querySelector("#yearRangeStart").value;
			const maxYear = criteria.querySelector("#yearRangeEnd").value;
			ok = ok && (m.year <= maxYear && m.year >= minYear)
			//Length
			const minLength = criteria.querySelector("#lengthRangeStart").value;
			const maxLength = criteria.querySelector("#lengthRangeEnd").value;
			ok = ok && (m.minutes <= maxLength && m.minutes >= minLength)
			
			//Ratings
			let minRating = criteria.querySelector("#rateMin").value;
			let groupRateCtx = criteria.querySelector("#groupRateCtx").value.split(',');
			let groupFiltered = criteria.querySelector("#rateGroupSwitch").getAttribute("aria-expanded") == "true" &&
				groupRateCtx[0] != "";

			let groups = Pmgr.state.groups.filter(element => groupRateCtx.indexOf(element.name) >= 0)

			let totalValidRates = 0
			let calculatedRate = 0

			m.ratings.forEach(ratingID => {
				let rating = Pmgr.state.ratings.find(element => element.id == ratingID);
				let validRate = true;
				if (groupFiltered) {
					validRate = rateBelongsAnyGroup(rating,groups)

				}

				if (validRate) {
					if (rating.rating >= 0){
						totalValidRates++;
						calculatedRate += rating.rating
					}
				}
			})

			let finalRate = -1
			if (totalValidRates > 0)
				finalRate = Math.round(calculatedRate / totalValidRates)
			ok = ok && (finalRate) >= minRating


			//Tags
			let searchTags = criteria.querySelector("#tagList").value.split(',');

			let movieTags = [];
			let groupTagCtx = criteria.querySelector("#groupTagCtx").value.split(',');

			groupFiltered = criteria.querySelector("#tagGroupSwitch").getAttribute("aria-expanded") == "true" &&
				groupTagCtx[0] != "";

			groups = Pmgr.state.groups.filter(element => groupTagCtx.indexOf(element.name) >= 0)


			m.ratings.forEach(ratingID => {
				//Comprobar que el rating pertenece a un miembro del uno de los grupos indicados
				let rating = Pmgr.state.ratings.find(element => element.id == ratingID)
				let validCtx = true;
				if (groupFiltered) {
					validCtx = rateBelongsAnyGroup(rating,groups)
				}

				if (validCtx && rating.labels) {
					rating.labels.split(',').forEach(label => {
						movieTags.push(label)
					});
				}
			});
			if (searchTags[0] != "") {
				let i = 0;
				while (i < searchTags.length && (movieTags.indexOf(searchTags[i].trim()) >= 0)) {
					i++;
				}
				let fitsTags = (i >= searchTags.length);
				ok = ok && fitsTags;
			}
		}
		// aquí podrías aplicar muchos más criterios
		c.style.display = ok ? '' : 'none';
	});
}

// cosas que exponemos para poder usarlas desde la consola
//TODO usar un foreach para ocultar los modales cuando despliegas
window.modalEditMovie = modalEditMovie;
window.modalRateMovie = modalRateMovie;
window.modalMovieInfo = modalMovieInfo;
window.modalConfirmDelete = modalConfirmDelete;
window.update = update;
window.login = login;
window.userId = ()=>userId;
window.Pmgr = Pmgr;


const beforeLoginCleanup = [
	() => {
		document.querySelector("#tagGroupSwitch").checked = false;
		document.querySelector("#rateGroupSwitch").checked = false;
	},
]

// ejecuta Pmgr.populate() en una consola para generar datos de prueba en servidor
// ojo - hace *muchas* llamadas a la API (mira su cabecera para más detalles)
// Pmgr.populate();