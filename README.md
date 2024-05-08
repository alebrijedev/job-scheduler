# Propuesta: Tareas programadas.

## Antecedente.

Se necesita ejecutar uno o más procesos programados a una hora determinada sin la intervención del usuario, dichos procesos deben correr dentro de un contenedor usando los entornos de desarrollo de node o php.

## Propuesta.

Implementar un planificador de tareas (job scheduler) dentro del entorno de ejecución de docker. Existen diferentes soluciones, dependiendo del contexto, para este caso se propone el proyecto Ofelia

Consiste en la habilidad de ejecutar un comando dentro de un contenedor en ejecución o ejecutar un contenedor nuevo y eliminandolo al término del proceso.
Se puede instalar descargando el binario al servidor anfitrión (host) o la imagen del contenedor.

Enlace del proyecto: https://github.com/mcuadros/ofelia

En el repositorio se encuentra lo necesario para configurarlo por medio de un archivo INI o a través de etiquetas en los contenedores docker. El siguiente es un ejemplo de su implementación en un servidor debian 12.5 Bookworm:

Descargar el binario desde el repositorio del proyecto: https://github.com/mcuadros/ofelia/releases
La última versión liberada es la v0.3.11
``` shell
curl -sSL https://github.com/mcuadros/ofelia/releases/download/v0.3.11/ofelia_0.3.11_linux_amd64.tar.gz -o ofelia.tar.gz
```
descomprimir el archivo, en este caso en una ruta agregada al PATH para poder ejecutar el binario.
``` shell
tar -C ~/.local/bin -xzf ofelia.tar.gz
```
Para el ejemplo ejecutaremos una api sencilla desarrollada en javascript.

`app.js`
``` javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/version', (req, res) => {
    res.json({
        version: "1.0.0",
        description: "API to check the version of the service."
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```
Para empaquetarla usaremos docker:

`Dockerfile`
``` docker
FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]
```
Para su despliegue usaremos docker compose:

`docker-compose.yml`
``` yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
```
``` shell
docker compose up -d
```
En este caso queremos ejecutar una tarea que haga una petición a la api que desplegamos cada 10 segundo, usando una imagen que tenga la utilidad `curl` instalada, por lo tanto el archivo de configuración para ofelia queda de la siguiente manera:

`config.ini`
``` ini
[job-run "hello-world-job"]
schedule = @every 10s
image = curlimages/curl:latest
command = curl -s 172.22.250.61:3000/version
```
Nota: la IP en el archivo de configuración es la correspondiente al servidor host, dado que hicimos un port forward en el archivo `docker-compose.yml`

Finalmente, ejecutamos `ofelia`:

``` shell
ofelia daemon --config=config.ini
```
Cada 10 segundos obtendremos la respuesta de nuestra api:
``` shell
2024-05-08T15:10:03.86-06:00  scheduler.go:44 ▶ NOTICE New job registered "hello-world-job" - "curl -s 172.22.250.61:3000/version" - "@every 10s"
2024-05-08T15:10:03.86-06:00  scheduler.go:55 ▶ DEBUG Starting scheduler with 1 jobs

2024-05-08T15:10:13.001-06:00  common.go:125 ▶ NOTICE [Job "hello-world-job" (1784fb74c185)] Started - curl -s 172.22.250.61:3000/version
2024-05-08T15:10:13.91-06:00  common.go:125 ▶ NOTICE [Job "hello-world-job" (1784fb74c185)] Pulled image curlimages/curl:latest
2024-05-08T15:10:14.519-06:00  common.go:125 ▶ NOTICE [Job "hello-world-job" (1784fb74c185)] StdOut: {"version":"1.0.0","description":"API to check the version of the service."}
2024-05-08T15:10:14.519-06:00  common.go:125 ▶ NOTICE [Job "hello-world-job" (1784fb74c185)] Finished in "1.518166035s", failed: false, skipped: false, error: none
```