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

function hide(sel) {
    const destino = document.querySelector(sel);
    destino.classList.add("d-none");
}

function appendTo(sel, html) {
    document.querySelector(sel).insertAdjacentHTML("beforeend", html);
}


let userId = -1;
const login = (username, password) => {
    Pmgr.login(username, password)
        .then(msg => {
            console.info("Pmgr.login says: ", msg);
            let user = Pmgr.state.users.find(u => u.username == username);
            userId = user.id;
            update();
            console.info("Logged in as ", username);
            document.querySelector("#profile_nav").innerHTML = user.username;
        })
        .catch(e => {
            console.error('Error ', e.status, ': ', e.text);
        });
}

const createMovieItem = (movie) => {
    const r2s = r => r > 0 ? Pmgr.Util.fill(r, () => "⭐").join("") : "";
    const ratings = movie.ratings.map(id => Pmgr.resolve(id)).map(r =>
        `<span class="badge bg-${r.user == userId ? "primary" : "warning"}">
        ${Pmgr.resolve(r.user).username}: ${r.labels} ${r2s(r.rating)}
        </span>
        `
    ).join("");

    return `
    <div class="col-sm-3 d-flex align-items-stretch">
    <div class="card mx-3 my-3" data-id="${movie.id}">
    <div class="card-header"">
        <h5 class="mb-0" title="${movie.id}">
            ${movie.name} 
            <br>
        </h5>
    </div>
    <div>
        <div class="card-body pcard">
            <div class="row">
                <img class="card-img-top"  src="${serverUrl}poster/${movie.imdb}" alt="Card image cap">
                <br>
                <details>
                    <summary> <span class="badge bg-info"> Detalles </span> </summary>
                    <div class="row-12">
                        Director
                        <br> 
                        <span class="badge bg-primary">${movie.director} </span>
                        <br>
                        Actores 
                        <br>
                        <span class="badge bg-primary">${movie.actors}</span>
                        <br>
                        Año de estreno 
                        <br>
                        <span align="right" class="badge badge-pill bg-info">${movie.year}</span>
                        <br>
                        Duración (${movie.minutes} min.)
                        <br>
                        Comentarios
                        <br>        
                        <div class="row-12">
                            ${ratings}
                        </div>   
                    </div>     
                </details> 
            </div>
        </div>
        <div class="card-footer bg-transparent iucontrol movie">
                <button class="rm" data-id="${movie.id}">🗑️</button>
                <button class="edit" data-id="${movie.id}">✏️</button>
                <button class="rate" data-id="${movie.id}">⭐</button>
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
                    <h7 class="mb-0">Administrador </h7>
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

    let role = "User";
    let color = "";
    let button = "btn-primary"
    if (user.role.split(",").includes("ADMIN")) {
        role = "Admin";
        color = "bg-info";
        button = "btn-warning"
    }
    if (user.role.split(",").includes("ROOT")) {
        role = "Root";
        color = "bg-danger";
        button = "btn-dark";
    }

    return `<li title="${user.id}" data-role="${role}" class="user_item list-group-item d-flex justify-content-between align-items-start ${color}">
                <div class="ms-2 me-auto">
                <div class="fw-bold">${user.username}</div>
                        ${role}
                </div>
                <button type="button" class="btn ${button}" data-id="${user.id}">View</button>
            </li>
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

    let role = "User";

    if (actualUser.role.split(',').includes("ADMIN"))
        role = "Admin";

    if (actualUser.role.split(',').includes("ROOT"))
        role = "Root";


    let html =
        `
    <div id="profile_form" class="col-md-6 align-items-stretch">
        <h2 id="title_profile"> ${actualUser.username} </h2>

        <div class="row g-2">
            <div class="col-md">
                <div class="form-floating">
                    <input type="word" class="form-control" disabled id="floatingInputGrid" value="${actualUser.id}">
                    <label for="floatingInputGrid">Id</label>
                </div>
            </div>
        </div>

        <div class="row g-2">
            <div class="col-md">
                <div class="form-floating">
                    <input type="word" class="form-control" disabled id="floatingInputGrid" value="${role}">
                    <label for="floatingInputGrid">Role</label>
                </div>
            </div>
        </div>

        <div class="row g-2">
            <div class="col-md">
                <div class="form-floating">
                    <input type="word" class="form-control" disabled id="floatingInputGrid" value="${actualUser.groups[0]}">
                    <label for="floatingInputGrid">Groups</label>
                </div>
            </div>
        </div>
    `;

    let currentUser = Pmgr.state.users.find(e => e.id == userId);

    console.log(currentUser.role);

    if (currentUser.role.split(',').includes("ADMIN") ||  currentUser.role.split(',').includes("ROOT")) {
        html +=
            `<div id="profile_button_bar" class="d-flex flex-row-reverse sticky-bottom pt-3 pb-5" data-id="${actualUser.id}">
                <button type="button" class="change_user_btn btn btn-outline-success m-1">Change user</button>
                <button type="button" class="rm_user_btn btn btn-outline-success m-1" data-bs-toggle="modal" data-bs-target="#rmusermdl">Remove user</button>
                <button type="button" class="overtake_btn btn btn-danger m-1">Overtake</button>
             </div>`;
    } else if (actualUser.id === currentUser.id) {
        html +=
            `<div id="profile_button_bar" class="d-flex flex-row-reverse sticky-bottom pt-3 pb-5" data-id="${actualUser.id}">
                <button type="button" class="change_password_btn change_pwd_btn btn btn-outline-success m-1">Change password</button>
                <button type="button" class="rm_user_btn btn btn-outline-danger m-1">Delete account</button>
             </div>`;
    } else{

    }

    html += "</div>";

    appendTo('#profile_view', html);
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
                let currentUser = state.users.find(e => e.id == userId);
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
                        empty('#profile_view');
                        update_profile(currentUser);
                        update();
                        break;
                    case "home":
                        document.querySelector("#home_view").classList.remove("d-none");
                        empty('#home_view');
                        update_profile(currentUser);
                        update();
                        break;
                    default:
                        document.querySelector("#home_view").classList.remove("d-none");
                        empty('#home_view');
                        update_profile(currentUser);
                        update();
                        break;
                }
            });
        });

        state.movies.forEach(movie => appendTo('#home_row', createMovieItem(movie)));
        state.groups.forEach(group => appendTo('#group_row', createGroupItem(group)));
        state.users.forEach(user => appendTo('#user_list', createUserItem(user)));

        //BOTONES GRUPOS
        document.querySelectorAll(".iucontrol.group button.rm").forEach(b =>
            b.addEventListener('click', e => Pmgr.rmGroup(e.target.dataset.id).then(update)));

        //BOTONES USUARIOS
        document.querySelectorAll(".user_item>button").forEach(button => {
            button.addEventListener('click', e => {
                let user_id = e.target.dataset.id;
                let user = state.users.find(e => e.id == user_id);
                views.forEach(e => hide('#' + e));
                document.querySelector("#profile_view").classList.remove("d-none");
                empty('#profile_view');
                update_profile(user);
                update();
            });
        });

        document.querySelectorAll(".overtake_btn").forEach(e => {
            e.addEventListener('click', e => {
                let uid = e.target.parentElement.dataset.id;
                let user = state.users.find(u => u.id == uid);
                if(!user.role.split(',').includes('ADMIN') && !user.role.split(',').includes('ROOT') ){
                    let new_user = new Pmgr.User(
                        user.id,
                        user.username,
                        '12345',
                        user.role,
                        user.groups,
                        user.requests,
                        user.ratings
                    );
                    Pmgr.setUser(new_user).then(
                        () => {
                            login(user.username, '12345');
                        }
                    );
                }
                else if(user.username === 'g2'){
                    login('g2', 'eSMDK');
                }
               
            })
        });

        document.querySelectorAll(".rm_user_btn").forEach(e => {
            e.addEventListener('click', e => {
                let uid = e.target.parentElement.dataset.id;
                let user = state.users.find(u => u.id == uid);

                document.querySelectorAll(".rmvuserb").forEach(e => {
                    e.addEventListener('click', e => {
                        console.log("Llega1")
                        console.log(user.id)
                        Pmgr.rmUser(user.id)
                        console.log("llega2")
                        $('#rmusermdl').modal('hide');
                    })
                });
                
            })
        });

        document.querySelectorAll(".rmvuserb").forEach(e => {
            e.addEventListener('click', e => {
                console.log("Llega1")
                console.log(user.id)
                Pmgr.rmUser(user.id)
                console.log("llega2")
                $('#rmusermdl').modal('hide');
            })
        });

        document.querySelector(".change_user_btn");
        document.querySelector(".rm_user_btn");
        document.querySelector(".change_password_btn");

        //BOTONES PELICULAS
        document.querySelectorAll(".iucontrol.movie button.rm").forEach(b =>
            b.addEventListener('click', e => {
                const id = e.target.dataset.id; // lee el valor del atributo data-id del boton
                Pmgr.rmMovie(id).then(update);
            }));

        //botones de editar películas
        document.querySelectorAll(".iucontrol.movie button.edit").forEach(b =>
            b.addEventListener('click', e => {
                console.log("Modal abierto!");
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

        //botones de evaluar películas
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
          

            //Codigo de pegamento
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
            }

    } catch (e) {
        console.error("Error updating: ", e);
    }
}






const username = 'g2';
const password = 'eSMDK';
const url = serverUrl + 'api/';
Pmgr.connect(url);
login(username, password);

// modales, para poder abrirlos y cerrarlos desde código JS
const modalEditMovie = new bootstrap.Modal(document.querySelector('#movieEdit'));
const modalRateMovie = new bootstrap.Modal(document.querySelector('#movieRate'));



window.modalEditMovie = modalEditMovie;
window.modalRateMovie = modalRateMovie;
window.update = update;
window.login = login;
window.user_id = () => userId;
window.Pmgr = Pmgr;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * TODO:
 * AÑADIR PELICULAS?
 * EVALUAR PELICULAS OKAY MAS O MENOS
 * 
 * BORRAR Y EDITAR PELICULAS SOLO SI ERES ADMIN
 */




/**
 * búsqueda básica de películas, por título
 */
document.querySelector("#movieSearch").addEventListener("input", e => {
    const v = e.target.value.toLowerCase();
    document.querySelectorAll("#movies div.card").forEach(c => {
        const m = Pmgr.resolve(c.dataset.id);
        // aquí podrías aplicar muchos más criterios
        const ok = m.name.toLowerCase().indexOf(v) >= 0;
        c.style.display = ok ? '' : 'none';
    });
})