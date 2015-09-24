if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var escena, camara, geometry, material, controls, container, stats;
var renderer, sceneFisrtPass, sceneSecondPass;



//Extra tweaks
{
    var eachController = function(fnc) {
      for (var controllerName in dat.controllers) {
        if (dat.controllers.hasOwnProperty(controllerName)) {
          fnc(dat.controllers[controllerName]);
        }
      }
    } 

    var setTitle = function(v) {
      // __li is the root dom element of each controller
      if (v) {
        this.__li.setAttribute('title', v);
      } else {
        this.__li.removeAttribute('title')
      }
      return this;
    };

    eachController(function(controller) {
      if (!controller.prototype.hasOwnProperty('title')) {
        controller.prototype.title = setTitle;
      }
    });

    Array.prototype.repeat = function(element, L){
      while(L) this[--L] = element;
      return this;
    };

    
    Number.prototype.clamp = function(min, max){
      return Math.min(Math.max(this,min),max);
    }
}


var geometry, material;
var cube;
var gl;

var clock = new THREE.Clock();
var rtTexture, transferTexture, tranferTextureReal;
var renderbuffer;
var framebuffer;
var backface_buffer;
var final_image;

var materialSecondPass;

var m = 64;
var k = 64;
var n = 64;

var Tn = 256;

var mTransferFunc;

var mColorKnots;
var mAlphaKnots;

var f = math.eval("f(x,y,z) = ((x-32)^2+(y-32)^2+(z-32)^2-(30)^2)");

init();
animate();

function init()
{
  console.log("primer pass",n,m,k);

  //declaro la escena
  escena = new THREE.Scene();

  container = document.getElementById('container');
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  
  gl = renderer.getContext('webgl');

  var ext = gl.getExtension('WEBGL_draw_buffers');
  if(!ext)
    console.log("nope :o");


  if (!gl.getExtension("OES_texture_float")) {
     throw("Requires OES_texture_float extension");
  }
  if (!gl.getExtension("OES_texture_float_linear")) {
     throw("Requires OES_texture_float extension");
  }


  camara = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 1500 );
  camara.position.z = 2.0;

  controls = new THREE.OrbitControls( camara, container );
  controls.center.set (0.0,0.0,0.0);

  //load volume
  //put the equation on the texture atlas
  var result = new create_volumetexture(f,(n*m*k),m,n,k);
  var VolumeContent = result.Volume;
      tranferTextureReal = result.TransferFunction;

  var transferTexture = updateTransferFunction();

  var screenSize = new THREE.Vector2( window.innerWidth, window.innerHeight );

  framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  backface_buffer = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, backface_buffer);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, window.innerWidth, window.innerHeight ,0, gl.RGBA, gl.FLOAT, null );
  gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, backface_buffer, 0);


  final_image = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, final_image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, window.innerWidth, window.innerHeight ,0, gl.RGBA, gl.FLOAT, null );
  

  renderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, window.innerWidth, window.innerHeight);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        

  rtTexture = new THREE.WebGLRenderTarget( screenSize.x, screenSize.y, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType } );

  //display shaders

  materialSecondPass = new THREE.ShaderMaterial({ vertexShader: document.getElementById('vertexShaderSecondPass').textContent,
                                                 fragmentShader: document.getElementById('fragmentShaderSecondPass').textContent,
                                                 side : THREE.DoubleSide,

                                                 uniforms: { frontside: {type: "t", value: rtTexture}, 
                                                             maxY: {type: "f", value: parseFloat((m))},
                                                             maxZ: {type: "f", value: parseFloat((k))},
                                                             maxX: {type: "f", value: parseFloat(n)},
                                                             volumetex: {type: "t", value: VolumeContent},
                                                             transferTex: {type: "t", value: transferTexture},
                                                             transferpalette: {type: "t", value: tranferTextureReal}, 
                                                             steps: {type: "1f", value: parseFloat(math.eval("sqrt(64^2+64^2+64^2)"))},
                                                             alphaFixed :{type: "1f", value: parseFloat(1.0)}}
                                                    });
  
  console.log(parseFloat(math.eval("sqrt(64^2+64^2+64^2)")));
  console.log("segundo pass",n,m,k);
  sceneSecondPass = new THREE.Scene();

  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );
  enable_renderbuffers();
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, backface_buffer, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);
  geometry = new THREE.BoxGeometry( 1.0, 1.0, 1.0 );
  geometry.doubleSide = true;
  gl.disable(gl.CULL_FACE);
  disable_renderbuffers();

  var meshSecondPass = new THREE.Mesh(geometry, materialSecondPass);

  sceneSecondPass.add( meshSecondPass );

  render = new THREE.WebGLRenderer();
  container.appendChild( renderer.domElement);

  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = "0px";
  container.appendChild( stats.domElement );

  
  onWindowResize();

  window.addEventListener('resize', onWindowResize, false);  
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

//Creation of transferfunction class or litteral ?


function create_volumetexture(f_volume,size,m,n,k)
{

  if (!gl.getExtension("OES_texture_float")) {
     throw("Requires OES_texture_float extension");
  }
  if (!gl.getExtension("OES_texture_float_linear")) {
     throw("Requires OES_texture_float extension");
  }
  
  var data = new Float32Array(size);
  var transferF = new Float32Array(256*4);
	var min = f_volume(0,0,0);
	var max = min;

  var result = 0;
  for(var y = 0; y < m; y++)
  {
    for(var z = 0; z < k; z++)
    {
      for(var x = 0; x < n; x++)
        {
        
            result = f_volume(x,y,z);
            data[x*m*n + z*n + y] = result;
  		      if (result<min) min =result;
  		      if (result>max) max =result;


        }
    }
  
  }
  for (var s = 255; s < 256 ; s++)
  {
    transferF[s] = (256-min)/(max-min);
    transferF[s+1] = (256-min)/(max-min);
    transferF[s+2] = 0;
    transferF[s+3] = 0;
  }
  console.log(transferF);
  result = 0;
  for(var y = 0; y < m; y++)
  {
    for(var z = 0; z < k; z++)
    {
      for(var x = 0; x < n; x++)
        {
          result = (data[x*m*n + z*n + y]-min)/(max-min);
          data[x*m*n + z*n + y] = result;
     
        }
    }
  }
  document.getElementById("minimum").innerHTML = min;
  document.getElementById("maximum").innerHTML = max;
  console.log(data);
  //console.log(data);

  // console.log(mTransferTex);
  var texture2 = new THREE.Texture();
  texture2.needsUpdate = false;
  texture2.__webglTexture = gl.createTexture();

  gl.bindTexture( gl.TEXTURE_2D, texture2.__webglTexture );
  var _width = 256;
  var _height = 1; 

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _width, _height,0, gl.RGBA, gl.FLOAT, transferF );
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture( gl.TEXTURE_2D, null );

  var texture = new THREE.Texture();
  texture.needsUpdate = false;
  texture.__webglTexture = gl.createTexture();

  gl.bindTexture( gl.TEXTURE_2D, texture.__webglTexture );
  var _width2 = n*k;
  var _height2 = m; 
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, _width2, _height2,0, gl.LUMINANCE, gl.FLOAT, data );
  //texture.__webglInit = false;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindTexture( gl.TEXTURE_2D, null );

  return {
    Volume          :texture,
    TransferFunction:texture2,
    MinAll          : min,
    MaxAll          : max,
  };
}


function updateTextures (value)
{
  materialSecondPass.uniforms.transferTex.value = updateTransferFunction();
}

function updateTransferFunction ()
{
  var canvas = document.createElement('canvas');
  canvas.height = 4;
  canvas.width = 256;

  var ctx = canvas.getContext('2d');

  var grd = ctx.createLinearGradient(0,0, canvas.width-1, canvas.height-1);
  grd.addColorStop(0.25,'rgba(255,255,255,0.2)');
  grd.addColorStop(0.15,'rgba(255,0,0,1)');

  ctx.fillStyle = grd;
  ctx.fillRect(0,0,canvas.width - 1, canvas.height -1);

  var img = document.getElementById("transferFunctionImg");
  img.src = canvas.toDataURL();
  img.style.width = "256 px";
  img.style.height = "128 px";

  transferTexture = new THREE.Texture(canvas);
  transferTexture.wrapS =  transferTexture.wrapT = THREE.ClampToEdgeWrapping;
  transferTexture.format = THREE.RGBAFormat;
  transferTexture.needsUpdate = true;

  return transferTexture;
}

function onWindowResize(event) 
{
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function enable_renderbuffers()
{
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
}

function disable_renderbuffers()
{
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render_backface()
{
  
  //drawquads
 
}

function animate()
{

  requestAnimationFrame( animate);

  rander();
  stats.update();

}

function rander() {

  var delta = clock.getDelta();

  enable_renderbuffers();
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, final_image, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  //Render the second pass and perform the volume rendering.
  renderer.render( sceneSecondPass, camara );
  gl.disable(gl.CULL_FACE);
  disable_renderbuffers();
  materialSecondPass.uniforms.steps.value = parseFloat(math.eval("sqrt(64^2+64^2+64^2)"));
  materialSecondPass.uniforms.alphaFixed.value = 1.0;
     
 }

