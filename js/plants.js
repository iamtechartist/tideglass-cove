import {THREE,U,geom,mesh,rand,height,standard,bakeMerge} from './core.js';
import {positionLocal,positionWorld,normalWorld,attribute,sin,cos,float,vec3,mix,color,max,dot,pow,mx_noise_float} from 'three/tsl';

// Every connected palm part shares the same anchor displacement. Only free tips flutter.
function palmWind(mat){const p=positionLocal,a=attribute('windAnchor','vec4'),w=attribute('windWeight','vec3'),t=U.time;
 const gust=sin(t.mul(.66).add(a.x.mul(.36)).add(a.y.mul(.3))).mul(.072).add(sin(t.mul(1.03).add(a.z)).mul(.018));
 const trunk=vec3(gust,0,gust.mul(.48)).mul(w.x);
 const bend=vec3(cos(a.w).mul(.6),.33,sin(a.w).mul(.6)).mul(sin(t.mul(.82).add(a.z).add(a.w.mul(.22)))).mul(.058).mul(w.y);
 const flutter=vec3(sin(t.mul(2.1).add(a.w)),cos(t.mul(1.7).add(a.w)).mul(.3),0).mul(w.z).mul(.006);
 mat.positionNode=p.add(trunk.add(bend).add(flutter).mul(U.breeze.mul(.78).add(.18)));return mat;
}
function attributes(g,anchors,weights){g.deleteAttribute('uv');g.setAttribute('windAnchor',new THREE.Float32BufferAttribute(anchors,4));g.setAttribute('windWeight',new THREE.Float32BufferAttribute(weights,3));return g;}
function fixedAttributes(g,anchor,weight){const a=[],w=[];for(let i=0;i<g.attributes.position.count;i++){a.push(...anchor);w.push(...weight);}return attributes(g,a,w);}
export function buildPlants(scene){
 const greens=['#31572f','#426b35','#54743e','#365f33','#547645','#31533a'].map(c=>new THREE.Color(c));
 const leafMat=palmWind(standard('#ffffff',.77));leafMat.vertexColors=true;leafMat.side=THREE.DoubleSide;
 leafMat.emissiveNode=color('#75914d').mul(pow(max(dot(normalWorld.negate(),U.sun),0),2)).mul(.075).mul(float(1).sub(U.night.mul(.93)));
 const trunkMat=palmWind(standard('#958664',.94));trunkMat.colorNode=mix(color('#74654b'),color('#b29e73'),mx_noise_float(positionWorld.mul(vec3(8,18,8))).mul(.24).add(.48)).mul(sin(positionWorld.y.mul(52).add(mx_noise_float(positionWorld.mul(4)))).mul(.035).add(1));
 const stemMat=palmWind(standard('#6d7950',.89));const trunkGeos=[],leafGeos=[],stemGeos=[];
 const palmSpecs=[[-4.35,-2.54,3.38,-.58,.30,2.08,15],[-2.18,-3.82,4.48,-.32,.07,2.22,17],[.47,-3.64,3.8,.27,.1,2.04,15],[2.42,-2.77,3.0,.65,.58,1.88,13],[-5,-.49,2.83,1,.62,1.83,14]],bounds=[];
 for(let k=0;k<palmSpecs.length;k++){
  const [x,z,h,lx,lz,L,F]=palmSpecs[k],base=height(x,z)-.045,phase=rand()*6;
  const trunk=t=>new THREE.Vector3(x+lx*t*t+.06*Math.sin(t*3+phase)*t,base+h*t,z+lz*t*t);
  const p=[],ix=[],wa=[],ww=[],steps=100,around=14;
  for(let i=0;i<=steps;i++){const t=i/steps,c=trunk(t),radius=(.12*(1-t*.53)+.032*Math.exp(-t*20))*(1+.025*Math.sin(i*3.5+phase)),rings=1+.045*Math.pow(.5+.5*Math.sin(t*h*43+Math.sin(t*12)*.4),8);for(let j=0;j<=around;j++){const a=j/around*Math.PI*2,r=radius*rings*(1+.05*Math.sin(a*3+t*8));p.push(c.x+Math.cos(a)*r,c.y+.006*Math.sin(a*2+t*15),c.z+Math.sin(a)*r);wa.push(x,z,phase,0);ww.push(t*t,0,0);if(i<steps&&j<around){const n=i*(around+1)+j;ix.push(n,n+around+1,n+1,n+1,n+around+1,n+around+2);}}}
  trunkGeos.push(attributes(geom(p,ix),wa,ww));const crown=trunk(1);bounds.push(crown.clone().add(new THREE.Vector3(0,.7,0)));
  for(let f=0;f<F;f++){
   const young=f>=F-3,a=f/F*Math.PI*2+phase+rand()*.44,len=L*(young?.49+rand()*.17:.77+rand()*.32),lift=young?.8+rand()*.55:.25+rand()*.54,droop=young?.13+rand()*.12:.55+rand()*.90;
   const dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),side=new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),curl=(rand()-.5)*.28;
   const mid=t=>crown.clone().addScaledVector(dir,len*t).addScaledVector(side,Math.sin(t*Math.PI)*curl).add(new THREE.Vector3(0,lift*Math.sin(Math.PI*t*.91)-droop*t*t,0));
   const lp=[],li=[],lc=[],la=[],lw=[],pairs=young?21:25+Math.floor(rand()*7);let spacing=.042;
   for(let j=0;j<pairs;j++){
    const t0=.045+(j/(pairs-1))*.915+(rand()-.5)*.014;if(rand()<.055&&j>8)continue;
    for(const s of [-1,1]){
     const t=Math.max(.02,Math.min(.986,t0+(s>0?.009:0))),o=mid(t),ll=(.05+.55*Math.pow(Math.sin(Math.PI*t),.82))*(.75+rand()*.36)*(len/2.05),width=(.022+Math.sin(t*Math.PI)*.022)*(young?.8:1),twist=(rand()-.5)*.8;
     const leafColor=greens[(f*3+k+Math.floor(j/5))%greens.length].clone().multiplyScalar(.91+rand()*.17),off=lp.length/3,segments=7;
     for(let i=0;i<=segments;i++){const q=i/segments,pc=o.clone().addScaledVector(side,s*ll*q).addScaledVector(dir,ll*(.16*q+.35*q*q)).add(new THREE.Vector3(0,-(.08*q+.57*q*q)*ll+Math.sin(q*Math.PI)*twist*.07,0)),wd=Math.sin(Math.PI*Math.pow(q,.65))*width;
      for(let e=0;e<3;e++){const pp=pc.clone().addScaledVector(dir,(e-1)*wd*Math.cos(twist*q));pp.y+=(e===1?wd*.27:(e-1)*wd*Math.sin(twist*q));lp.push(pp.x,pp.y,pp.z);la.push(x,z,phase,a);lw.push(1,t*t,q*q);const c=leafColor.clone().multiplyScalar(e===1?1.025:.96);if(q>.85&&j>pairs-5&&!young)c.lerp(new THREE.Color('#8d8656'),.12);lc.push(c.r,c.g,c.b);}if(i<segments)for(let e=0;e<2;e++){const n=off+i*3+e;li.push(n,n+3,n+1,n+1,n+3,n+4);}
     }
    }
   }
   leafGeos.push(attributes(geom(lp,li,null,lc),la,lw));
   const curve=new THREE.CatmullRomCurve3(Array.from({length:21},(_,j)=>mid(j/20))),sg=new THREE.TubeGeometry(curve,32,young?.009:.011,5),sa=[],sw=[];
   for(let j=0;j<=32;j++)for(let q=0;q<=5;q++){sa.push(x,z,phase,a);sw.push(1,(j/32)**2,0);}stemGeos.push(attributes(sg,sa,sw));
  }
  // Fitted leaf bases soften the transition into each crown.
  for(let c=0;c<7;c++){const angle=c/7*6.28,sg=new THREE.SphereGeometry(.075,9,7);sg.scale(.67,3,1);sg.rotateZ(Math.sin(angle)*.23);sg.rotateX(Math.cos(angle)*.23);sg.translate(crown.x+Math.sin(angle)*.07,crown.y-.045,crown.z+Math.cos(angle)*.07);stemGeos.push(fixedAttributes(sg,[x,z,phase,0],[1,0,0]));}
  for(let c=0;c<3;c++){const cg=new THREE.SphereGeometry(.10,10,7);cg.scale(.87,1.1,1);cg.translate(crown.x+Math.sin(c*2)*.12,crown.y-.17,crown.z+Math.cos(c*2)*.12);trunkGeos.push(fixedAttributes(cg,[x,z,phase,0],[1,0,0]));}
  for(let j=0;j<6;j++){const a=j/6*6.28,points=[new THREE.Vector3(x,base+.14,z),new THREE.Vector3(x+Math.cos(a)*.17,base+.03,z+Math.sin(a)*.17),new THREE.Vector3(x+Math.cos(a)*.30,height(x+Math.cos(a)*.30,z+Math.sin(a)*.30)+.005,z+Math.sin(a)*.30)],g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.022,5);trunkGeos.push(fixedAttributes(g,[x,z,phase,0],[0,0,0]));}
 }
 const trunks=bakeMerge(trunkGeos,trunkMat,scene),leaves=bakeMerge(leafGeos,leafMat,scene),stems=bakeMerge(stemGeos,stemMat,scene);trunks.name='Tapered scarred palm trunks';leaves.name='Varied folded palm pinnae';stems.name='Attached rachises and crown sheaths';
 // Creeping stems, petioles, and broad leaves form recognizable connected plants.
 const groundGeos=[],petioles=[];
 const clusters=[[-4.55,-2.8,.62],[-1.1,-3.88,.78],[.65,-3.42,.64],[2.76,-2.35,.55],[-5,-.9,.48],[4.40,-2.6,.37]];
 for(const [cx,cz,size] of clusters){for(let plant=0;plant<5;plant++){
  const x=cx+(rand()-.5)*size*1.4,z=cz+(rand()-.5)*size*1.4,y=height(x,z)+.014,phase=rand()*6,heading=rand()*6.28;
  const nodes=Array.from({length:4},(_,j)=>{const xx=x+Math.cos(heading)*j*.10,zz=z+Math.sin(heading)*j*.10;return new THREE.Vector3(xx,height(xx,zz)+.016,zz);});const stalk=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nodes),12,.009,5);petioles.push(fixedAttributes(stalk,[x,z,phase,0],[0,0,0]));
  for(let j=0;j<5;j++){
   const root=nodes[j%4],a=heading+j*2.45,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)),side=new THREE.Vector3(-Math.sin(a),0,Math.cos(a)),length=.24+rand()*.17,leafBase=root.clone().addScaledVector(dir,.045).add(new THREE.Vector3(0,.10+rand()*.10,0));
   const petiole=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([root,root.clone().lerp(leafBase,.5).add(new THREE.Vector3(0,.025,0)),leafBase]),9,.006,4),pa=[],pw=[];
   for(let i=0;i<=9;i++)for(let q=0;q<=4;q++){pa.push(x,z,phase,a);pw.push(i/9*.15,0,0);}petioles.push(attributes(petiole,pa,pw));
   const pp=[],pi=[],pc=[],pa2=[],pw2=[],col=greens[(plant+j)%greens.length];
   for(let i=0;i<=10;i++){const t=i/10,center=leafBase.clone().addScaledVector(dir,length*t);center.y+=length*(.36*Math.sin(Math.PI*t)-.18*t*t);for(let e=0;e<5;e++){const r=(e-2)/2,w=length*.34*Math.pow(Math.sin(t*Math.PI),.72),v=center.clone().addScaledVector(side,r*w);v.y-=Math.abs(r)*w*.21;pp.push(v.x,v.y,v.z);pc.push(col.r*(1+e*.011),col.g*(1+e*.008),col.b);pa2.push(x,z,phase,a);pw2.push(.15,0,t*t*.16);if(i<10&&e<4){const n=i*5+e;pi.push(n,n+5,n+1,n+1,n+5,n+6);}}}
   groundGeos.push(attributes(geom(pp,pi,null,pc),pa2,pw2));
  }
 }}
 const ground=bakeMerge(groundGeos,leafMat,scene);ground.name='Connected beach creepers';bakeMerge(petioles,stemMat,scene);
 const grassMat=standard('#55735c',.95);grassMat.side=THREE.DoubleSide;const w=attribute('flex','float'),p=positionLocal;
 grassMat.positionNode=p.add(vec3(sin(U.time.mul(.43).add(p.x.mul(.7))).mul(.032),0,cos(U.time.mul(.37).add(p.z)).mul(.018)).mul(w));
 const gp=[],gx=[],gw=[];for(const [cx,cz,s] of [[-3.4,2.7,.58],[4.26,2.57,.52],[1.64,3.8,.42],[.66,2.36,.28],[3.77,.92,.40],[-4.55,1.8,.35]])for(let j=0;j<34;j++){
  const x=cx+(rand()-.5)*s,z=cz+(rand()-.5)*s,y=height(x,z),h=.18+rand()*.30,a=rand()*6.28,off=gp.length/3;
  for(let i=0;i<=7;i++){const t=i/7,w=.015*(1-t)+.0005;for(let e=0;e<2;e++){gp.push(x+Math.sin(a)*h*t*t+Math.cos(a)*w*(e*2-1),y+h*t,z+Math.cos(a)*h*t*t+Math.sin(a)*w*(e*2-1));gw.push(t*t);}if(i<7){const n=off+i*2;gx.push(n,n+2,n+1,n+1,n+2,n+3);}}
 }
 const grass=geom(gp,gx);grass.setAttribute('flex',new THREE.Float32BufferAttribute(gw,1));mesh(grass,grassMat,scene);
 return {trunks,leaves,stems,bounds,ground};
}
