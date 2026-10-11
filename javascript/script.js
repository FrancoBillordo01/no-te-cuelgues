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
