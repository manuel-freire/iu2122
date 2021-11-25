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
    const rid = 'x_' + Math.floor(Math.random() * 1000000);
    const hid = 'h_' + rid;

    return `
    <div class="card">
    <div class="card-header" id="${hid}">
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
                    ${movie.director} / ${movie.actors} (${movie.minutes} min.)            
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
    let allPending = group.requests.map((id) => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${r.status == Pmgr.RequestStatus.AWAITING_GROUP ? "warning" : "info"}">${Pmgr.resolve(r.user).username}</span>`
    ).join(" ");

    return `
    <div class="card">
    <div class="card-header">
        <h4 class="mb-0" title="${group.id}">
            <b class="pcard">${group.name}</b>
        </h4>
    </div>
    <div class="card-body pcard">
        <span class="badge bg-primary">${Pmgr.resolve(group.owner).username}</span>
        ${allMembers}
        ${allPending}
    </div>
    </div>
`;
}

function createUserItem(user) {
    let allGroups = user.groups.map((id) =>
        `<span class="badge bg-secondary">${Pmgr.resolve(id).name}</span>`
    ).join(" ");
    let allPending = user.requests.map((id) => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${r.status == Pmgr.RequestStatus.AWAITING_GROUP ? "warning" : "info"}">${Pmgr.resolve(r.group).name}</span>`
    ).join(" ");

    return `
    <div class="card">
    <div class="card-header">
        <h4 class="mb-0" title="${user.id}">
            <b class="pcard">${user.username}</b>
        </h4>
    </div>
    <div class="card-body pcard">
         ${allGroups}
         ${allPending}
    </div>
    </div>
`;
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
// por ejemplo, Pmgr.addGroup({"name": "nuevoGrupo"}).then(update()); // <--
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
const serverUrl = "http://localhost:8080/";
Pmgr.connect(serverUrl + "api/");
Pmgr.login("g02", "g02")
    .then(d => {
        console.log("login ok!", d);
        update(d);

        // Pmgr.populate(); -- genera datos de prueba, usar sólo 1 vez
    })
    .catch(e => {
        console.log(e, `error ${e.status} en login (revisa la URL: ${e.url}, y verifica que está vivo)`);
        console.log(`el servidor dice: "${e.text}"`);

        //Pmgr.populate();
    });

// cosas que exponemos para usarlas desde la consola
window.update = update;
window.P = Pmgr;
window.cgi = createGroupItem;