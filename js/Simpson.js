//pre definitions of Tranferfunction and Simpsons adaptative
  {
    Array.prototype.repeat = function(element, L){
      while(L) this[--L] = element;
      return this;
    };
  }

  
    var TF_BITS = 8;
    var TF_SIZE = (1<<TF_BITS);

    var d_tolerance = Number(5e-7);
    function get3dindex(i,j,hIndex)
    { 
      var result = (((hIndex)<<(TF_BITS<<1))  + ((j)<<TF_BITS)+(i));
      return result;
    }

    function get2DIndex(i,j)
    {
      return (((j)<<(TF_BITS+2))+(i<<2));
    }

    function clamp_rgba(input, minimum, maximum)
      {
        var result = [0,0,0,0];
      if (input[0] < minimum) 
        result[0] = minimum; 
      else if (input[0] > maximum) 
        result[0] = maximum; 
      if (input[1] < minimum) 
        result[1] = minimum; 
      else if (input[1] > maximum) 
        result[1] = maximum; 
      if (input[2] < minimum) 
        result[2] = minimum; 
      else if (input[2] > maximum) 
        result[2] = maximum; 
      if (input[3] < minimum) 
        result[3] = minimum; 
      else if (input[3] > maximum) 
        result[3] = maximum; 
      return result;
      }

    function cast_rgba(input, output)
      {
        var result = [0,0,0,0];
        result[0] = input[0];
        result[1] = input[1];
        result[2] = input[2];
        result[3] = input[3];
        return result;
      }

    function normalize_rgba(input, output, maximum) 
    {
      var result = [0,0,0,0];
      result[0] = input[0]/maximum;
      result[1] = input[1]/maximum;
      result[2] = input[2]/maximum;
      result[3] = input[3]/maximum;
      return result;
    }

    var CTFNode = function(r,g,b,y,x) {
      this.m_x = x;
      this.m_y = y;
      this.m_r = r;
      this.m_g = g;
      this.m_b = b;
      this.m_values = [this.m_r,this.m_g,this.m_b,this.m_y,this.m_x];
      this.IndexOf = function(index) {
        var result = 0;
        switch(index)
        {
          case 0 : result = this.m_r; break;
          case 1 : result = this.m_g; break;
          case 2 : result = this.m_b; break;
          case 3 : result = this.m_y; break;
          case 4 : result = this.m_x; break;
        }
        return result;
      };
      this.SetOf = function(index, valor)
      {
        switch(index)
        {
          case 0 : result = this.m_r = valor; break;
          case 1 : result = this.m_g = valor; break;
          case 2 : result = this.m_b = valor; break;
          case 3 : result = this.m_y = valor; break;
          case 4 : result = this.m_x = valor; break;
        }
      };
    };

    CTFNode.prototype.constructor = CTFNode;

    function RGBAf (r,g,b,a)
    {
      this.m_r = r;
      this.m_g = g;
      this.m_b = b;
      this.m_a = a;
      this.m_rgba = [this.m_r,this.m_g,this.m_b,this.m_a];
      this.IndexOf = function(index) {
        var result = 0;
        switch(index)
        {
          case 0 : result = this.m_r; break;
          case 1 : result = this.m_g; break;
          case 2 : result = this.m_b; break;
          case 3 : result = this.m_a; break;
        }
        return result;
      };
      this.SetOf = function(index, valor)
      {
        switch(index)
        {
          case 0 : result = this.m_r = valor; break;
          case 1 : result = this.m_g = valor; break;
          case 2 : result = this.m_b = valor; break;
          case 3 : result = this.m_a = valor; break;
        }
      };
    }

    RGBAf.prototype.constructor = RGBAf;

    function SimpsonAdaptative(m,b,am,xmin,scaling,diffY,diffX,err,middle,yMiddle,tolerance){
      this.m_m = m, 
      this.m_b = b, 
      this.m_am = am, 
      this.m_xmin = xmin, 
      this.m_scaling = scaling,
      this.m_diffY = diffY, 
      this.m_diffX = diffX, 
      this.m_err = err, 
      this.m_middle = middle, 
      this.m_yMiddle = yMiddle,
      this.m_tolerance = tolerance,
      this.m_deltaTF = 1.0/(TF_SIZE-1.0)
    }

    SimpsonAdaptative.prototype = {

        constructor: SimpsonAdaptative,

        m_m: new Number(0), m_b:new Number(0), m_am:new Number(0), m_xmin:new Number(0), m_scaling:new Number(0), m_diffY:new Number(0),
        m_diffX:new Number(0), m_err:new Number(0), m_middle:new Number(0), m_yMiddle:new Number(0), m_tolerance:new Number(0), m_deltaTF:1.0/(TF_SIZE-1.0),

        f: function(x){
          return (this.m_scaling *((this.m_m*x + this.m_b) * (this.m_am*x + this.m_ab)* math.exp(-this.m_scaling * (x-this.m_xmin) * ((0.5)*this.m_am*(x + this.m_xmin) + this.m_ab)))); 
        },

        SetCommonParameter: function(am, ab, xmin, scaling, tolerance){
          this.m_am = am;
          this.m_ab = ab;
          this.m_xmin = xmin;
          this.m_scaling = scaling;
          this.m_tolerance = tolerance;
        },

        Compute: function(m,b){
          this.m_m = m;
          this.m_b = b;
          var xmax = this.m_xmin+this.m_deltaTF;
          var fa = this.f(this.m_xmin);
          var fb = this.f(xmax);
          var fab = this.SimpsonRule(this.m_xmin,xmax,fa,fb);
          return this.AdaptiveSimpsonRule(this.m_xmin,xmax,fa,fb,fab,this.m_tolerance,0);
        },

        SimpsonRule: function(a,b,fa,fb)
        {
          return (b-a)/6.0 * (fa + 4*this.f((a+b)*0.5) + fb);
        },

        AdaptiveSimpsonRule: function(a,b,fa,fb,SRab,tolerance,depth)
        {
          var c = (a+b)*0.5;
          var fc = this.f(c);
          var SRac = this.SimpsonRule(a,c,fa,fc);
          var SRcb = this.SimpsonRule(c,b,fc,fb);

          if(Math.abs(SRab - SRcb - SRac) < tolerance)
            return SRac+SRcb;
          else
          {
            var VA = this.AdaptiveSimpsonRule(a,c,fa,fc,SRac,tolerance*0.5,depth++);
            var VB = this.AdaptiveSimpsonRule(c,b,fc,fb,SRcb,tolerance*0.5,depth++);
            return VA+VB;
          }
        }

    };

    function SimpsonA(m,b,xmin,scaling)
    {
      var result = [0,0,0,0];
      var sa = new SimpsonAdaptative();
      sa.SetCommonParameter(m[3], b[3], xmin, scaling, d_tolerance);
      
      result[0] = sa.Compute(m[0],b[0]);
      result[1] = sa.Compute(m[1],b[1]);
      result[2] = sa.Compute(m[2],b[2]);
      return result;
    }
   
    
      var n_n = (TF_SIZE);
      var m_nNodes = n_n;
      //var m_si = null;
      var m_divider = null;
      var m_minmax = null;

      var m_nodes= [].repeat(CTFNode,m_nNodes);
      var b_b    = [].repeat(RGBAf,m_nNodes);
      var m_b    = [].repeat(RGBAf,m_nNodes);
      var m_si   = [].repeat(RGBAf,(m_nNodes<<10));
      
      for(var i =0; i< m_nNodes; i++)
      {
        m_nodes[i] = new CTFNode(0,0,0,0,0,0);
        b_b[i] = new RGBAf(0,0,0,0);
        m_b[i] = new RGBAf(0,0,0,0);
      }
      for(var i=0; i< m_nNodes; i++)
      {
        for(var j=0; j< m_nNodes; j++)
          m_si[i*m_nNodes+j] = new RGBAf(0,0,0,0); 
      }
      


function Preintegration_Adaptative(mapa, delta0)
{
  var b = b_b;
  var m = m_b;

  var T = new Float32Array(TF_SIZE);
  var aux = [0,0,0,0], aux2 =  [0,0,0,0];
  var i,j,k,L,curve, indexUP, indexDOWN;

  var deltaTF = 1.0/(TF_SIZE-1.0);
  T[0] = 0.0;

  for (i=0; i<m_nNodes-1;i++){

    var x0 = m_nodes[i].m_x, x1 = m_nodes[i+1].m_x;
    if(x0 == x1)
      continue; //skip
    var start = Math.floor(x0*(TF_SIZE-1.0)+0.5);
    var stop  = Math.floor(x1*(TF_SIZE-1.0)+0.5);
    

    for(curve=0; curve<4; curve++)
    {
      var y0 = m_nodes[i].IndexOf(curve), y1 = m_nodes[i+1].IndexOf(curve);
      m[start].SetOf(curve, (y1 - y0)/(x1 - x0));
      b[start].SetOf(curve, -m[start].IndexOf(curve)* x0 + y0);
    }

    if(start > 0)
      T[start] = (deltaTF * (0.5 * m[(start-1)].IndexOf(3) * deltaTF * (2.0*start - 1) + b[(start-1)].IndexOf(3)) + T[start-1]);

    for(j=start+1; j<=stop; j++)
    {
      T[j] = (deltaTF * (0.5 * m[(j-1)].IndexOf(3) * deltaTF * (2.0*j - 1) + b[(j-1)].IndexOf(3)) + T[j-1]);
      m[j] = m[start];
      b[j] = b[start];
    }

   }

  var h = delta0;
  var xmin;
  //diagonal principal (L=0)
  for(i=0,xmin=0.0; i<TF_SIZE; i++,xmin+=deltaTF){
    var index = get2DIndex(i,i);
    var attenuation = Math.exp(-h *(m[i].IndexOf(3)*xmin + b[i].IndexOf(3))) -1.0;
 
    // color: -c(sf) * (exp(-h*t(s)) -1)
    aux[0] = -(m[i].IndexOf(0)*xmin + b[i].IndexOf(0)) * attenuation;
    aux[1] = -(m[i].IndexOf(1)*xmin + b[i].IndexOf(1)) * attenuation;
    aux[2] = -(m[i].IndexOf(2)*xmin + b[i].IndexOf(2)) * attenuation;
    // alpha: exp(-h * t(sf)), but, we store 1-exp because the blending function
    aux[3] = -attenuation;

    if(aux[0] < 0) aux[0] = 0.0; else if(aux[0] > 1) aux[0] = 1.0;
    if(aux[1] < 0) aux[1] = 0.0; else if(aux[1] > 1) aux[1] = 1.0;
    if(aux[2] < 0) aux[2] = 0.0; else if(aux[2] > 1) aux[2] = 1.0;
    if(aux[3] < 0) aux[3] = 0.0; else if(aux[3] > 1) aux[3] = 1.0;

    aux2 = aux;

    mapa[index] =   aux2[0];
    mapa[index+1] = aux2[1];
    mapa[index+2] = aux2[2];
    mapa[index+3] = aux2[3];
  }
  //diagonal (L=1)
  var scaling = h/deltaTF;
  for(i=0,j=1,xmin=0.0; j<TF_SIZE; i++,j++,xmin+=deltaTF){
    indexUP   = get2DIndex(i,j);
    indexDOWN = get2DIndex(j,i);
    var m_aux = [m[i].IndexOf(0),m[i].IndexOf(1),m[i].IndexOf(2),m[i].IndexOf(3)];
    var b_aux = [b[i].IndexOf(0),b[i].IndexOf(1),b[i].IndexOf(2),b[i].IndexOf(3)];

    aux = SimpsonA(m_aux,b_aux,xmin,scaling);

    aux[3] = 1.0 - Math.exp(-scaling * (T[j]-T[i]));  
    if(aux[0] < 0) aux[0] = 0.0; else if(aux[0] > 1) aux[0] = 1.0;
    if(aux[1] < 0) aux[1] = 0.0; else if(aux[1] > 1) aux[1] = 1.0;
    if(aux[2] < 0) aux[2] = 0.0; else if(aux[2] > 1) aux[2] = 1.0;
    if(aux[3] < 0) aux[3] = 0.0; else if(aux[3] > 1) aux[3] = 1.0;

    aux2 = aux;
    mapa[indexDOWN]   = mapa[indexUP]   = aux2[0];
    mapa[indexDOWN+1] = mapa[indexUP+1] = aux2[1];
    mapa[indexDOWN+2] = mapa[indexUP+2] = aux2[2];
    mapa[indexDOWN+3] = mapa[indexUP+3] = aux2[3];
  }

  // for each other length l>2(general case)
  for(L=2; L<(TF_SIZE);L++){
   
    scaling = h/(L*deltaTF);
    
    for(i=0,j=i+1,xmin=0.0; j<TF_SIZE; i++,j++,xmin+=deltaTF)
    {
      var m_aux = [m[i].IndexOf(0),m[i].IndexOf(1),m[i].IndexOf(2),m[i].IndexOf(3)];
      var b_aux = [b[i].IndexOf(0),b[i].IndexOf(1),b[i].IndexOf(2),b[i].IndexOf(3)];
      var aux_msi = SimpsonA(m_aux,b_aux,xmin,scaling);
      //.log(aux_msi);
      m_si[(i*TF_SIZE)+(j)].SetOf(0,aux_msi[0]);
      m_si[(i*TF_SIZE)+(j)].SetOf(1,aux_msi[1]);
      m_si[(i*TF_SIZE)+(j)].SetOf(2,aux_msi[2]);
      m_si[(i*TF_SIZE)+(j)].SetOf(3,Math.exp(-scaling*(T[j]-T[i])));
    }

    for(i=L-1; i<TF_SIZE; i+=L) for (j=i+2; (j<=i+L) && (j<TF_SIZE); j++)
    {
      //composite
      m_si[(i*TF_SIZE)+(j)].SetOf(0,  m_si[(i*TF_SIZE)+(j-1)].IndexOf(0) +  m_si[(i*TF_SIZE)+(j-1)].IndexOf(3) *  m_si[((j-1)*TF_SIZE)+(j)].IndexOf(0));
      m_si[(i*TF_SIZE)+(j)].SetOf(1,  m_si[(i*TF_SIZE)+(j-1)].IndexOf(1) +  m_si[(i*TF_SIZE)+(j-1)].IndexOf(3) *  m_si[((j-1)*TF_SIZE)+(j)].IndexOf(1));
      m_si[(i*TF_SIZE)+(j)].SetOf(2,  m_si[(i*TF_SIZE)+(j-1)].IndexOf(2) +  m_si[(i*TF_SIZE)+(j-1)].IndexOf(3) *  m_si[((j-1)*TF_SIZE)+(j)].IndexOf(2));
      m_si[(i*TF_SIZE)+(j)].SetOf(3,   Math.exp(-scaling *(T[j]-T[i])));
    }

    for (j=L-1; j<TF_SIZE; j+=L) for (i=j-2; i>j-L; i--)
    {
      //composite
      m_si[(i*TF_SIZE)+(j)].SetOf(0, m_si[(i*TF_SIZE)+(i+1)].IndexOf(0) +  m_si[(i*TF_SIZE)+(i+1)].IndexOf(3) * m_si[((i+1)*TF_SIZE)+(j)].IndexOf(0));
      m_si[(i*TF_SIZE)+(j)].SetOf(1, m_si[(i*TF_SIZE)+(i+1)].IndexOf(1) +  m_si[(i*TF_SIZE)+(i+1)].IndexOf(3) * m_si[((i+1)*TF_SIZE)+(j)].IndexOf(1));
      m_si[(i*TF_SIZE)+(j)].SetOf(2, m_si[(i*TF_SIZE)+(i+1)].IndexOf(2) +  m_si[(i*TF_SIZE)+(i+1)].IndexOf(3) * m_si[((i+1)*TF_SIZE)+(j)].IndexOf(2));
      m_si[(i*TF_SIZE)+(j)].SetOf(3,  Math.exp(-scaling *(T[j]-T[i])));
    }
    for (i=0,j=L; j<TF_SIZE; i++,j++){
      indexUP   = get2DIndex(i,j);
      indexDOWN = get2DIndex(j,i);
      k = i+L-1-(j%L);
      if (k==i){
        aux[0] = m_si[(i*TF_SIZE)+(j)].IndexOf(0);
        aux[1] = m_si[(i*TF_SIZE)+(j)].IndexOf(1);
        aux[2] = m_si[(i*TF_SIZE)+(j)].IndexOf(2);
        aux[3] = 1.0 - m_si[(i*TF_SIZE)+(j)].IndexOf(3);
      }
      else{
        aux[0] = m_si[(i*TF_SIZE)+(k)].IndexOf(0) + m_si[(i*TF_SIZE)+(k)].IndexOf(3) * m_si[(k*TF_SIZE)+(j)].IndexOf(0);
        aux[1] = m_si[(i*TF_SIZE)+(k)].IndexOf(1) + m_si[(i*TF_SIZE)+(k)].IndexOf(3) * m_si[(k*TF_SIZE)+(j)].IndexOf(1);
        aux[2] = m_si[(i*TF_SIZE)+(k)].IndexOf(2) + m_si[(i*TF_SIZE)+(k)].IndexOf(3) * m_si[(k*TF_SIZE)+(j)].IndexOf(2);
        aux[3] = 1.0 - Math.exp(-scaling *(T[j]-T[i]));
      }
      if(aux[0] < 0) aux[0] = 0; else if(aux[0] > 1) aux[0] = 1;
      if(aux[1] < 0) aux[1] = 0; else if(aux[1] > 1) aux[1] = 1;
      if(aux[2] < 0) aux[2] = 0; else if(aux[2] > 1) aux[2] = 1;
      if(aux[3] < 0) aux[3] = 0; else if(aux[3] > 1) aux[3] = 1;
      aux2 = aux;
      mapa[indexDOWN]   = mapa[indexUP]   = aux2[0];
      mapa[indexDOWN+1] = mapa[indexUP+1] = aux2[1];
      mapa[indexDOWN+2] = mapa[indexUP+2] = aux2[2];
      mapa[indexDOWN+3] = mapa[indexUP+3] = aux2[3];
      
    }
  }
  //return mapa;
}


