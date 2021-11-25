# iu2122

Servidor y código de plantilla para una interfaz de gestión de valoraciones de películas, a usar para las prácticas de la asignatura *Interfaces de Usuario* de los grados de Informática de la Universidad Complutense, en su edición 2021-22.

## Práctica

Implementa la interfaz que propusiste en tu Práctica 5 (Diseño de una GUI) usando Boostrap 5, *sin* JQuery. Tendrás que usar
- HTML
- JavaScript
- CSS

Para ello, haz un "fork" de este proyecto, y toca únicamente los siguientes ficheros y directorios (todos ellos bajo [main/src/main/resources/static](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/static/)):
- [index.html](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/static/index.html), donde escribirás todo el HTML estático (es decir, el que existe al cargar la página, en lugar de generarse dinámicamente vía `pmgr.js`)
- [js/pmgr.js](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/static/js/pmgr.js), donde escribirás todo el JS que genera HTML y realiza peticiones a la [API](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/static/js/pmgrapi.js) para interactuar con el servidor. *Por favor, no modifiques la API en sí*.
- [css/custom.css](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/static/css/custom.js), donde escribirás reglas CSS para estilar tu página tal y como quieres, modificando los estilos por defecto de Bootstrap 5.
- Puedes incorporar css/scripts/imágenes en sus respectivas carpetas (`css`, `js`, `img`). **Evita** introducir dependencias a código externo, entendido como código que cargas de fuera de tu aplicación. Sí puedes (si su licencia lo permite) introducir dependencias copiándolas a las respectivas carpetas, previa consulta al profesor.

### Entorno de desarrollo

Necesitarás un servidor local para lanzar tu página. Hay muchos disponibles:
- si tienes PHP instalado, puedes, desde la carpeta `static`, lanzar `php -S localhost:8000` (y luego abres un navegador apuntando a localhost:8000`)
- si tienes Python3 instalado, puedes usar, desde la carpeta `static`, `python -m http.server 8000` (y luego abres un navegador apuntando a localhost:8000`)
- (recomendado) si usas VS Code, puedes instalar la extensión "Live Server", y lanzar el servidor vía click derecho desde `index.html` + `Open with Live Server`.

## Resto del código

La aplicación de servidor funciona con Spring Boot, y puedes lanzarla en local y/o jugar con ella libremente. Para lanzarla, necesitarás tener `maven` y una JDK >= 8.0 instaladas. Basta con ejecutar `mvn spring-boot:run` para lanzar todo en local. Archivos importantes:
- Configuración de la aplicación: [application.properties](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/application.properties)
- Contraseñas y contenido inicial de la BD: [import.sql](https://github.com/manuel-freire/iu2122/blob/main/src/main/resources/import.sql)

*El profesor proporcionará un servidor (con configuración cambiada con respecto a la anterior) que permanecerá encendido hasta el fin de las prácticas de la asignatura. Lanzar o no otro servidor en local, o jugar con el codigo, es completamente opcional. Ver [licencia](https://github.com/manuel-freire/iu2122/blob/main/LICENSE)*

