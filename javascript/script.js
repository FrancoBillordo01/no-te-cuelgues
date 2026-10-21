// Conexión con Supabase
const supabaseUrl = "https://fjntkmjzojceaoegdarb.supabase.co";
const supabaseKey = "sb_publishable_fPlyjwCM3UfOGsXhH3g_vQ_gCOFhl8H";

const baseDatos = supabase.createClient(supabaseUrl, supabaseKey);

// Elementos de las páginas
const formulario = document.getElementById("formulario-cumple");
const mensaje = document.getElementById("mensaje-formulario");

const lista = document.querySelector(
    ".lista-cumpleanos, .lista-cumpleaños"
);

const botonGuardar = formulario?.querySelector('button[type="submit"]');

const cumpleañosRegistrados = [];

const meses = [
    "enero", "febrero", "marzo", "abril",
    "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre"
];

// Calcular los días hasta el próximo cumpleaños
function calcularDiasRestantes(dia, mes) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let año = hoy.getFullYear();
    let fechaCumple = new Date(año, mes - 1, dia);

    if (fechaCumple < hoy) {
        año += 1;
        fechaCumple = new Date(año, mes - 1, dia);
    }

    // En años no bisiestos, el 29 de febrero se cuenta como 1 de marzo.
    // Usamos UTC para contar días sin diferencias por cambios de horario.
    const inicio = Date.UTC(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
    );

    const fin = Date.UTC(
        fechaCumple.getFullYear(),
        fechaCumple.getMonth(),
        fechaCumple.getDate()
    );

    return Math.round((fin - inicio) / (1000 * 60 * 60 * 24));
}

// Mostrar un aviso dentro de la lista
function mostrarAviso(texto) {
    if (!lista) {
        return;
    }

    const aviso = document.createElement("p");
    aviso.className = "estado-vacio";
    aviso.textContent = texto;

    lista.replaceChildren(aviso);
}

// Ordenar y mostrar las tarjetas
function mostrarCumpleaños() {
    if (!lista) {
        return;
    }

    cumpleañosRegistrados.sort(function (a, b) {
        return a.diasRestantes - b.diasRestantes;
    });

    lista.textContent = "";

    if (cumpleañosRegistrados.length === 0) {
        mostrarAviso(
            "Todavía no hay cumpleaños. ¡Sé el primero en anotarte!"
        );
        return;
    }

    const menorCantidadDias = cumpleañosRegistrados[0].diasRestantes;

    cumpleañosRegistrados.forEach(function (registro) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-cumple";

        const informacion = document.createElement("div");
        informacion.className = "cumple-info";

        const nombre = document.createElement("h3");
        nombre.textContent = registro.nickname;

        const fecha = document.createElement("p");
        fecha.className = "cumple-fecha";
        fecha.textContent = `${registro.dia} de ${meses[registro.mes - 1]}`;

        const contador = document.createElement("div");
        contador.className = "cumple-contador";

        const numero = document.createElement("strong");
        const detalle = document.createElement("span");

        // Destacar los cumpleaños más cercanos
        if (registro.diasRestantes === menorCantidadDias) {
            tarjeta.classList.add("proximo");

            const etiqueta = document.createElement("span");
            etiqueta.className = "cumple-etiqueta";

            etiqueta.textContent = registro.diasRestantes === 0
                ? "HOY SE FESTEJA"
                : "PRÓXIMO CUMPLE";

            informacion.appendChild(etiqueta);
        }

        if (registro.diasRestantes === 0) {
            tarjeta.classList.add("cumple-hoy");
            numero.textContent = "HOY";
            detalle.textContent = "¡Mandale un saludo! 🎂";
        } else {
            numero.textContent = registro.diasRestantes;
            detalle.textContent = registro.diasRestantes === 1
                ? "día para su cumple"
                : "días para su cumple";
        }

        informacion.appendChild(nombre);
        informacion.appendChild(fecha);

        contador.appendChild(numero);
        contador.appendChild(detalle);

        tarjeta.appendChild(informacion);
        tarjeta.appendChild(contador);

        lista.appendChild(tarjeta);
    });
}

// Cargar los registros desde Supabase
async function cargarCumpleaños() {
    if (!lista) {
        return;
    }

    mostrarAviso("Cargando cumpleaños…");

    try {
        const { data, error } = await baseDatos
            .from("cumpleanos")
            .select("nickname, dia, mes");

        if (error) {
            throw error;
        }

        cumpleañosRegistrados.length = 0;

        data.forEach(function (registro) {
            cumpleañosRegistrados.push({
                nickname: registro.nickname,
                dia: registro.dia,
                mes: registro.mes,
                diasRestantes: calcularDiasRestantes(
                    registro.dia,
                    registro.mes
                )
            });
        });

        mostrarCumpleaños();
    } catch (error) {
        mostrarAviso(
            "No pudimos cargar los cumpleaños. Recargá para intentar de nuevo."
        );

        console.error("Error al cargar:", error);
    }
}

// Validar y guardar desde la página de registro
formulario?.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (botonGuardar.disabled) {
        return;
    }

    const nickname = document.getElementById("nickname").value.trim();
    const dia = Number(document.getElementById("dia").value);
    const mes = Number(document.getElementById("mes").value);

    // Validar el nickname
    if (nickname === "" || nickname.length > 30) {
        mensaje.textContent = "Escribí un nickname de entre 1 y 30 caracteres.";
        return;
    }

    // Validar la fecha usando un año bisiesto
    const fechaPrueba = new Date(2000, mes - 1, dia);

    if (
        !Number.isInteger(dia) ||
        !Number.isInteger(mes) ||
        mes < 1 ||
        mes > 12 ||
        fechaPrueba.getMonth() !== mes - 1 ||
        fechaPrueba.getDate() !== dia
    ) {
        mensaje.textContent = "Esa fecha no existe. Revisá el día y el mes.";
        return;
    }

    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando…";
    mensaje.textContent = "";

    try {
        const { error } = await baseDatos
            .from("cumpleanos")
            .insert({
                nickname: nickname,
                dia: dia,
                mes: mes
            });

        if (error) {
            throw error;
        }

        mensaje.textContent = `¡Listo, ${nickname}! Tu cumpleaños quedó guardado.`;
        formulario.reset();

        await cargarCumpleaños();
    } catch (error) {
        mensaje.textContent = "No pudimos guardar el cumpleaños. Intentá de nuevo.";
        console.error("Error al guardar:", error);
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent = "Guardar mi cumple";
    }
});

// Cargar la agenda cuando se abre la página
cargarCumpleaños();
// Formularios de acceso
const formularioCuenta = document.getElementById("formulario-cuenta");
const formularioLogin = document.getElementById("formulario-login");

// Crear una cuenta
formularioCuenta?.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const boton = formularioCuenta.querySelector('button[type="submit"]');
    const aviso = document.getElementById("mensaje-cuenta");

    if (boton.disabled) {
        return;
    }

    const nickname = document.getElementById("cuenta-nickname").value.trim();
    const email = document.getElementById("cuenta-email").value.trim();
    const password = document.getElementById("cuenta-password").value;

    if (nickname.length === 0 || nickname.length > 30) {
        aviso.textContent = "Escribí un nickname de entre 1 y 30 caracteres.";
        return;
    }

    if (password.length < 8) {
        aviso.textContent = "La contraseña debe tener al menos 8 caracteres.";
        return;
    }

    boton.disabled = true;
    boton.textContent = "Creando cuenta…";
    aviso.textContent = "";

    try {
        const { data, error } = await baseDatos.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nickname: nickname
                },
                emailRedirectTo:
                    "https://francobillordo01.github.io/no-te-cuelgues/"
            }
        });

        if (error) {
            throw error;
        }

        formularioCuenta.reset();
    if (data.session) {
        aviso.textContent = "¡Cuenta creada y sesión iniciada!";
        await comprobarSesion();
    } else {
        aviso.textContent =
            "Revisá tu correo para confirmar el registro. Si ya tenés cuenta, iniciá sesión.";
    }
    } catch (error) {
        aviso.textContent =
            "No pudimos completar el registro. Revisá los datos e intentá de nuevo.";

        console.error("Error al crear cuenta:", error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Crear cuenta";
    }
});

// Iniciar sesión
formularioLogin?.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const boton = formularioLogin.querySelector('button[type="submit"]');
    const aviso = document.getElementById("mensaje-login");

    if (boton.disabled) {
        return;
    }

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    boton.disabled = true;
    boton.textContent = "Ingresando…";
    aviso.textContent = "";

    try {
        const { error } = await baseDatos.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        document.getElementById("login-password").value = "";

        aviso.textContent = "¡Sesión iniciada correctamente!";
        await comprobarSesion();
    } catch (error) {
        aviso.textContent =
            "No pudimos iniciar sesión. Revisá el correo, la contraseña y que hayas confirmado tu cuenta.";

        console.error("Error al iniciar sesión:", error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Iniciar sesión";
    }
});

// Iniciar sesión con Google
const botonGoogle = document.getElementById("boton-google");

botonGoogle?.addEventListener("click", async function () {
    const aviso = document.getElementById("mensaje-google");

    botonGoogle.disabled = true;
    aviso.textContent = "Abriendo Google…";

    try {
        const { error } = await baseDatos.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo:
                    "https://francobillordo01.github.io/no-te-cuelgues/"
            }
        });

        if (error) {
            throw error;
        }
    } catch (error) {
        aviso.textContent = "No pudimos abrir Google. Intentá de nuevo.";
        console.error("Error con Google:", error.message);
        botonGoogle.disabled = false;
    }
});

// Revisar la sesión y elegir qué página mostrar
// Revisar la sesión y recordar una invitación pendiente
async function comprobarSesion() {
    const estaEnInicio = document.getElementById("formulario-login");
    const estaEnGrupos = document.getElementById("lista-grupos");

    if (estaEnInicio) {
        const parametros = new URLSearchParams(window.location.search);
        const token = parametros.get("invitacion");

        if (esIdentificadorValido(token)) {
            localStorage.setItem("invitacion-pendiente", token);
        }
    }

    const { data, error } = await baseDatos.auth.getUser();

    if (error) {
        if (error.name === "AuthSessionMissingError") {
            if (estaEnGrupos) {
                window.location.replace("../index.html");
            }
        } else {
            console.error("Error al comprobar sesión:", error.message);
        }

        return;
    }

    if (data.user && estaEnInicio) {
        const pendiente = localStorage.getItem("invitacion-pendiente");

        if (esIdentificadorValido(pendiente)) {
            window.location.replace(
                `pages/invitacion.html?token=${encodeURIComponent(pendiente)}`
            );
        } else {
            window.location.replace("pages/grupos.html");
        }

        return;
    }

    if (!data.user && estaEnGrupos) {
        window.location.replace("../index.html");
    }
}

comprobarSesion();

// Cerrar la sesión actual
const botonSalir = document.getElementById("boton-salir");

botonSalir?.addEventListener("click", async function () {
    const aviso = document.getElementById("mensaje-sesion");

    if (botonSalir.disabled) {
        return;
    }

    botonSalir.disabled = true;
    botonSalir.textContent = "Saliendo…";
    aviso.textContent = "";

    try {
        const { error } = await baseDatos.auth.signOut({
            scope: "local"
        });

        if (error) {
            throw error;
        }

        window.location.replace("../index.html");
    } catch (error) {
        aviso.textContent = "No pudimos cerrar la sesión. Intentá de nuevo.";
        console.error("Error al cerrar sesión:", error.message);

        botonSalir.disabled = false;
        botonSalir.textContent = "Cerrar sesión";
    }
});

// Mostrar u ocultar el formulario para crear grupos
const botonCrearGrupo = document.getElementById("boton-crear-grupo");
const formularioGrupo = document.getElementById("formulario-grupo");

botonCrearGrupo?.addEventListener("click", function () {
    formularioGrupo.hidden = !formularioGrupo.hidden;

    botonCrearGrupo.textContent = formularioGrupo.hidden
        ? "Crear un grupo ✨"
        : "Cancelar";

    if (!formularioGrupo.hidden) {
        document.getElementById("nombre-grupo").focus();
    }
});

// Mostrar un aviso en la lista de grupos
function mostrarAvisoGrupos(texto) {
    const listaGrupos = document.getElementById("lista-grupos");

    if (!listaGrupos) {
        return;
    }

    const aviso = document.createElement("p");
    aviso.className = "estado-vacio";
    aviso.textContent = texto;

    listaGrupos.replaceChildren(aviso);
}

// Consultar los grupos que permite ver Supabase
async function cargarGrupos() {
    const listaGrupos = document.getElementById("lista-grupos");

    if (!listaGrupos) {
        return;
    }

    mostrarAvisoGrupos("Cargando tus grupos…");

    try {
        const { data, error } = await baseDatos
            .from("grupos")
            .select("id, nombre")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        if (data.length === 0) {
            mostrarAvisoGrupos(
                "Todavía no creaste ningún grupo. ¡Armá el primero!"
            );
            return;
        }

        listaGrupos.replaceChildren();

        data.forEach(function (grupo) {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-grupo";

            const nombre = document.createElement("h3");
            nombre.textContent = grupo.nombre;

           const enlace = document.createElement("a");
            enlace.className = "boton-enlace";
            enlace.textContent = "Entrar al grupo";
            enlace.href = `grupo.html?id=${encodeURIComponent(grupo.id)}`;

            tarjeta.appendChild(nombre);
            tarjeta.appendChild(enlace);
            listaGrupos.appendChild(tarjeta);
        });
    } catch (error) {
        mostrarAvisoGrupos(
            "No pudimos cargar tus grupos. Recargá para intentar de nuevo."
        );

        console.error("Error al cargar grupos:", error.message);
    }
}

// Guardar un grupo nuevo
formularioGrupo?.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const boton = formularioGrupo.querySelector('button[type="submit"]');
    const aviso = document.getElementById("mensaje-grupo");
    const campoNombre = document.getElementById("nombre-grupo");
    const nombre = campoNombre.value.trim();

    if (boton.disabled) {
        return;
    }

    if (nombre.length === 0 || nombre.length > 50) {
        aviso.textContent = "Escribí un nombre de entre 1 y 50 caracteres.";
        return;
    }

    boton.disabled = true;
    boton.textContent = "Guardando…";
    aviso.textContent = "";

    try {
        const { data, error: errorSesion } =
            await baseDatos.auth.getUser();

        if (errorSesion) {
            throw errorSesion;
        }

        if (!data.user) {
            window.location.replace("../index.html");
            return;
        }

        const { error } = await baseDatos
            .from("grupos")
            .insert({
                nombre: nombre,
                creador_id: data.user.id
            });

        if (error) {
            throw error;
        }

        formularioGrupo.reset();
        formularioGrupo.hidden = true;
        botonCrearGrupo.textContent = "Crear un grupo ✨";
        botonCrearGrupo.focus();

        await cargarGrupos();
    } catch (error) {
        aviso.textContent = "No pudimos crear el grupo. Intentá de nuevo.";
        console.error("Error al crear grupo:", error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Guardar grupo";
    }
});

// Cargar los grupos al abrir esta página
cargarGrupos();

// Cargar el grupo indicado en el enlace
async function cargarDetalleGrupo() {
    const titulo = document.getElementById("nombre-del-grupo");
    const estado = document.getElementById("estado-grupo");

    // Ejecutar solo en la página de un grupo
    if (!titulo || !estado) {
        return;
    }

    try {
        const { data: sesion, error: errorSesion } =
            await baseDatos.auth.getUser();

        if (errorSesion || !sesion.user) {
            window.location.replace("../index.html");
            return;
        }

        const parametros = new URLSearchParams(window.location.search);
        const grupoId = parametros.get("id");

        if (!grupoId) {
            titulo.textContent = "Falta elegir un grupo";
            estado.textContent = "Volvé a mis grupos y elegí uno.";
            return;
        }

        const { data, error } = await baseDatos
            .from("grupos")
         .select("id, nombre, creador_id")
        .eq("id", grupoId);

        if (error) {
            throw error;
        }

        if (data.length === 0) {
            titulo.textContent = "Grupo no disponible";
            estado.textContent =
                "El grupo no existe o tu cuenta no tiene acceso.";
            return;
        }

        const grupo = data[0];
        prepararInvitacion(grupo, sesion.user.id);

        titulo.textContent = grupo.nombre;
        document.title = `${grupo.nombre} | No te cuelgues`;

        estado.textContent = "Los cumpleaños de quienes forman parte del grupo.";

        await cargarCumplesDelGrupo(grupo.id);

    } catch (error) {
        titulo.textContent = "No pudimos cargar el grupo";
        estado.textContent = "Recargá la página para intentar de nuevo.";

        console.error("Error al cargar el grupo:", error.message);
    }
}

cargarDetalleGrupo();

// Preparar la página Mi perfil
async function prepararPerfil() {
    const formularioPerfil = document.getElementById("formulario-perfil");

    // Ejecutar solo en la página del perfil
    if (!formularioPerfil) {
        return;
    }

    const campoNickname = document.getElementById("perfil-nickname");
    const campoDia = document.getElementById("perfil-dia");
    const campoMes = document.getElementById("perfil-mes");
    const aviso = document.getElementById("mensaje-perfil");
    const boton = formularioPerfil.querySelector('button[type="submit"]');

    boton.disabled = true;
    aviso.textContent = "Cargando tu perfil…";

    // Evitar envíos mientras se prepara la página
    formularioPerfil.addEventListener("submit", function (evento) {
        evento.preventDefault();
    });

    try {
        const { data: sesion, error: errorSesion } =
            await baseDatos.auth.getUser();

        if (errorSesion || !sesion.user) {
            window.location.replace("../index.html");
            return;
        }

        const usuario = sesion.user;

        const { data, error } = await baseDatos
            .from("perfiles")
            .select("nickname, dia, mes")
            .eq("id", usuario.id);

        if (error) {
            throw error;
        }

        if (data.length > 0) {
            const perfil = data[0];

            campoNickname.value = perfil.nickname;
            campoDia.value = perfil.dia;
            campoMes.value = perfil.mes;

            aviso.textContent = "Tus datos están listos para editar.";
        } else {
            campoNickname.value = usuario.user_metadata?.nickname || "";

            aviso.textContent = "Completá tus datos para crear tu perfil.";
        }

        // Guardar el perfil
        formularioPerfil.addEventListener("submit", async function (evento) {
            evento.preventDefault();

            if (boton.disabled) {
                return;
            }

            const nickname = campoNickname.value.trim();
            const dia = Number(campoDia.value);
            const mes = Number(campoMes.value);

            if (nickname.length === 0 || nickname.length > 30) {
                aviso.textContent =
                    "Escribí un nickname de entre 1 y 30 caracteres.";
                return;
            }

            const fechaPrueba = new Date(2000, mes - 1, dia);

            if (
                !Number.isInteger(dia) ||
                !Number.isInteger(mes) ||
                mes < 1 ||
                mes > 12 ||
                fechaPrueba.getMonth() !== mes - 1 ||
                fechaPrueba.getDate() !== dia
            ) {
                aviso.textContent =
                    "Esa fecha no existe. Revisá el día y el mes.";
                return;
            }

            boton.disabled = true;
            boton.textContent = "Guardando…";
            aviso.textContent = "";

            try {
                // Confirmar que sigue siendo la misma cuenta
                const { data: sesionActual, error: errorActual } =
                    await baseDatos.auth.getUser();

                if (
                    errorActual ||
                    !sesionActual.user ||
                    sesionActual.user.id !== usuario.id
                ) {
                    aviso.textContent =
                        "Tu sesión cambió. Recargá la página para continuar.";
                    return;
                }

                const { error: errorGuardar } = await baseDatos
                    .from("perfiles")
                    .upsert(
                        {
                            id: usuario.id,
                            nickname: nickname,
                            dia: dia,
                            mes: mes
                        },
                        { onConflict: "id" }
                    );

                if (errorGuardar) {
                    throw errorGuardar;
                }

                aviso.textContent = "¡Listo! Tu perfil quedó guardado 💜";

                const parametros = new URLSearchParams(window.location.search);
                const grupoDestino = parametros.get("grupo");

                if (esIdentificadorValido(grupoDestino)) {
                    window.location.replace(
                        `grupo.html?id=${encodeURIComponent(grupoDestino)}`
                    );
}
            } catch (error) {
                aviso.textContent =
                    "No pudimos guardar tu perfil. Intentá de nuevo.";

                console.error("Error al guardar perfil:", error.message);
            } finally {
                boton.disabled = false;
                boton.textContent = "Guardar mi perfil";
            }
        });

        boton.disabled = false;
    } catch (error) {
        aviso.textContent =
            "No pudimos cargar tu perfil. Recargá para intentar de nuevo.";

        console.error("Error al cargar perfil:", error.message);
    }
}

prepararPerfil();

// Consultar y mostrar los cumpleaños de un grupo
async function cargarCumplesDelGrupo(grupoId) {
    const contenedor = document.getElementById("lista-cumples-grupo");

    if (!contenedor) {
        return;
    }

    function avisar(texto) {
        const aviso = document.createElement("p");
        aviso.className = "estado-vacio";
        aviso.textContent = texto;

        contenedor.replaceChildren(aviso);
    }

    avisar("Cargando los cumpleaños del grupo…");

    try {
        // Primero consultar quiénes pertenecen al grupo
        const { data: miembros, error: errorMiembros } = await baseDatos
            .from("miembros_grupo")
            .select("usuario_id")
            .eq("grupo_id", grupoId);

        if (errorMiembros) {
            throw errorMiembros;
        }

        if (miembros.length === 0) {
            avisar("No hay miembros visibles para tu cuenta.");
            return;
        }

        const usuarios = miembros.map(function (miembro) {
            return miembro.usuario_id;
        });

        // Después buscar los perfiles de esos miembros
        const { data: perfiles, error: errorPerfiles } = await baseDatos
            .from("perfiles")
            .select("id, nickname, dia, mes")
            .in("id", usuarios);

        if (errorPerfiles) {
            throw errorPerfiles;
        }

        if (perfiles.length === 0) {
            avisar("Los miembros todavía no completaron sus perfiles.");
            return;
        }

        const cumpleaños = perfiles.map(function (perfil) {
            return {
                ...perfil,
                diasRestantes: calcularDiasRestantes(
                    perfil.dia,
                    perfil.mes
                )
            };
        });

        cumpleaños.sort(function (a, b) {
            return a.diasRestantes - b.diasRestantes;
        });

        contenedor.replaceChildren();

        const menorCantidadDias = cumpleaños[0].diasRestantes;

        cumpleaños.forEach(function (registro) {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-cumple";

            const informacion = document.createElement("div");
            informacion.className = "cumple-info";

            if (registro.diasRestantes === menorCantidadDias) {
                tarjeta.classList.add("proximo");

                const etiqueta = document.createElement("span");
                etiqueta.className = "cumple-etiqueta";
                etiqueta.textContent = registro.diasRestantes === 0
                    ? "HOY SE FESTEJA"
                    : "PRÓXIMO CUMPLE";

                informacion.appendChild(etiqueta);
            }

            const nombre = document.createElement("h3");
            nombre.textContent = registro.nickname;

            const fecha = document.createElement("p");
            fecha.className = "cumple-fecha";
            fecha.textContent =
                `${registro.dia} de ${meses[registro.mes - 1]}`;

            const contador = document.createElement("div");
            contador.className = "cumple-contador";

            const numero = document.createElement("strong");
            const detalle = document.createElement("span");

            if (registro.diasRestantes === 0) {
                tarjeta.classList.add("cumple-hoy");
                numero.textContent = "HOY";
                detalle.textContent = "¡Mandale un saludo! 🎂";
            } else {
                numero.textContent = registro.diasRestantes;
                detalle.textContent = registro.diasRestantes === 1
                    ? "día para su cumple"
                    : "días para su cumple";
            }

            informacion.appendChild(nombre);
            informacion.appendChild(fecha);

            contador.appendChild(numero);
            contador.appendChild(detalle);

            tarjeta.appendChild(informacion);
            tarjeta.appendChild(contador);

            contenedor.appendChild(tarjeta);
        });

        const pendientes = miembros.length - perfiles.length;

        if (pendientes > 0) {
            const nota = document.createElement("p");
            nota.textContent = pendientes === 1
                ? "Un miembro todavía no completó su perfil."
                : `${pendientes} miembros todavía no completaron sus perfiles.`;

            contenedor.appendChild(nota);
        }
    } catch (error) {
        avisar("No pudimos cargar los cumpleaños. Recargá para intentar de nuevo.");

        console.error("Error al cargar cumpleaños del grupo:", error.message);
    }
}

// Mostrar la opción de invitar solo al creador
function prepararInvitacion(grupo, usuarioId) {
    const acciones = document.getElementById("acciones-invitacion");
    const boton = document.getElementById("boton-invitar");

    if (!acciones || !boton || grupo.creador_id !== usuarioId) {
        return;
    }

    acciones.hidden = false;

    boton.addEventListener("click", async function () {
        const aviso = document.getElementById("mensaje-invitacion");
        const resultado = document.getElementById("resultado-invitacion");
        const campoEnlace = document.getElementById("enlace-invitacion");

        if (boton.disabled) {
            return;
        }

        boton.disabled = true;
        boton.textContent = "Generando…";
        aviso.textContent = "";
        resultado.hidden = true;

        try {
            const { data: token, error } = await baseDatos.rpc(
                "crear_invitacion",
                { p_grupo_id: grupo.id }
            );

            if (error) {
                throw error;
            }

            const enlace = new URL(
                "invitacion.html",
                window.location.href
            );

            enlace.searchParams.set("token", token);

            campoEnlace.value = enlace.href;
            resultado.hidden = false;

            aviso.textContent = "¡Invitación generada! Vence en 7 días.";

            campoEnlace.focus();
            campoEnlace.select();
        } catch (error) {
            aviso.textContent =
                "No pudimos generar la invitación. Intentá de nuevo.";

            console.error("Error al generar invitación:", error.message);
        } finally {
            boton.disabled = false;
            boton.textContent = "Generar nueva invitación";
        }
    });
}

// Comprobar el formato de los identificadores UUID
function esIdentificadorValido(valor) {
    return typeof valor === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

// Preparar la página de invitación
async function prepararPaginaInvitacion() {
    const boton = document.getElementById("boton-aceptar-invitacion");

    if (!boton) {
        return;
    }

    const estado = document.getElementById("estado-invitacion");
    const acceso = document.getElementById("acceso-invitacion");
    const cancelar = document.getElementById("cancelar-invitacion");

    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");

    cancelar?.addEventListener("click", function () {
        localStorage.removeItem("invitacion-pendiente");
    });

    if (!esIdentificadorValido(token)) {
        estado.textContent =
            "El enlace está incompleto o tiene un formato incorrecto.";
        boton.hidden = true;
        return;
    }

    estado.textContent = "Comprobando tu sesión…";

    try {
        const { data, error } = await baseDatos.auth.getUser();

        if (error && error.name !== "AuthSessionMissingError") {
            throw error;
        }

        if (!data.user) {
            estado.textContent =
                "Primero ingresá o creá tu cuenta. Después volverás acá para aceptar.";

            acceso.href =
                `../index.html?invitacion=${encodeURIComponent(token)}`;

            acceso.hidden = false;
            boton.hidden = true;
            return;
        }

        estado.textContent =
            `Ingresaste con ${data.user.email}. Al aceptar, compartirás tu perfil con el grupo.`;

        boton.disabled = false;

        boton.addEventListener("click", async function () {
            if (boton.disabled) {
                return;
            }

            boton.disabled = true;
            boton.textContent = "Uniéndote…";
            estado.textContent = "";

            try {
                const { data: grupoId, error: errorAceptar } =
                    await baseDatos.rpc("aceptar_invitacion", {
                        p_token: token
                    });

                if (errorAceptar) {
                    throw errorAceptar;
                }

                if (!esIdentificadorValido(grupoId)) {
                    throw new Error("La respuesta no contiene un grupo válido.");
                }

                localStorage.removeItem("invitacion-pendiente");

                // Completar o confirmar el perfil antes de ir al grupo
                window.location.replace(
                    `perfil.html?grupo=${encodeURIComponent(grupoId)}`
                );
            } catch (error) {
                estado.textContent =
                    "No pudimos aceptar la invitación. Puede haber vencido o sido reemplazada.";

                console.error("Error al aceptar invitación:", error.message);

                boton.disabled = false;
                boton.textContent = "Intentar de nuevo";
            }
        });
    } catch (error) {
        estado.textContent =
            "No pudimos comprobar tu sesión. Recargá para intentar de nuevo.";

        console.error("Error al preparar invitación:", error.message);
    }
}

prepararPaginaInvitacion();