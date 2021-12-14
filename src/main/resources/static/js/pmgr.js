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

"use strict"

import * as Pmgr from './pmgrapi.js';

const serverUrl = "http://gin.fdi.ucm.es/iu/";

function empty(sel) {
    const destino = document.querySelector(sel);
    while (destino.firstChild) {
        destino.removeChild(destino.firstChild);
    }
}

function  hide (sel) {
    const destino = document.querySelector(sel);
    destino.classList.add("d-none");
}

function appendTo (sel, html) {
    document.querySelector(sel).insertAdjacentHTML("beforeend", html);
}


let userId = -1;
const login = (username, password) => {
    Pmgr.login(username, password)
        .then(msg => {
            console.info("Pmgr.login says: ", msg);
            userId = Pmgr.state.users.find(u => u.username == username).id;
            update();
            console.info("Logged in as ", username);
        })
        .catch(e => {
            console.error('Error ', e.status, ': ', e.text);
        });
}

const createMovieItem = (movie) => {
    const r2s = r => r > 0 ? Pmgr.Util.fill(r, () => "⭐").join("") : "";
    const ratings = movie.ratings.map(id => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${r.user == userId ? "primary" : "secondary"}">
        ${Pmgr.resolve(r.user).username}: ${r.labels} ${r2s(r.rating)}
        </span>
        `
    ).join("");

    return `
    <div class="col-sm-3 d-flex align-items-stretch">
    <div class="card mx-4 my-3" data-id="${movie.id}">
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
    </div>
    </div>
 `;
}

const createGroupItem = (group) => {
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
    <div class="col-sm-3 ">
    <div class="card mx-4 my-3" data-id="${group.id}">
    <div class="card-body pcard">
    <div class="card-header">
        <h4 class="mb-0" title="${group.id}">
            ${group.name} 
            <br>
            <span class="badge badge-pill bg-success"><small>${group.members.length} 🙍</small></span>
        </h4>
    </div>
    <div class="card-body pcard">
        <h7 class="mb-0">Administrador: </h7>
        <span class="badge bg-primary">${Pmgr.resolve(group.owner).username}</span>
        <details>
            <summary>Detalles</summary>
            <div class="row-sm-11">
            <h7 class="mb-0"">Usuarios: </h7>
            <br>
            ${allMembers}
            <br>
            <h7 class="mb-0"">Solicitudes de Unión: </h7>
            <br>
            ${allPending}
        </div>
        </details>
        <br>
        <div class="row-sm-1 iucontrol group">
        <button class="rm" data-id="${group.id}">🗑️</button>
            <button class="edit" data-id="${group.id}">✏️</button>
        </div>
    </div>              
    </div>
    </div>
    `;
}

const createUserItem = (user) => {
    // let allGroups = user.groups.map((id) =>
    //     `<span class="badge bg-secondary">${Pmgr.resolve(id).name}</span>`
    // ).join(" ");
    // const waitingForGroup = r => r.status.toLowerCase() == Pmgr.RequestStatus.AWAITING_GROUP;
    // let allPending = user.requests.map((id) => Pmgr.resolve(id)).map(r =>
    //     `<span class="badge bg-${waitingForGroup(r) ? "warning" : "info"}"
    //         title="Esperando aceptación de ${waitingForGroup(r) ? "grupo" : "usuario"}">
    //         ${Pmgr.resolve(r.group).name}</span>`
    // ).join(" ");

    let role = "User";
    let color = "";
    let button = "btn-primary"
    if (user.role.split(",").includes("ADMIN")) {
        role = "Admin";
        color = "bg-success text-light";
        button = "btn-warning"
    }
    if (user.role.split(",").includes("ROOT")) {
        role = "Root";
        color = "bg-danger";
        button = "btn-dark";
    }

    return `<li title="${user.id}" data-role="${role}" class="list-group-item d-flex justify-content-between align-items-start ${color}">
                <div class="ms-2 me-auto">
                <div class="fw-bold">${user.username}</div>
                        ${role}
                </div>
                <button type="button" class="btn ${button}" data-id="${user.id}">View</button>
            </li>
            `;

    //<button class="rm" data-id="${user.id}">🗑️</button>
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
    const rating = new Pmgr.Rating(-1,
        formulario.querySelector('input[name="user"]').value,
        formulario.querySelector('input[name="movie"]').value,
        formulario.querySelector('input[name="rating"]:checked').value,
        formulario.querySelector('input[name="labels"]').value);
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
function modificaRating(formulario) {
    const rating = new Pmgr.Rating(
        formulario.querySelector('input[name="id"]').value,
        formulario.querySelector('input[name="user"]').value,
        formulario.querySelector('input[name="movie"]').value,
        formulario.querySelector('input[name="rating"]:checked').value,
        formulario.querySelector('input[name="labels"]').value);
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

const update_profile = (actualUser) => {

    console.log({ actualUser });

    appendTo('#title_profile', `MY PROFILE`)

    appendTo('#id_profile',
        `<div class="row g-2">
        <div class="col-md">
          <div class="form-floating">
            <input type="word" class="form-control" disabled id="floatingInputGrid" placeholder="Id" value="${actualUser.id}">
            <label for="floatingInputGrid">Id</label>
          </div>
        </div>`)

    appendTo('#user_profile',
        `<div class="row g-2">
        <div class="col-md">
          <div class="form-floating">
            <input type="user" class="form-control" disabled id="floatingInputGrid" placeholder="User Name" value="${actualUser.username}">
            <label for="floatingInputGrid">User Name</label>
          </div>
        </div>`)

    appendTo('#password_profile',
        `<div class="row g-2">
        <div class="col-md">
          <div class="form-floating">
            <input type="word" class="form-control" disabled id="floatingInputGrid" placeholder="Password" value="${actualUser.password}">
            <label for="floatingInputGrid">Password</label>
          </div>
        </div>`)

    appendTo('#role_profile',
        `<div class="row g-2">
        <div class="col-md">
          <div class="form-floating">
            <input type="word" class="form-control" disabled id="floatingInputGrid" placeholder="Role" value="${actualUser.role.split(",")[0]}">
            <label for="floatingInputGrid">Role</label>
          </div>
        </div>`)

    appendTo('#groups_profile',
        `<div class="row g-2">
        <div class="col-md">
          <div class="form-floating">
            <input type="word" class="form-control" disabled id="floatingInputGrid" placeholder="Groups" value="${actualUser.groups}">
            <label for="floatingInputGrid">Groups</label>
          </div>
        </div>`)

    console.log(actualUser);
}

const update = () => {

    try {

        let state = Pmgr.state;

        const lists =
            ['home_row',
                'group_row',
                'user_list'
            ];

        const views =
            ['group_view',
                'help_view',
                'user_view',
                'search_view',
                'profile_view',
                'home_view'
            ];

        lists.forEach(e => empty('#' + e));

        document.querySelectorAll(".nav_input").forEach(button => {
            button.addEventListener('click', e => {

                views.forEach(e => hide('#' + e));
                switch (e.target.dataset.id) {
                    case "groups":
                        document.querySelector("#group_view").classList.remove("d-none");
                        break;
                    case "help":
                        document.querySelector("#help_view").classList.remove("d-none");
                        break;
                    case "users":
                        document.querySelector("#user_view").classList.remove("d-none");
                        break;
                    case "search":
                        document.querySelector("#search_view").classList.remove("d-none");
                        break;
                    case "profile":
                        document.querySelector("#profile_view").classList.remove("d-none");
                        break;
                    case "home":
                    default:
                        document.querySelector("#home_view").classList.remove("d-none");
                        break;
                }
            });
        });

        state.movies.forEach(movie => appendTo('#home_row', createMovieItem(movie)));
        state.groups.forEach(group => appendTo('#group_row', createGroupItem(group)));
        state.users.forEach(user => appendTo('#user_list', createUserItem(user)));
        let currentUser = state.users.find(e => e.id == userId);
        update_profile(currentUser);

        // botones de borrar grupos AQUI SI
        document.querySelectorAll(".iucontrol.group button.rm").forEach(b =>
            b.addEventListener('click', e => Pmgr.rmGroup(e.target.dataset.id).then(update)));

    } catch (e) {
        console.error("Error updating: ", e);
    }
}



window.update = update;
window.login = login;
window.user_id = userId;
window.Pmgr = Pmgr;



const username = 'g2';
const password = 'eSMDK';
const url = serverUrl + 'api/';
Pmgr.connect(url);
login(username, password);