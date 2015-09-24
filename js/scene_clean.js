//if we can display webgl
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();


//funciones extra colocadas en otro ambiente de ejecucion no pueden ser vistas por variables superiores pero si por inferiores
// extra functions 
{
    Array.prototype.repeat = function(element, L){
      while(L) this[--L] = element;
      return this;
    };

    Number.prototype.clamp = function(min, max){
      return Math.min(Math.max(this,min),max);
    }

    function isPowerOfTwo(x) {
      return (x & (x - 1)) == 0;
    }
 
    function nextHighestPowerOfTwo(x) {
        --x;
        for (var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    }



    function SuperLerp (from, to, from2, to2, value) {
        if (value <= from2)
            return from;
        else if (value >= to2)
            return to;
        return (to - from) * ((value - from2) / (to2 - from2)) + from;
    }

    function SliderProps (Position, Width, Color, Opacity, Index)
    {
      this.Position = new Number(Position) || 
      ({
        value: 0,
        get: function() {return this.Position;},
        set: function(newValue) {this.Position = Number(newValue);},
        enumerable: true,
        writeable: true,
      }),
      this.Width = Width ||
      ({
        value: 0,
        get: function() {return this.Width;},
        set: function(newValue) {this.Width = newValue;},
        enumerable: true,
        writeable: true,
      })
      ,
      this.Color = new THREE.Color(Color) ||
      ({
        value: 0,
        get: function() {return this.Color;},
        set: function(newValue) {this.Color = newValue;},
        enumerable: true,
        writeable: true,
      }),
      this.Opacity = new Number(Opacity) ||
      ({
        value: 0,
        get: function() {return this.Opacity;},
        set: function(newValue) {this.Opacity = newValue;},
        enumerable: true,
        writeable: true,
      }),
      this.Index = new Number(Index) ||
      ({
        value: 0,
        get: function() {return this.Index;},
        set: function(newValue) {this.Index = Number(newValue);},
        enumerable: true,
        writeable: true,
      })
    };

    SliderProps.prototype.constructor = SliderProps;
}

//variables globales a la escena
var escena, camara, geometry, controls, container, stats;
var renderer, sceneFisrtPass, sceneSecondPass;

//variable usada para animar una capa o slice con posclasificacion
var anime_slider = false;
var use_simpson = false;

//tamaño de las tablas para funciones de transferencia
var pointer_to_table_size = 2;
var table_size = [256,512,1024];

var meshFirstPass, meshSecondPass;
var gl;

var clock = new THREE.Clock();
var rtTexture, VolumeContent, transferTexture, tranferTextureReal;

var materialSecondPass, materialFirstPass;

var m = 64;
var k = 64;
var n = 64;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var xmin = -2,ymin = -2, zmin = -2,xmax = 2,ymax = 2,zmax = 2, Tmin = -2, Tmax = 2;

var bbox;

var Mmin = 0, Mmax = 0;

// valores para ordenar las capas o slabs o slices
var valuesFrom = Array(2), unitaryValue = [];
var stepBGColor = Array(2);
var referencePos = 0;


var sliderArray = [];
var singleSliderProp = new SliderProps(0,20,'rgb(180,255,44)',0.2,0);
var SlidersProp = new SliderProps(5,30,'rgb(255,0,0)',0.1,0);
sliderArray.push(SlidersProp);
SlidersProp = new SliderProps(224,10,'rgb(255,180,0)',0.1,1);
sliderArray.push(SlidersProp);
var mTransferFunc;

console.log(sliderArray);
//funcion para controlador principal de las capas
var CreateSlider = function($slider, values)
{
 $slider
    .slider({
      animate: "fast",
      min: min1,
      max: max1,
      values: valuesFrom,
      step: 0.0001,
      slide: function(e, ui)
      {
        var index = $(ui.handle).data('uiSliderHandleIndex');
        sliderArray[index].Position = (ui.value-min1)/(max1-min1);
        sliderArray[index].Position = Math.floor(sliderArray[index].Position*table_size[pointer_to_table_size]);
        var bg_color = 'rgba('+(sliderArray[index].Color.r*255).toString()+','+(sliderArray[index].Color.g*255).toString()+','+(sliderArray[index].Color.b*255).toString()+','+sliderArray[index].Opacity.toString()+')';
        $(ui.handle).css({'background': bg_color });
        sliderArray[index].Index = ui.values[index]; 
        valuesFrom = ui.values;
        referencePos = index;
        updateTextures();
      },
      create: function(e, ui)
      {

      },
      change: function(e, ui)
      {
        indexOF = $(ui.handle).data('uiSliderHandleIndex');
        $('ul.SlectedSlider').each(function(index){
          $(this).children()[1].value = sliderArray[indexOF].Position;
          $(this).children()[3].value = sliderArray[indexOF].Width;
          $(this).children()[5].value = "#"+sliderArray[indexOF].Color.getHexString();
          $(this).children()[7].value = sliderArray[indexOF].Opacity;
        });
        referencePos = indexOF;
        //handle= $('.ui-slider-handle').css({"background": "#FA0"});
      }

  }).slider('float');
};
//puntero para el slider de animacion (opcional)
var fatherofAnimation;
//funcion para crear el slider de animacion (oculto a la vista)
var CreateAnimatedSlider = function($slider, values)
{
    $slider.slider(
      {
        min: min1,
        max: max1,
        step: 0.00001,
        values: unitaryValue,
        slide: function(e, ui)
        {
          var index = $(ui.handle).data('uiSliderHandleIndex');
          singleSliderProp.Position = (ui.value-min1)/(max1-min1);
          singleSliderProp.Position = Math.floor(singleSliderProp.Position*table_size[pointer_to_table_size]);     
          var bg_color = 'rgba('+(singleSliderProp.Color.r*255).toString()+','+(singleSliderProp.Color.g*255).toString()+','+(singleSliderProp.Color.b*255).toString()+','+singleSliderProp.Opacity.toString()+')';
          $(ui.handle).css({'background': bg_color });
          singleSliderProp.Index = ui.values; 
          unitaryValue = ui.values;
          referencePos = index;
          updateTextures();
          
        },
        create: function(e, ui)
        {
          
        },
        change: function(e, ui)
        {
          
        },
        start: function(e, ui)
        {

        }

      }).slider('float');
};

var textInput;
var f = math.parser();

var ambientLight;
var directionalLight;
   
//funciones del html con jquery, TODo EL CONTROL DE LA INTERFAZ
$(document).ready()
{
  //actualizo valores de minimos y maximos
  $("#formula-xmin").val(xmin) ;
  $("#formula-ymin").val(ymin) ;
  $("#formula-zmin").val(zmin) ;
  $("#formula-xmax").val(xmax) ;
  $("#formula-ymax").val(ymax) ;
  $("#formula-zmax").val(zmax) ;
  $('input:radio[id="Normal_f"]').prop('checked',true);
  $('#texture_size').val(pointer_to_table_size);

  //funcion de botones
  //callback del boton de dibujar
  $("#drawButton").on("click", function(event){
      if(Number($("#formula-xmin").val()) == Number($("#formula-xmax").val()) ||
         Number($("#formula-ymin").val()) == Number($("#formula-ymax").val()) ||
         Number($("#formula-zmin").val()) == Number($("#formula-xmax").val()))
        {
          alert("los minimos y maximos no pueden ser iguales!");
          return;
        }
      else
      
      sceneFirstPass = new THREE.Scene();
      sceneSecondPass = new THREE.Scene();
      xmin = Number($("#formula-xmin").val());
      ymin = Number($("#formula-ymin").val());
      zmin = Number($("#formula-zmin").val());
      xmax = Number($("#formula-xmax").val());
      ymax = Number($("#formula-ymax").val());
      zmax = Number($("#formula-zmax").val());
      m = parseInt($("#slice-per-x").val());
      n = parseInt($("#slice-per-x").val());
      k = parseInt($("#slice-per-x").val());
      textInput = $("#formula-Place-1").val().toLowerCase();
      {
        materialFirstPass.uniforms.xdistance.value = parseFloat(xmax-xmin);
        materialFirstPass.uniforms.ydistance.value = parseFloat(ymax-ymin);
        materialFirstPass.uniforms.zdistance.value = parseFloat(zmax-zmin);
        materialSecondPass.uniforms.xdistance.value = parseFloat(xmax-xmin);
        materialSecondPass.uniforms.ydistance.value = parseFloat(ymax-ymin);
        materialSecondPass.uniforms.zdistance.value = parseFloat(zmax-zmin);
      }
      camara.position.z = 2.0 * Math.pow(Math.pow((zmax-zmin),2)+Math.pow((xmax-xmin),2)+Math.pow((ymax-ymin),2),1/2);
      geometry = new THREE.BoxGeometry( xmax-xmin, ymax-ymin, zmax-zmin );
      geometry.doubleSide = true;
      meshFirstPass = new THREE.Mesh(geometry,materialFirstPass);
      meshSecondPass = new THREE.Mesh(geometry,materialSecondPass);
      bbox = new THREE.BoxHelper(meshSecondPass);
      bbox.material.color.setRGB( 1, 1, 1 );
      ambientLight = new THREE.AmbientLight(0x4A4A4A);
      directionalLight = new THREE.DirectionalLight(0x000000, 30);
      directionalLight.position.set(2, 2, 2);
      materialSecondPass.uniforms.directionalLightDirection.value = [directionalLight];
      sceneFirstPass.add(meshFirstPass);
      sceneSecondPass.add(meshSecondPass);
      sceneSecondPass.add(bbox);
      sceneSecondPass.add(ambientLight);
      sceneSecondPass.add(directionalLight);
      sceneSecondPass.needsUpdate = true;
      updateTextInput();
    });


  $(function() {
    var slider = $(".sliderMain").slider({

      create: function(e, ui)
      {
        var v = $(this).slider('value');
      }
    }).slider("float");
  });

  $(function(){
      $(".psliderslected.col-md-4.row-xs-3").on('change',function(){
        sliderArray[referencePos].Position = this.value;
      });
      $(".wsliderslected.col-md-4.row-xs-3").on('change',function(){
        sliderArray[referencePos].Width = this.value;
      });
      $('.s_rgbslider_slected.col-md-4.row-xs-3').colorpicker({
        format: "hex"
      }).
      on('changeColor.colorpicker', function(event){
        $(this).css("background",event.color.toHex());
        sliderArray[referencePos].Color = new THREE.Color(event.color.toHex());
      });
      $(".osliderslected.col-md-4.row-xs-3").on('change',function(){
        sliderArray[referencePos].Opacity = this.value;
      });
  });

  var $togglebutton = $('#AnimationSlider');

  $togglebutton.on('click', function()
  {
    $togglebutton.toggleClass('active');
    if($togglebutton.hasClass('active')){  
      anime_slider=true; 
      fatherofAnimation = $('.sliderAnimeted').slider('widget');
      $(function(){
        beeleft();
      });
    }else{ 
      anime_slider=false;
    }
    console.log($togglebutton.hasClass('active'));
  });


    $('#texture_size').on('change',function(){
      pointer_to_table_size = this.value;
      updateTextures();
    });
 

  $('input:radio[id="Normal_f"]').on("click",function(){
    console.log('chek thus');
     use_simpson = false;
     $('input:radio[id="Normal_f"]').prop('checked',true);
     updateTextures();
  });
  $('input:radio[id="Simpson_f"]').on("click",function(){
    console.log('chek thas');
    use_simpson = true;
     $('input:radio[id="Simpson_f"]').prop('checked',true);
      updateTextures();
  });

  function beeleft()
  {
   fatherofAnimation.find('.ui-slider-handle').animate({left: "100%"},
        { duration: 3000,
          easing:'linear',
          speed:'slow',
          step: function(now, fx){
          //console.log(now/100);
          var maxin = fatherofAnimation.slider('option','max');
          var minin = fatherofAnimation.slider('option','min');
          var vall = maxin+minin;
          console.log(vall);
          singleSliderProp.Position = (((now/100)*vall)-minin)/(maxin-minin);
          //console.log(singleSliderProp.Position);
          singleSliderProp.Position = Math.floor(singleSliderProp.Position*table_size[pointer_to_table_size]);     
          console.log(singleSliderProp.Position);
          updateTextures();
          //fatherofAnimation.slider('value',maxin*(now/100));
          },
          done: function()
          {
            if(anime_slider!=false)
              beeright();
          }
        });

  }
  function beeright()
  {
    fatherofAnimation.find('.ui-slider-handle').animate({left: "0%"},
        { duration: 3000,
          easing:'linear',
          speed:'slow',
          step: function(now, fx){
           // console.log(now/100);
          var maxin = fatherofAnimation.slider('option','max');
          var minin = fatherofAnimation.slider('option','min');
          var vall = maxin+minin;
          console.log(vall);

          singleSliderProp.Position = (((now/100)*vall)-minin)/(maxin-minin);
         //    console.log(singleSliderProp.Position);
          singleSliderProp.Position = Math.floor(singleSliderProp.Position*table_size[pointer_to_table_size]);     
          console.log(singleSliderProp.Position);
          updateTextures();
          },
          done: function()
          {
            if(anime_slider!=false)
              beeleft();
          }
        });
   }

     


    //slider add - delete elements
    $(function()
    {
      var self = $('#mainlist');
      var template = self.find('.template').first();
      var clone = template.clone().removeClass('template').hide();
      $('ol').append(clone);
      clone.slideDown(100);
      
      $('li').each(function(index)
      {
        if(index < sliderArray.length)
          $(this).children()[0].value=sliderArray[index].Position;
          $(this).children()[1].value=sliderArray[index].Width;
          $(this).children()[2].value=sliderArray[index].Color.getHexString();
          $(this).children()[2].id="rgbslider_"+index;
          $(this).children()[3].value=sliderArray[index].Opacity;
          $(this).children()[4].id="del_"+index;

      });
    });

    $('#modal_button').on('click',function(){
      console.log("in");
      
      $('li').each(function(index)
      {
        if(index < sliderArray.length-1)
          $(this).children()[0].value=sliderArray[index].Position;
          $(this).children()[1].value=sliderArray[index].Width;
          $(this).children()[2].value=sliderArray[index].Color.getHexString();
          $(this).children()[2].id="rgbslider_"+index;
          $(this).children()[3].value=sliderArray[index].Opacity;
          $(this).children()[4].id="del_"+index;

      });
    });

    $('.apply').on('click',function(){
      var arrayofNewProps = [];
      var arrayofNewValues = [];
      var count = $('li').length;
      console.log(count);
      $('li').each(function(index){
          var transformm = ((Math.floor(($(this).children()[0].value)*(Mmax-Mmin))/(table_size[pointer_to_table_size]))+Mmin);
          console.log($(this).children()[2].value);
          var result_color;
          if($(this).children()[2].value.indexOf('#')==-1)
          {
            result_color = "#"+$(this).children()[2].value;
          }
          else
          {
            result_color = $(this).children()[2].value;
          }
          var result = [$(this).children()[0].value,$(this).children()[1].value,result_color,$(this).children()[3].value];
          var SliderProp = new SliderProps(result[0],result[1],result[2],result[3],index);
          arrayofNewProps.push(SliderProp);
          arrayofNewValues.push(transformm);
      });
      sliderArray = arrayofNewProps;
      valuesFrom = arrayofNewValues;
      $('.sliderMain').slider('destroy');
      CreateSlider($('.sliderMain'),valuesFrom);
    });

    $(function(){
        $('#mainlist').on('click','.sdelete',function(e){
          var delbutton = $(e.currentTarget);
          var listitem = delbutton.parent();
          if($('li').length < 2)
          {
            alert("no se puede eliminar, debe haber al menos 1 elemento");
            return;
          }
          listitem.slideUp(100, function() {
            listitem.remove();
          });
        });
    });

    $('.add').on('click',function(){
      var self = $('#mainlist');
      var template = self.find('.reSlideprops').first();
      var clone = template.clone().removeClass('template').hide();
      $('ol').append(clone);
      clone.slideDown(100);
      $('li').each(function(index)
      {
        $(this).children()[2].id="rgbslider_"+index;
        $(this).children()[4].id="del_"+index;
      });
      $(function(){
        
        $('input:text[id^="rgbslider_"]').colorpicker({
          format: "hex"
        }).
        on('changeColor.colorpicker', function(event){
          $(this).css("background", event.color.toHex());
        });
      });  
    });

    $(function()
    {


    });

    $('#Center').on('click',function(){
        controls.reset();
    });

    $(function(){
      
      $('input:text[id^="rgbslider_"]').colorpicker({
        format: "hex"
      }).
      on('changeColor.colorpicker', function(event){
        $(this).css("background", event.color.toHex());
      });
    });


    $(function()
    {
      $('.s_rgbslider_slected.col-md-4.row-xs-3').colorpicker({
        format: "hex"
      }).
      on('changeColor.colorpicker', function(event){
        $(this).css("background", "#"+event.color.toHex());
      });
    })   

}

//inicializadores
init();
//llamada al render
animate();

//inicializador del render
function init()
{

  textInput = "x^2+y^2+z^2-1"
  //primer fill de las varibles de funcion
  f.eval('f(x,y,z) ='+textInput);

  //declaro la escena
  escena = new THREE.Scene();
  //el contenedor de la escena
  container = document.getElementById('container-webgl');
  //algunas propiedades del rendeer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  
  //activo extenciones para el uso del texturas en flotantes y el uso de filtros lineales sobre flotantes
  gl = renderer.getContext('webgl');
  if (!gl.getExtension("OES_texture_float"))
   {
       throw("Requires OES_texture_float extension");
   }
  if (!gl.getExtension("OES_texture_float_linear")) 
   {
     throw("Requires OES_texture_float extension");
   }

  //inicializo la camara
  camara = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000.0 );
  camara.position.z = 2.0 * Math.pow(Math.pow((zmax-zmin),2)+Math.pow((xmax-xmin),2)+Math.pow((ymax-ymin),2),1/2);

  controls = new THREE.OrbitControls( camara, container );
  
  controls.update();
  //update en la interfaz para ver la ecuacion actual
  $("#formula-Place-1").val(textInput);
  //Carga del volumen
  //se Coloca el total de cortes, se pasa la formula y cantidad de cortes por eje
  var complete_size = (n*m*k)
  var result = new create_volumetexture(f.get('f'),complete_size,m,n,k);
  VolumeContent = result.Volume;
  //luego se llama al update de la funcion de transferencia si es con simpson o es posclasificacion
  var transferTexture = updateTransferFunction();
  //se coloca el tamaño del render
  windowHalfX = document.getElementById('container-webgl').clientWidth / 2;
  windowHalfY = window.innerHeight / 2;
  //se crean las variables para hacer el algoritmo de raycasting de 2 pasos 
  var screenSize = new THREE.Vector2( document.getElementById('container-webgl').clientWidth, window.innerHeight );
  rtTexture = new THREE.WebGLRenderTarget( screenSize.x, screenSize.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType } );
  //display shaders
  //material para muestrear la parte trasera del volumen
  materialFirstPass = new THREE.ShaderMaterial( {
          vertexShader: document.getElementById( 'vertexShaderFirstPass' ).textContent,
          fragmentShader: document.getElementById( 'fragmentShaderFirstPass' ).textContent,
          side: THREE.BackSide,
          uniforms: {
            xdistance: {type: "f", value: parseFloat(xmax-xmin)},
            ydistance: {type: "f", value: parseFloat(ymax-ymin)},
            zdistance: {type: "f", value: parseFloat(zmax-zmin)}
          }
        } );

  //luego se gurda como textura y es pasada al segudno material para calcular la parte frontal
  materialSecondPass = new THREE.ShaderMaterial({ 
          uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib['lights'], 
          {  backside: {type: "t", value: rtTexture},
             maxY: {type: "f", value: parseFloat((m))},
             maxZ: {type: "f", value: parseFloat((k))},
             maxX: {type: "f", value: parseFloat(n)},
             volumetex: {type: "t", value: null},
             transferTex: {type: "t", value: null},
             transferpalette: {type: "t", value: null}, 
             steps: {type: "1f", value: parseFloat(math.eval("sqrt(64^2+64^2+64^2)"))},
             alphaFixed :{type: "1f", value: parseFloat(1.0)},
             xdistance: {type: "f", value: parseFloat(xmax-xmin)},
             ydistance: {type: "f", value: parseFloat(ymax-ymin)},
             zdistance: {type: "f", value: parseFloat(zmax-zmin)}

           }]),
          vertexShader: document.getElementById('vertexShaderSecondPass').textContent,
          fragmentShader: document.getElementById('fragmentShaderSecondPass').textContent,
          side : THREE.FrontSide,
          lights : true
        });
  //se actualizan las unidaddes de textura
  materialSecondPass.uniforms.volumetex.value = VolumeContent;
  materialSecondPass.uniforms.transferTex.value = transferTexture;
  materialSecondPass.uniforms.transferpalette.value = tranferTextureReal;

  // se hace la declaracion de las dos esceneas para el primer y segundo paso
  sceneFirstPass = new THREE.Scene();
  sceneSecondPass = new THREE.Scene();
  //geometria contenedor del volumen
  geometry = new THREE.BoxGeometry( xmax-xmin, ymax-ymin, zmax-zmin );
  geometry.doubleSide = true;


  meshFirstPass = new THREE.Mesh( geometry, materialFirstPass );
  meshSecondPass = new THREE.Mesh( geometry, materialSecondPass);
  //boundign box del render
  bbox = new THREE.BoxHelper(meshSecondPass);
  bbox.material.color = new THREE.Color("rgba(1,1,1,0.0)");
  //luces locales al render
  ambientLight = new THREE.AmbientLight(0x4A4A4A);
  directionalLight = new THREE.DirectionalLight(0x000000, 30);
  directionalLight.position.set(2, 2, 2);
  materialSecondPass.uniforms.directionalLightDirection.value = [directionalLight];
  
  sceneFirstPass.add( meshFirstPass );
  sceneSecondPass.add( meshSecondPass );
  sceneSecondPass.add(bbox);
  sceneSecondPass.add(ambientLight);
  sceneSecondPass.add(directionalLight);
  sceneSecondPass.needsUpdate = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild( renderer.domElement);

  var Wwidth = document.getElementById('container-webgl').clientWidth || 2;
  var Wheight = window.innerHeight || 2;

  //estadisticas del render 'fps'
  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild( stats.domElement );

  onWindowResize();

  window.addEventListener('resize', onWindowResize, false);  
}  

// funcion principal para crear el render
function create_volumetexture(f_volume,size,m,n,k)
{

  var data = new Float32Array(size*4);


  var result = 0;
  var x_=0,y_=0,z_=0; 
  // primero la funcion, y calculo del min max
  for(var y = 0; y < m; y++)
  {
    for(var z = 0; z < k; z++)
    {
      for(var x = 0; x < n; x++)
        {
            x_ = (x*(xmax-xmin)/(n-1.0))+xmin;
            y_ = (y*(ymax-ymin)/(m-1.0))+ymin;
            z_ = (z*(zmax-zmin)/(k-1.0))+zmin;
            data[x*m*n*4 + z*n*4 + y*4+3] = f_volume(x_,y_,z_);;
          if (x+y+z==0)
            min1 = max1 = data[x*m*n*4 + z*n*4 + y*4+3];
                if (result<min1) min1 =result;
                if (result>max1) max1 =result;
      
        }
    }
  }

  // segundo los gradientes
  for(var y = 0; y < m; y++)
  {
    for(var z = 0; z < k; z++)
    {
    for(var x = 0; x < n; x++)
        {

      if(x == n-1)
              data[x*m*n*4 + z*n*4 + y*4] =2*(data[(x-1)*m*n*4 + z*n*4 + y*4+3]-data[x*m*n*4 + z*n*4 + y*4+3]);
      else if (x == 0)
              data[x*m*n*4 + z*n*4 + y*4] =2*(data[x*m*n*4 + z*n*4 + y*4+3]-data[(x+1)*m*n*4 + z*n*4 + y*4+3]);
      else
              data[x*m*n*4 + z*n*4 + y*4] =(data[(x-1)*m*n*4 + z*n*4 + y*4+3]-data[(x+1)*m*n*4 + z*n*4 + y*4+3])/2;
        
      if(y == m-1)
              data[x*m*n*4 + z*n*4 + y*4+1] =2*(data[x*m*n*4 + z*n*4 + (y-1)*4+3]-data[x*m*n*4 + z*n*4 + y*4+3]);
      else if (y == 0)
              data[x*m*n*4 + z*n*4 + y*4+1] =2*(data[x*m*n*4 + z*n*4 + y*4+3]-data[x*m*n*4 + z*n*4 + (y+1)*4+3]);
      else
              data[x*m*n*4 + z*n*4 + y*4+1] =(data[x*m*n*4 + z*n*4 + (y-1)*4+3]-data[x*m*n*4 + z*n*4 + (y+1)*4+3])/2;

      if(z == k-1)
              data[x*m*n*4 + z*n*4 + y*4+2] =2*(data[x*m*n*4 + (z-1)*n*4 + y*4+3]-data[x*m*n*4 + z*n*4 + y*4+3]);
      else if (z == 0)
              data[x*m*n*4 + z*n*4 + y*4+2] =2*(data[x*m*n*4 + z*n*4 + y*4+3]-data[x*m*n*4 + (z+1)*n*4 + y*4+3]);
      else
              data[x*m*n*4 + z*n*4 + y*4+2] =(data[x*m*n*4 + (z-1)*n*4 + y*4+3]-data[x*m*n*4 + (z+1)*n*4 + y*4+3])/2;
        
        }
    }
  }
  //normalizacion de los valores en 4ta componente
  result = 0;
  for(var y = 0; y < m; y++)
  {
    for(var z = 0; z < k; z++)
    {
      for(var x = 0; x < n; x++)
        {
          result = (data[x*m*n*4 + z*n*4 + y*4+3]-min1)/(max1-min1);
          data[x*m*n*4 + z*n*4 + y*4+3] = result;
        }
    }
  }

  //construccion y actualizacion de valores en la interfaz
  $("#minimum").text(min1);
  $("#maximum").text(max1);
  Mmin = min1;
  Mmax = max1;
  unitaryValue = ((Math.floor((singleSliderProp.Position)*(Mmax-Mmin))/(table_size[pointer_to_table_size]))+Mmin);
  CreateAnimatedSlider($('.sliderAnimeted'),unitaryValue);
  
  valuesFrom[0] = ((Math.floor((sliderArray[0].Position)*(Mmax-Mmin))/(table_size[pointer_to_table_size]))+Mmin);
  valuesFrom[1] = ((Math.floor((sliderArray[1].Position)*(Mmax-Mmin))/(table_size[pointer_to_table_size]))+Mmin);
  
  CreateSlider($('.sliderMain'), valuesFrom);
  //construccion de la textura
  var texture = new THREE.Texture();
  texture.needsUpdate = false;
  texture.__webglTexture = gl.createTexture();

  gl.bindTexture( gl.TEXTURE_2D, texture.__webglTexture );
  var _width2 = n*k;
  var _height2 = m; 
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _width2, _height2,0, gl.RGBA, gl.FLOAT, data );
  texture.__webglInit = true;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture( gl.TEXTURE_2D, null );

  return {
    Volume          :texture,
    MinAll          : min1,
    MaxAll          : max1,
  };
}

//funcion para actualizar la unidad de textura del shader
function updateTextures()
{
  materialSecondPass.uniforms.transferTex.value = updateTransferFunction(); 
}

//funcion para actualizar el volume 
function updateTextInput()
{
  try
  {
    f.eval('f(x,y,z) = '+textInput);
    f.get('f')(0,0,0);
  }
  catch(e)
  {
    alert("error en la funcion, reescriba de nuevo la funcion");
    return;
  }
   $('.sliderAnimeted').slider('destroy');
   $('.sliderMain').slider('destroy');
    materialSecondPass.uniforms.volumetex.value = updateVolumeFunction();
    materialSecondPass.uniforms.maxZ.value = k;
}

function updateVolumeFunction()
{
  var size = (n*k*m);
  var result = new create_volumetexture(f.get('f'),size,m,n,k);
  ValumeContent = 0;
  tranferTextureReal = 0;
  VolumeContent = result.Volume;
  return VolumeContent;
}


function updateTransferFunction()
{

  var data = new Float32Array(table_size[pointer_to_table_size]*4); //cuatro canales
  var data2 = new Uint8Array(table_size[pointer_to_table_size]*4);
  var data3 = new Uint8Array(table_size[pointer_to_table_size]*4);
  var data4 = new Uint8Array(table_size[pointer_to_table_size]*table_size[pointer_to_table_size]*4);
  var SimpsonAdaptativoText = new Float32Array(TF_SIZE*TF_SIZE*4);
  var saltexture = new Uint8Array(TF_SIZE*TF_SIZE*4);
 

if(anime_slider== true && use_simpson ==false) //uso de posclasificacion con animacion de 1 sola capa
{ 
    for(var i = 0; i<singleSliderProp.Width; i++){
      data[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4]  = singleSliderProp.Color.r;
      data[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4+1]= singleSliderProp.Color.g;
      data[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4+2]= singleSliderProp.Color.b;
      data[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4+3]= singleSliderProp.Opacity;
      data2[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4]  = singleSliderProp.Color.r*255;
      data2[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4+1]= singleSliderProp.Color.g*255;
      data2[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4+2]= singleSliderProp.Color.b*255;
      data2[(((singleSliderProp.Width/2)-i)+(singleSliderProp.Position))*4+3]= singleSliderProp.Opacity*255;
    }
}
else if(anime_slider == false && use_simpson ==false) // uso de posclasificacion sin animar
{

  for(var i = 0; i<sliderArray[referencePos].Width; i++){
      data[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4]  = sliderArray[referencePos].Color.r;
      data[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4+1]= sliderArray[referencePos].Color.g;
      data[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4+2]= sliderArray[referencePos].Color.b;
      data[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4+3]= sliderArray[referencePos].Opacity;
      data2[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4]  = sliderArray[referencePos].Color.r*255;
      data2[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4+1]= sliderArray[referencePos].Color.g*255;
      data2[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4+2]= sliderArray[referencePos].Color.b*255;
      data2[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))*4+3]= sliderArray[referencePos].Opacity*255;
  }

  for(var j =0 ; j < sliderArray.length; j++)
  {
    for(var i = 0; i<sliderArray[j].Width; i++){
      data[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4]  = sliderArray[j].Color.r;
      data[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4+1]= sliderArray[j].Color.g;
      data[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4+2]= sliderArray[j].Color.b;
      data[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4+3]= sliderArray[j].Opacity;
      data2[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4]  = sliderArray[j].Color.r*255;
      data2[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4+1]= sliderArray[j].Color.g*255;
      data2[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4+2]= sliderArray[j].Color.b*255;
      data2[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))*4+3]= sliderArray[j].Opacity*255;
    }
  }

} 
else if(anime_slider == false && use_simpson == true) //uso de pre-integracion y no de posclasifciacion
{ //dibujo el nodo actual
  for(var i = 0; i<sliderArray[referencePos].Width; i++){
       m_nodes[(((sliderArray[referencePos].Width/2)-i)+(sliderArray[referencePos].Position))] = new CTFNode (sliderArray[referencePos].Color.r, sliderArray[referencePos].Color.g, sliderArray[referencePos].Color.b, sliderArray[referencePos].Opacity, sliderArray[referencePos].Opacity);
  }

  for(var j=0; j < sliderArray.length; j++)
  {
    for(var i = 0; i < sliderArray[j].Width ; i++)
    {
      m_nodes[(((sliderArray[j].Width/2)-i)+(sliderArray[j].Position))] = new CTFNode (sliderArray[j].Color.r, sliderArray[j].Color.g, sliderArray[j].Color.b, sliderArray[j].Opacity, sliderArray[j].Opacity);
    }
  }
  Preintegration_Adaptative(SimpsonAdaptativoText,1);

  for(var j=0; j<TF_SIZE; j++ )
  {  for(var i=0; i<TF_SIZE; i++)
    {
      saltexture[j*TF_SIZE*4+i*4]  =SimpsonAdaptativoText[j*TF_SIZE*4+i*4]  *255;
      saltexture[j*TF_SIZE*4+i*4+1]=SimpsonAdaptativoText[j*TF_SIZE*4+i*4+1]*255;
      saltexture[j*TF_SIZE*4+i*4+2]=SimpsonAdaptativoText[j*TF_SIZE*4+i*4+2]*255;
      saltexture[j*TF_SIZE*4+i*4+3]=SimpsonAdaptativoText[j*TF_SIZE*4+i*4+3]*255;
    }
  }
}
  if(use_simpson == true)
  texture2 = new THREE.DataTexture(SimpsonAdaptativoText, table_size[pointer_to_table_size], table_size[pointer_to_table_size], THREE.RGBAFormat, THREE.FloatType,THREE.UVMapping, THREE.ClampToEdgeWrapping,THREE.ClampToEdgeWrapping,THREE.NearestFilter,THREE.LinearFilter);
  else
  texture2 = new THREE.DataTexture(data, table_size[pointer_to_table_size], 1, THREE.RGBAFormat, THREE.FloatType,THREE.UVMapping, THREE.ClampToEdgeWrapping,THREE.ClampToEdgeWrapping,THREE.NearestFilter,THREE.LinearFilter);
  texture2.needsUpdate = true;

  var texture3 = new THREE.Texture();
  texture3.needsUpdate = true;
  texture3.__webglTexture = gl.createTexture();
    var _width2,_height2;
  gl.bindTexture( gl.TEXTURE_2D, texture3.__webglTexture );
  if(use_simpson == true)
  {_width2 = table_size[pointer_to_table_size];
    _height2 = table_size[pointer_to_table_size]; }
  else
  { _width2 = table_size[pointer_to_table_size];
    _height2 = 1; }
  
  if(use_simpson ==true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _width2, _height2,0, gl.RGBA, gl.UNSIGNED_BYTE, saltexture );
  else
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _width2, _height2,0, gl.RGBA, gl.UNSIGNED_BYTE, data2 );

  texture3.__webglInit = true;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture( gl.TEXTURE_2D, null );
  // Create a framebuffer backed by the texture
  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture3.__webglTexture, 0);

  // Read the contents of the framebuffer
  if(use_simpson == true)
  gl.readPixels(0, 0, table_size[pointer_to_table_size], table_size[pointer_to_table_size], gl.RGBA, gl.UNSIGNED_BYTE, data4);
  else
  gl.readPixels(0, 0, table_size[pointer_to_table_size], 1, gl.RGBA, gl.UNSIGNED_BYTE, data3); 
  gl.deleteFramebuffer(framebuffer);

  // Create a 2D canvas to store the result 
  var canvas = document.createElement('canvas');
  if(use_simpson == true){
    canvas.width = table_size[pointer_to_table_size];
    canvas.height = table_size[pointer_to_table_size];
  }
  else
  {
    canvas.width = table_size[pointer_to_table_size];
    canvas.height = 1;
  }
  
  var imageData;
  var context = canvas.getContext('2d');
  if(use_simpson == true)
  {
  imageData = context.createImageData(table_size[pointer_to_table_size], table_size[pointer_to_table_size]);
  imageData.data.set(data4);
  }
  else
  {
  imageData = context.createImageData(table_size[pointer_to_table_size], 1);
  imageData.data.set(data3);
  }
  context.putImageData(imageData, 0, 0);

  var img = document.getElementById("transferFunctionImg");
  img.src = canvas.toDataURL();
  img.style.width = "1024 px";
  img.style.height = "10 px";


  return texture2;
}

//funcion para hacer resize del contenedor de webgl
function onWindowResize( event ) 
{
  camara.aspect = document.getElementById('container-webgl').clientWidth / window.innerHeight;
  camara.updateProjectionMatrix();

  renderer.setSize( document.getElementById('container-webgl').clientWidth, window.innerHeight);
  
}

//funcion para hacer el loop del render
function animate()
{
  requestAnimationFrame( animate );
  rander();
  stats.update();
}

function rander()
{

  var delta = clock.getDelta();
  //Render first pass and store the world space coords of the back face fragments into the texture.
  //Despliege del primer paso, se guarda las cordenadas de espacio en la cara tracera del fragmento dentro de la textura
  renderer.render( sceneFirstPass, camara, rtTexture, true );
  //despliegue del segundo paso y muestra del volumen
  //Render the second pass and perform the volume rendering.
  renderer.render( sceneSecondPass, camara);
 
  materialSecondPass.uniforms.steps.value = 2.0*parseFloat(Math.pow((Math.pow((k),2)+Math.pow((m),2)+Math.pow(n,2)),1/2));
  materialSecondPass.uniforms.maxZ.value = k;
}
