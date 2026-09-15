import {THREE,U,mesh,geom,tube,rod,standard,height,rand} from './core.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {positionLocal,positionWorld,color,mix,smoothstep,mx_noise_float,float,sin,vec3,attribute,uv,max,pow,uniform} from 'three/tsl';

function roundPath(x,y,w,h,r=.07,Path=THREE.Path){const s=new Path();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
function panel(shape,depth,mat,parent,pos){return mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.013,bevelThickness:.012,bevelSegments:2,steps:1,curveSegments:14}),mat,parent,pos)}
function rounded(w,h,d,r,mat,parent,pos,rot){return mesh(new RoundedBoxGeometry(w,h,d,3,r),mat,parent,pos,rot)}
export function buildCamper(scene){
 const group=new THREE.Group();scene.add(group);group.position.set(-2.48,height(-2.48,-1.96)+.005,-2.52);group.rotation.y=-.13;group.userData.pickRole='camper';
 const cream=standard('#e7e2ce',.33,.04),terra=standard('#a65c49',.40,.05),chrome=standard('#9aa9a4',.29,.74),rubber=standard('#242b28',.86),timber=standard('#99714b',.72),trim=standard('#4e625c',.38,.45),upholstery=standard('#9b9d77',.88),dark=standard('#46514b',.84);
 const bodyY=uniform(group.position.y);const paint=standard('#ffffff',.36,.05);const localHeight=positionWorld.y.sub(bodyY);paint.colorNode=mix(color('#a65c49'),color('#e7e2ce'),smoothstep(1.027,1.037,localHeight)).mul(mx_noise_float(positionWorld.mul(62)).mul(.015).add(1));paint.roughnessNode=mix(.48,.34,smoothstep(.49,.8,localHeight));
 const glass=new THREE.MeshPhysicalNodeMaterial({color:'#87b9b7',metalness:0,roughness:.17,transmission:0,transparent:true,opacity:.43,ior:1.46,thickness:.035,side:THREE.DoubleSide,depthWrite:false});
 glass.forceSinglePass=true;
 const full=new THREE.Shape();full.moveTo(-1.6,.52);full.lineTo(-1.62,1.55);full.bezierCurveTo(-1.58,1.74,-1.39,1.87,-1.11,1.88);full.lineTo(.89,1.88);full.bezierCurveTo(1.04,1.88,1.13,1.78,1.18,1.70);full.lineTo(1.56,1.12);full.quadraticCurveTo(1.69,.82,1.62,.54);full.lineTo(1.40,.50);full.absarc(1.045,.50,.355,0,Math.PI,false);full.lineTo(-.69,.50);full.absarc(-1.045,.50,.355,0,Math.PI,false);full.lineTo(-1.6,.52);
 const windows=[[-1.32,1.2,.81,.46],[.65,1.18,.52,.43]];
 for(const z of [-.745,.705]){
  const body=full.clone();for(const w of windows)body.holes.push(roundPath(...w));if(z>0)body.holes.push(roundPath(-.33,.55,.72,1.17,.035));else body.holes.push(roundPath(-.3,1.2,.72,.46));
  const shell=panel(body,.04,paint,group,[0,0,z]);shell.name='Sculpted touring camper side shell';
  for(const w of [...windows,...(z<0?[[-.3,1.2,.72,.46]]:[])]){
   const [x,y,ww,hh]=w;const frame=roundPath(x-.025,y-.025,ww+.05,hh+.05,.095,THREE.Shape);frame.holes.push(roundPath(x+.018,y+.018,ww-.036,hh-.036,.047));panel(frame,.013,chrome,group,[0,0,z+(z>0?.049:-.021)]);
   mesh(new THREE.ShapeGeometry(roundPath(x+.012,y+.012,ww-.024,hh-.024,.052,THREE.Shape),16),glass,group,[0,0,z+(z>0?.044:-.01)]);
   rod([x+ww*.5,y+.025,z+(z>0?.065:-.03)],[x+ww*.5,y+hh-.02,z+(z>0?.065:-.03)],.009,trim,group);
  }
  // Finely relieved arch lips and sculptural lower sills.
  for(const x of [-1.045,1.045]){const arc=[];for(let i=0;i<=22;i++)arc.push([x+Math.cos(i/22*Math.PI)*.371,.50+Math.sin(i/22*Math.PI)*.371,z+(z>0?.046:-.012)]);tube(arc,.018,cream,group,22,6)}
  for(const [a,b] of [[-1.53,-1.41],[-.67,-.36],[.42,.67],[1.42,1.55]])rod([a,.57,z+(z>0?.067:-.016)],[b,.57,z+(z>0?.067:-.016)],.018,chrome,group);
 }
 // The roof, rear cap and windshield frame share their boundary curves.
 const roofCurve=new THREE.CurvePath();roofCurve.add(new THREE.CubicBezierCurve3(new THREE.Vector3(-1.62,1.55,0),new THREE.Vector3(-1.58,1.74,0),new THREE.Vector3(-1.39,1.87,0),new THREE.Vector3(-1.11,1.88,0)));roofCurve.add(new THREE.LineCurve3(new THREE.Vector3(-1.11,1.88,0),new THREE.Vector3(.89,1.88,0)));roofCurve.add(new THREE.CubicBezierCurve3(new THREE.Vector3(.89,1.88,0),new THREE.Vector3(1.04,1.88,0),new THREE.Vector3(1.13,1.78,0),new THREE.Vector3(1.18,1.70,0)));
 const roofPoints=roofCurve.getPoints(72),rp=[],ri=[];
 for(let i=0;i<roofPoints.length;i++)for(let j=0;j<=24;j++){const v=j/24,p=roofPoints[i];rp.push(p.x,p.y+.09*Math.sin(v*Math.PI),-.745+v*1.49);if(i<roofPoints.length-1&&j<24){const n=i*25+j;ri.push(n,n+1,n+25,n+1,n+26,n+25);}}
 const roofMat=cream.clone();roofMat.side=THREE.DoubleSide;const roof=mesh(geom(rp,ri),roofMat,group);roof.name='Continuous rolled roof';
 const rearShape=new THREE.Shape();rearShape.moveTo(-.745,.53);rearShape.lineTo(.745,.53);rearShape.lineTo(.745,1.55);for(let j=1;j<=24;j++){const v=j/24;rearShape.lineTo(.745-v*1.49,1.55+.09*Math.sin(v*Math.PI));}rearShape.closePath();rearShape.holes.push(roundPath(-.50,1.135,1,.345,.065));
 const rear=panel(rearShape,.04,paint,group,[-1.62,0,0]);rear.rotation.y=-Math.PI/2;rear.name='Enclosed rear body with framed window';
 const rearFrame=roundPath(-.526,1.11,1.052,.395,.085,THREE.Shape);rearFrame.holes.push(roundPath(-.477,1.154,.954,.308,.055));const rearRim=panel(rearFrame,.015,chrome,group,[-1.644,0,0]);rearRim.rotation.y=-Math.PI/2;
 mesh(new THREE.ShapeGeometry(roundPath(-.482,1.15,.964,.32,.055,THREE.Shape)),glass,group,[-1.649,0,0],[0,-Math.PI/2,0]);
 // Map both panes and surrounding cowl onto one continuous sloped front surface.
 const frontPoint=(z,v)=>[1.56-.38*v,1.12+v*(.58+.09*Math.sin((z+.745)/1.49*Math.PI)),z];
 function frontGeometry(shape){const g=new THREE.ShapeGeometry(shape,18),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...frontPoint(p.getX(i),p.getY(i)));g.computeVertexNormals();return g;}
 const frontFrame=roundPath(-.745,0,1.49,1,.012,THREE.Shape);for(const z of [-.646,.039])frontFrame.holes.push(roundPath(z,.065,.607,.868,.045));const frontMat=cream.clone();frontMat.side=THREE.DoubleSide;mesh(frontGeometry(frontFrame),frontMat,group);
 for(const z of [-.646,.039]){mesh(frontGeometry(roundPath(z+.008,.073,.591,.852,.037,THREE.Shape)),glass,group);const points=roundPath(z,.065,.607,.868,.045).getPoints(24).map(v=>frontPoint(v.x,v.y));tube(points,.009,chrome,group,50,6);}
 rounded(.14,.57,1.47,.047,paint,group,[1.57,.815,0],[0,0,.07]);
 for(const z of [-.746,.746])tube(roofPoints.map(p=>[p.x,p.y-.014,z]),.013,chrome,group,76,6);
 // Closed floor pan, axle beams and dark wheel housings remain readable from below.
 rounded(2.96,.11,1.23,.035,dark,group,[0,.47,0]);
 for(const x of [-1.045,1.045]){rod([x,.34,-.64],[x,.34,.64],.043,dark,group);for(const z of [-.65,.65]){const a=[];for(let i=0;i<=22;i++)a.push([x+Math.cos(i/22*Math.PI)*.346,.50+Math.sin(i/22*Math.PI)*.346,z]);tube(a,.048,dark,group,22,8);}}
 rounded(.1,.12,1.39,.035,chrome,group,[1.65,.51,0]);rounded(.13,.10,1.38,.035,chrome,group,[-1.66,.49,0]);
 const lampMat=new THREE.MeshStandardNodeMaterial({color:'#f0e8cf',roughness:.19,emissive:'#f6d296',emissiveIntensity:.16});
 for(const z of [-.52,.52]){mesh(new THREE.CylinderGeometry(.105,.105,.025,24),chrome,group,[1.675,.84,z],[0,0,-Math.PI/2]);mesh(new THREE.CylinderGeometry(.083,.083,.03,24),lampMat,group,[1.69,.84,z],[0,0,-Math.PI/2]);rounded(.023,.085,.15,.024,standard('#d99851',.3),group,[1.665,.66,z]);rounded(.037,.19,.075,.024,standard('#b25746',.26),group,[-1.65,.77,z]);}
 for(let i=0;i<7;i++)rounded(.025,.012,.52,.006,trim,group,[1.691,.66+i*.036,0]);
 for(const x of [-1.045,1.045])for(const z of [-.73,.73]){
  const tire=mesh(new THREE.TorusGeometry(.25,.097,12,40),rubber,group,[x,.33,z]);tire.scale.set(1,1,1.18);
  mesh(new THREE.CylinderGeometry(.183,.183,.055,32),cream,group,[x,.33,z+(z>0?.08:-.08)],[Math.PI/2,0,0]);
  mesh(new THREE.SphereGeometry(.114,20,12),chrome,group,[x,.33,z+(z>0?.116:-.116)]).scale.set(1,1,.35);
  for(let k=0;k<5;k++){const a=k/5*Math.PI*2;mesh(new THREE.SphereGeometry(.015,6,4),chrome,group,[x+Math.cos(a)*.14,.33+Math.sin(a)*.14,z+(z>0?.114:-.114)])}
 }
 // A short-range contact shadow follows the sand independently of sun angle.
 // This keeps the tires seated during both bright daylight and the dusk fill.
 for(const [x,z,rx,rz,opacity] of [[0,0,1.46,.75,.15],...[-1.045,1.045].flatMap(x=>[-.73,.73].map(z=>[x,z,.30,.19,.36]))]){
  const g=new THREE.PlaneGeometry(rx*2,rz*2,12,12);g.rotateX(-Math.PI/2);g.rotateY(group.rotation.y);const p=g.attributes.position,cx=group.position.x+Math.cos(-.13)*x+Math.sin(-.13)*z,cz=group.position.z-Math.sin(-.13)*x+Math.cos(-.13)*z;for(let i=0;i<p.count;i++){const xx=p.getX(i)+cx,zz=p.getZ(i)+cz;p.setXYZ(i,xx,height(xx,zz)+.009,zz);}g.computeVertexNormals();
  const m=new THREE.MeshBasicNodeMaterial({color:'#45463a',transparent:true,depthWrite:false});m.opacityNode=pow(max(float(1).sub(uv().sub(.5).length().mul(2)),0),1.4).mul(opacity);const contact=mesh(g,m,scene);contact.userData.noPick=true;contact.castShadow=false;contact.receiveShadow=false;
 }
 // Interior depth: timber floor, lined walls, bench, cabinets, driver seats and wheel.
 rounded(2.97,.095,1.30,.02,timber,group,[0,.57,0]);
 for(const z of [-.53,.42]){rounded(.55,.30,.43,.06,upholstery,group,[.83,.79,z]);rounded(.16,.54,.43,.06,upholstery,group,[.64,1.05,z],[0,0,-.10]);}
 rounded(.56,.30,1.22,.05,upholstery,group,[-1.13,.77,0]);rounded(.13,.39,1.19,.04,upholstery,group,[-1.40,1.08,0]);
 rounded(.61,.59,.38,.035,timber,group,[-.21,.90,-.48]);rounded(.67,.047,.43,.015,cream,group,[-.21,1.21,-.48]);
 for(let i=0;i<3;i++){rod([-.47,.74+i*.145,-.277],[.046,.74+i*.145,-.277],.006,trim,group);rod([-.24,.81+i*.145,-.26],[-.12,.81+i*.145,-.26],.009,chrome,group)}
 rounded(.66,.035,.55,.08,timber,group,[-.61,1.02,.19]);rod([-.61,.61,.19],[-.61,1.0,.19],.03,chrome,group);
 const wheel=mesh(new THREE.TorusGeometry(.13,.016,6,24),trim,group,[1.22,1.19,.4],[0,Math.PI/2,-.5]);rod([1.22,1.08,.4],[1.22,.75,.4],.028,trim,group);
 // Side-hinged door: transform origin is the forward vertical hinge.
 const jamb=roundPath(-.345,.532,.75,1.20,.044,THREE.Shape);jamb.holes.push(roundPath(-.31,.574,.68,1.125,.03));panel(jamb,.065,trim,group,[0,0,.700]);
 const hinge=new THREE.Group();hinge.position.set(.39,0,.772);group.add(hinge);hinge.userData.dynamic=true;
 const doorShape=roundPath(-.70,.558,.68,1.145,.04,THREE.Shape);doorShape.holes.push(roundPath(-.605,1.21,.49,.405,.055));const door=panel(doorShape,.045,paint,hinge,[0,0,0]);
 const doorFrame=roundPath(-.625,1.19,.53,.445,.07,THREE.Shape);doorFrame.holes.push(roundPath(-.59,1.225,.46,.375,.045));panel(doorFrame,.01,chrome,hinge,[0,0,.054]);mesh(new THREE.ShapeGeometry(roundPath(-.59,1.225,.46,.375,.045,THREE.Shape)),glass,hinge,[0,0,.064]);
 rod([-.612,1.04,.075],[-.49,1.04,.075],.015,chrome,hinge);rounded(.60,.03,.31,.02,chrome,group,[.01,.42,.91]);
 for(const y of [.81,1.51])rounded(.04,.11,.065,.012,chrome,group,[.385,y,.777]);
 // Mirrors, wipers and restrained roof-rack details.
 for(const z of [-.84,.84]){rod([1.16,1.29,z*.9],[1.31,1.25,z*1.15],.015,chrome,group);rounded(.065,.16,.10,.035,trim,group,[1.31,1.32,z*1.16]);rounded(.069,.13,.08,.025,chrome,group,[1.314,1.32,z*1.16]);}
 for(const z of [-.31,.31])rod([1.57,1.16,z],[1.45,1.34,z+.12],.009,trim,group);
 for(const x of [-.85,.66]){rod([x,1.91,-.51],[x,2.075,-.51],.02,chrome,group);rod([x,1.91,.51],[x,2.075,.51],.02,chrome,group);rod([x,2.075,-.57],[x,2.075,.57],.025,chrome,group)}
 const boardGroup=new THREE.Group();group.add(boardGroup);boardGroup.position.set(-.04,2.12,-.1);boardGroup.rotation.y=.06;
 const sp=[],sx=[];for(let i=0;i<=64;i++){const t=i/64,x=(t-.5)*2.53,w=.28*Math.pow(Math.sin(Math.PI*t),.62);for(let j=0;j<=12;j++){const a=j/12*6.28;sp.push(x,Math.sin(a)*.039*Math.pow(Math.sin(Math.PI*t),.42)+.095*Math.pow(Math.abs(t-.5)*2,4),Math.cos(a)*w);if(i<64&&j<12){const n=i*13+j;sx.push(n,n+13,n+1,n+1,n+13,n+14)}}}mesh(geom(sp,sx),cream,boardGroup);tube([[-1.19,.076,0],[-.8,.058,0],[0,.046,0],[.8,.065,0],[1.18,.1,0]],.023,terra,boardGroup,40,6);
 for(const x of [-.85,.66]){tube([[x,2.065,-.42],[x,2.12,-.34],[x,2.159,-.22],[x,2.16,-.08],[x,2.16,.09],[x,2.12,.18],[x,2.065,.32]],.011,trim,group,28,5);rounded(.039,.025,.047,.004,chrome,group,[x,2.16,-.20]);}
 // Fabric awning follows the same wind field as the palms and water.
 const fabric=standard('#ded6b5',.95);fabric.side=THREE.DoubleSide;fabric.colorNode=mix(color('#d8d4b2'),color('#a17462'),smoothstep(.88,.94,sin(positionLocal.x.mul(15)).abs())).mul(mx_noise_float(positionLocal.mul(130)).mul(.018).add(1));
 const awp=[],awi=[],awf=[];for(let i=0;i<=32;i++)for(let j=0;j<=16;j++){const u=i/32,v=j/16;awp.push(-1.24+u*2.13,1.91-v*.12-.04*Math.sin(v*Math.PI)*Math.sin(u*Math.PI)+.004*Math.sin(u*42)*Math.sin(v*Math.PI),.79+v*.62);awf.push(Math.sin(v*Math.PI)*Math.sin(u*Math.PI));if(i<32&&j<16){const n=i*17+j;awi.push(n,n+1,n+17,n+1,n+18,n+17)}}
 const awg=geom(awp,awi);awg.setAttribute('flex',new THREE.Float32BufferAttribute(awf,1));fabric.positionNode=positionLocal.add(vec3(0,sin(positionLocal.x.mul(3).add(U.time.mul(1.05))).mul(.011).mul(attribute('flex')).mul(U.breeze.add(.1)),0));const awning=mesh(awg,fabric,group);const hem=standard('#c7bea0',.94);for(const x of [-1.24,.89])tube([[x,1.91,.79],[x,1.85,1.10],[x,1.79,1.41]],.008,hem,group,18,5);rod([-1.24,1.790,1.41],[.89,1.790,1.41],.009,hem,group);
 for(const x of [-1.24,.89]){const z=1.41,wx=group.position.x+Math.cos(-.13)*x+Math.sin(-.13)*z,wz=group.position.z-Math.sin(-.13)*x+Math.cos(-.13)*z;rod([x,height(wx,wz)-group.position.y,1.41],[x,1.79,1.41],.017,chrome,group);}rod([-1.24,1.78,1.41],[.89,1.78,1.41],.018,chrome,group);
 const interiorLight=new THREE.PointLight('#ffcf8e',0,2.2,2);interiorLight.position.set(-.42,1.45,.20);group.add(interiorLight);interiorLight.castShadow=true;interiorLight.shadow.autoUpdate=false;interiorLight.shadow.needsUpdate=true;interiorLight.shadow.mapSize.set(256,256);interiorLight.shadow.camera.near=.035;interiorLight.shadow.bias=-.001;
 const ceiling=standard('#edce8e',.5);ceiling.emissive=new THREE.Color('#ffc981');ceiling.emissiveIntensity=.25;rounded(.3,.025,.16,.015,ceiling,group,[-.42,1.79,.05]);
 // One linen folding chair and a single lantern, on dry sand.
 const chair=new THREE.Group();chair.position.set(-.18,height(-.18,-2.08)+.014,-2.08);chair.rotation.y=-.28;scene.add(chair);
 const canvas=standard('#d4cbaa',.98);canvas.side=THREE.DoubleSide;
 const chairFoot=(x,z)=>{const wx=chair.position.x+Math.cos(-.28)*x+Math.sin(-.28)*z,wz=chair.position.z-Math.sin(-.28)*x+Math.cos(-.28)*z;return [x,height(wx,wz)-chair.position.y+.003,z];};
 for(const x of [-.23,.23]){rod(chairFoot(x,-.27),[x,.45,.25],.019,timber,chair);rod(chairFoot(x,.27),[x,.52,-.24],.019,timber,chair);rod([x,.37,-.18],[x,.94,-.35],.021,timber,chair);rod([x,.6,-.25],[x,.6,.23],.025,timber,chair)}
 mesh(geom([-.23,.40,-.19,.23,.40,-.19,-.23,.40,.22,.23,.40,.22],[0,2,1,1,2,3]),canvas,chair);mesh(geom([-.23,.46,-.20,.23,.46,-.20,-.23,.90,-.34,.23,.90,-.34],[0,2,1,1,2,3]),canvas,chair);
 const lantern=new THREE.Group();lantern.position.set(.48,height(.48,-1.83)-.006,-1.83);scene.add(lantern);mesh(new THREE.CylinderGeometry(.11,.13,.055,20),trim,lantern,[0,.04,0]);mesh(new THREE.CylinderGeometry(.095,.095,.22,16),glass,lantern,[0,.16,0]);mesh(new THREE.ConeGeometry(.14,.08,20),trim,lantern,[0,.31,0]);for(let i=0;i<4;i++){const a=i*1.57;rod([Math.cos(a)*.101,.045,Math.sin(a)*.101],[Math.cos(a)*.101,.29,Math.sin(a)*.101],.009,trim,lantern)}
 const glow=standard('#f0cfa0',.5);glow.emissive=new THREE.Color('#ffc079');glow.emissiveIntensity=.25;mesh(new THREE.CylinderGeometry(.037,.04,.13,12),glow,lantern,[0,.14,0]);tube([[-.10,.33,0],[-.07,.45,0],[.07,.45,0],[.10,.33,0]],.009,trim,lantern,18,5);
 const lanternLight=new THREE.PointLight('#ffc37d',0,2.1,2);lanternLight.position.set(0,.26,0);lantern.add(lanternLight);
 return {group,hinge,interiorLight,lanternLight,ceiling,glow,doorTarget:0,awning,glass,chair,lantern};
}
