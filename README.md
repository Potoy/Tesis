# Tesis - Visualizador de Ecuaciones Implicitas (Demo)

# Sinopsis
Esta es una aplicacion prototipo que usa WebGL con el fin de graficar ecuaciones implicitas, por medio de despliegue de Volumenes.

los dos archivos claves son:
**scene_clean.js**: es una mezcla entre le render, manejo de la interfaz y creacion de la textura del volumen
**home.html**: contiene dos div principales uno donde contiene el canvas y otro donde esta el menu principal

extra
**Simpson.js**: esta es una adaptacion de c++ a javascript del Metodo Adaptativo de Simpson con el fin de crear el metodo de pre-integracion

#Motivacion
Se desea crear una aplicacion cross-plataform que pueda convivir entre varios buscadores web con el fin de enseñar y estudiar este tipo de ecuaciones, es una solucion simple a la mano de tecnologias web

#Funcionalidades y Uso
en el menu principal se encuentran las siguientes secciones:

**Maximos y Minimos**: estos son los valores maximos por cada eje y los que conforman la caja en donde se dibuja el volumen, no puede ser iguales los valores.

**f(x,y,z)**: aqui es donde se construye la funcion a dibujar, este se rije por varias de las funciones usadas por **math.js** (libreria externa para el manejo eficiente de operaciones matematicas), ejemplo x^2+y^2+z^2.

**Numero de voxels**: indica la cantidad de muestras por voxel en la textura, a mayor cantidad mejor detalle, limitante de WebGL por tamaño de textura hasta un maximo de 64x4096 (64 voxels).

**Funcion de Transferencia**: dos opciones Normal y Pre-Integracion (uso bajo su propio riesgo), el tamaño de las paletas son de 256,512 y 1024.


Luego de estas opciones podemos sentrar el objeto o dibujarlo, la ocion de animar solo tiene 1 capa y muestra todo el rango de la funcion

#Controles despues del despliegue
**Slider de capas o iso valores**: aqui es donde se puede moven las capas del volumen y pueden ser editatas cambiando su color, posicion, grosor, y cantidad de absorcion

**Agregar mas Iso-Valores o Capas**: esta opcion sirve para agregar N cantidad de capas para dibujar ademas de las que se tienen, y se pueden eliminar tambien dejando hasta maximo 1 sola capa

#Contribuidores


#Licencia
