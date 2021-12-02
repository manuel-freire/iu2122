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

function createMovieItem(movie) {
    return `
    <div class="card">
    <div class="card-header"">
        <h4 class="mb-0" title="${movie.id}">
            ${movie.name} <small><i>(${movie.year})</i></small>
        </h4>
    </div>

    <div>
        <div class="card-body pcard">
            <div class="row">
                <div class="col-auto">
                    <img class="iuthumb" src="${serverUrl}poster/${movie.imdb}"/>
                </div>
                <div class="col">
                    <div class="row-sm-11">
                    ${movie.director} / ${movie.actors} (${movie.minutes} min.)
                    </div>
                    <div class="row-sm-1 iucontrol movie">
                        <button class="rm" data-id="${movie.id}">🗑️</button>
                        <button class="edit" data-id="${movie.id}">✏️</button>
                    </div>                    
                </div>
            </div>
        </div>
    </div>
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

//CREATED
/**
 * Usa valores de un formulario para añadir una película
 * @param {Element} formulario para con los valores a subir
 */
 function nuevoGrupo(formulario) {
    const group = new Pmgr.Group(-1,
        formulario.querySelector('input[name="name"]').value,
        formulario.querySelector('input[name="propietario"]').value);
    Pmgr.addGroup(group).then(() => {
        formulario.reset() // limpia el formulario si todo OK
        update();
    });
}

//END CREATED
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
        Pmgr.state.groups.forEach(o => appendTo("#groups", createGroupItem(o)));
        Pmgr.state.users.forEach(o => appendTo("#users", createUserItem(o)));

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
        // botones de borrar grupos
        document.querySelectorAll(".iucontrol.group button.rm").forEach(b =>
            b.addEventListener('click', e => Pmgr.rmGroup(e.target.dataset.id).then(update)));
        // botones de borrar usuarios
        document.querySelectorAll(".iucontrol.user button.rm").forEach(b =>
            b.addEventListener('click', e => Pmgr.rmUser(e.target.dataset.id).then(update)));


    } catch (e) {
        console.log('Error actualizando', e);
    }

    /* para que siempre muestre los últimos elementos disponibles */
    activaBusquedaDropdown('#dropdownBuscablePelis',
        (select) => {
            empty(select);
            Pmgr.state.movies.forEach(m =>
                appendTo(select, `<option value="${m.id}">${m.name}</option>`));
        }
    );
}

//
// PARTE 2:
// Código de pegamento, ejecutado sólo una vez que la interfaz esté cargada.
//

// modales, para poder abrirlos y cerrarlos desde código JS
const modalEditMovie = new bootstrap.Modal(document.querySelector('#movieEdit'));

// si lanzas un servidor en local, usa http://localhost:8080/
const serverUrl = "http://gin.fdi.ucm.es/iu/";

Pmgr.connect(serverUrl + "api/");

Pmgr.login("g01", "aa") // <-- tu nombre de usuario y password aquí
    .then(d => {
        console.log("login ok!", d);
        update(d);
    })
    .catch(e => {
        console.log(e, `error ${e.status} en login (revisa la URL: ${e.url}, y verifica que está vivo)`);
        console.log(`el servidor dice: "${e.text}"`);
    });

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
    // botón de generar datos (sólo para pruebas)
    f.querySelector("button.generar").addEventListener('click',
        (e) => generaPelicula(f)); // aquí no hace falta hacer nada raro con el evento
} {
    /**
     * formulario para modificar películas
     */
    const f = document.querySelector("#movieEditForm");
    // botón de enviar
    document.querySelector("#movieEdit button.edit").addEventListener('click', e => {
        console.log("enviando formulario!");
        if (f.checkValidity()) {
            modificaPelicula(f); // modifica la pelicula según los campos previamente validados
        } else {
            e.preventDefault();
            f.querySelector("button[type=submit]").click(); // fuerza validacion local
        }
    });
}

// cosas que exponemos para poder usarlas desde la consola
window.modalEditMovie = modalEditMovie;
window.update = update;
window.Pmgr = Pmgr;

// ejecuta Pmgr.populate() en una consola para generar datos de prueba en servidor
// ojo - hace *muchas* llamadas a la API (mira su cabecera para más detalles)
// Pmgr.populate();