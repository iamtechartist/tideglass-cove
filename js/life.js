import {THREE,U,geom,mesh,rand,height,standard,tube} from './core.js';
import {mergeActorParts} from './optimize.js';
import {projectEnvironment,projectCapsule,projectEllipsoid,reefColliders} from './collision.js';
import {positionLocal,sin,abs,float,vec3,positionWorld,mix,color,smoothstep,mx_noise_float,uv,pow,max} from 'three/tsl';
export function buildLife(scene){
 const group=new THREE.Group();scene.add(group);group.name='Lagoon life';group.userData.dynamic=true;
 const ray=new THREE.Group();group.add(ray);ray.userData.dynamic=true;
 const rayMat=standard('#697e77',.73);rayMat.side=THREE.DoubleSide;rayMat.colorNode=mix(color('#b2beb0'),color('#607a73'),smoothstep(-.035,.018,positionLocal.y)).mul(mx_noise_float(positionLocal.mul(61)).mul(.055).add(1));
 const rayMotion=positionLocal.add(vec3(0,sin(U.time.mul(2.1).sub(abs(positionLocal.x).mul(4.5)).add(positionLocal.z.mul(2))).mul(abs(positionLocal.x).pow(1.8)).mul(.19),0));rayMat.positionNode=rayMotion;
 const p=[],ix=[],w=36,l=34,stride=(w+1)*(l+1);
 for(const side of [1,-1])for(let i=0;i<=l;i++){const t=i/l,z=-.43+t*.96,width=.59*Math.pow(Math.sin(Math.PI*t),.80)*(1.07-.35*t);for(let j=0;j<=w;j++){const u=j/w*2-1,x=width*u,root=Math.exp(-Math.pow(x/.165,2))*Math.sin(t*Math.PI),thickness=Math.sin(t*Math.PI)*Math.pow(Math.max(0,1-u*u),.70),y=side>0?.016*thickness+.082*root:-.015*thickness-.034*root;p.push(x,y,z+.13*Math.pow(Math.abs(u),1.6));if(i<l&&j<w){const n=(side<0?stride:0)+i*(w+1)+j;const face=[n,n+w+1,n+1,n+1,n+w+1,n+w+2];ix.push(...(side>0?face:face.reverse()));}}}
 mesh(geom(p,ix),rayMat,ray);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.005,.39),new THREE.Vector3(.035,-.008,.70),new THREE.Vector3(.09,-.01,1.02),new THREE.Vector3(.19,.02,1.36)]),tp=[],ti=[];
 for(let i=0;i<=38;i++){const t=i/38,c=curve.getPoint(t),r=.017*Math.pow(1-t,1.4)+.0009;for(let j=0;j<=8;j++){const a=j/8*Math.PI*2;tp.push(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r,c.z);if(i<38&&j<8){const n=i*9+j;ti.push(n,n+9,n+1,n+1,n+9,n+10);}}}mesh(geom(tp,ti),rayMat,ray);
 const eye=standard('#263c37',.42);for(const x of [-.064,.064]){mesh(new THREE.SphereGeometry(.027,12,8),rayMat,ray,[x,.065,-.256]).scale.set(1,.40,1.6);mesh(new THREE.SphereGeometry(.011,9,6),eye,ray,[x,.078,-.264]);}
 mergeActorParts(ray);
 // Transparent shadow is projected onto the actual local sand shelf.
 const shadowMaterial=new THREE.MeshBasicNodeMaterial({color:'#20433d',transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide});const shadow=mesh(new THREE.CircleGeometry(.47,36),shadowMaterial,group);shadow.userData.noPick=true;shadowMaterial.opacityNode=pow(max(float(1).sub(uv().sub(.5).length().mul(2)),0),1.5).mul(.14);shadow.rotation.x=-Math.PI/2;shadow.scale.set(.9,1.2,1);shadow.castShadow=false;shadow.receiveShadow=false;
 const fish=[];const fishMats=[standard('#85a49b',.49,.02),standard('#b0bba1',.52,.02),standard('#789ca8',.48,.02)];
 for(let j=0;j<10;j++){
  const f=new THREE.Group();group.add(f);const mat=fishMats[j%3],size=.054+rand()*.024;const fp=[],fi=[],rows=24,segments=14;for(let i=0;i<=rows;i++){const t=i/rows,z=size*(-2.2+t*4.30),width=size*(.55*Math.pow(Math.sin(t*Math.PI),.72)*(1.15-.45*t)+.06*t);for(let k=0;k<=segments;k++){const a=k/segments*Math.PI*2;fp.push(Math.cos(a)*width,Math.sin(a)*width*1.48,z);if(i<rows&&k<segments){const n=i*(segments+1)+k;fi.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}}}mesh(geom(fp,fi),mat,f);
  const ts=new THREE.Shape();ts.moveTo(0,0);ts.bezierCurveTo(size*.33,size*.47,size*.70,size*.90,size*1.16,size*1.09);ts.quadraticCurveTo(size*.93,0,size*1.16,-size*1.09);ts.bezierCurveTo(size*.60,-size*.84,size*.25,-size*.26,0,0);const tg=new THREE.ExtrudeGeometry(ts,{depth:.0018,bevelEnabled:false,curveSegments:10});tg.rotateY(-Math.PI/2);const tailMesh=mesh(tg,mat,f,[0,0,size*2.05]);mat.side=THREE.DoubleSide;
  mesh(geom([0,size*.60,-size*.5,0,size*1.22,size*.54,0,size*.65,size*1.2],[0,1,2]),mat,f);
  for(const x of [-size*.43,size*.43])mesh(new THREE.SphereGeometry(.012,6,4),eye,f,[x,size*.15,-size*1.5]);
  mergeActorParts(f,[tailMesh]);f.position.set(-2.0+(j%5)*.52,-.59-(j%2)*.10,1.75+Math.floor(j/5)*.55);fish.push({group:f,tail:tailMesh,phase:rand()*6.28,size,radius:size*3.3,heading:0,speed:0,velocity:new THREE.Vector3(),goal:new THREE.Vector3()});
 }
 const traces=[];const bioMat=new THREE.MeshBasicNodeMaterial({color:'#8ee8dc',transparent:true,opacity:0,depthWrite:false});
 for(let i=0;i<10;i++){const trail=mesh(new THREE.SphereGeometry(.019,6,4),bioMat.clone(),group);trail.scale.set(.5,.5,3);trail.castShadow=false;traces.push(trail)}
 let previous=0,contacts=0,minClearance=1;
 const target=new THREE.Vector3(),sep=new THREE.Vector3();
 function solveSchool(t,dt,dolphins){
  for(let j=0;j<fish.length;j++){
   const f=fish[j],p=f.group.position,a=t*.14;target.set(-.65+Math.sin(a)*1.05+Math.sin(j*2.4)*.62,-.58-Math.sin(j*1.3)**2*.22+Math.sin(t*.47+j)*.035+U.tide.value*.6,2.03+Math.sin(a*.71+1)*.38+Math.cos(j*2)*.65);
   const desired=target.sub(p).multiplyScalar(.55);sep.set(0,0,0);
   for(const other of fish){if(other===f)continue;const future=p.clone().addScaledVector(f.velocity,.36).sub(other.group.position.clone().addScaledVector(other.velocity,.36)),d=future.length(),safe=f.radius+other.radius+.18;if(d<safe&&d>.0001)sep.addScaledVector(future,(safe-d)/(d*safe)*1.4);}
   desired.add(sep);if(desired.length()>.43)desired.setLength(.43);const yaw=Math.atan2(-desired.x,-desired.z),turn=Math.atan2(Math.sin(yaw-f.heading),Math.cos(yaw-f.heading));f.heading+=Math.max(-2.3*dt,Math.min(2.3*dt,turn));f.speed+=(desired.length()*Math.max(.14,Math.cos(turn))-f.speed)*(1-Math.exp(-dt*3));f.velocity.set(-Math.sin(f.heading)*f.speed,desired.y,-Math.cos(f.heading)*f.speed);p.addScaledVector(f.velocity,dt);
  }
  for(let iteration=0;iteration<5;iteration++){
   for(let i=0;i<fish.length;i++)for(let j=i+1;j<fish.length;j++){const a=fish[i],b=fish[j],delta=a.group.position.clone().sub(b.group.position),d=delta.length(),safe=a.radius+b.radius+.03;if(d<safe){if(d<.00001)delta.set(1,0,0);else delta.divideScalar(d);const correction=(safe-d)*.502;a.group.position.addScaledVector(delta,correction);b.group.position.addScaledVector(delta,-correction);const approach=a.velocity.clone().sub(b.velocity).dot(delta);if(approach<0){a.velocity.addScaledVector(delta,-approach*.5);b.velocity.addScaledVector(delta,approach*.5);}contacts++;}}
   for(const f of fish){projectEnvironment(f.group.position,f.radius,t);for(const d of dolphins)projectCapsule(f.group.position,d,.26,f.radius);projectEllipsoid(f.group.position,ray.position,new THREE.Vector3(.64,.13,.79),f.radius);}
  }
  minClearance=Infinity;for(let i=0;i<fish.length;i++)for(let j=i+1;j<fish.length;j++)minClearance=Math.min(minClearance,fish[i].group.position.distanceTo(fish[j].group.position)-fish[i].radius-fish[j].radius);
 }
 function update(t,dolphins=[]){
  const a=t*.16;const x=.60+Math.sin(a)*1.25,z=2.58+Math.sin(a*.78+.4)*.48;ray.position.set(x,-.91+Math.sin(a*1.3)*.08+U.tide.value*.25,z);projectEnvironment(ray.position,.15,t);for(const d of dolphins)projectCapsule(ray.position,d,.26,.34);const vx=Math.cos(a)*1.25,vz=Math.cos(a*.78+.4)*.48*.78;ray.rotation.y=Math.atan2(-vx,-vz);ray.rotation.z=Math.sin(a+.5)*.075;
  shadow.position.set(ray.position.x,height(ray.position.x,ray.position.z)+.024,ray.position.z);shadow.rotation.z=-ray.rotation.y;shadowMaterial.opacity=.12;
  const delta=Math.min(.05,Math.max(0,t-previous));previous=t;const steps=Math.max(1,Math.ceil(delta/(1/90)));for(let i=0;i<steps;i++)solveSchool(t,delta/steps,dolphins);
  fish.forEach((f,j)=>{f.group.rotation.y=f.heading;f.tail.rotation.y=Math.sin(t*5+j)*.23;f.group.rotation.z=Math.sin(t*.7+j)*.035;const tr=traces[j];tr.position.copy(f.group.position).addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(f.group.quaternion),f.size*3.4);tr.rotation.copy(f.group.rotation);const pulse=Math.max(0,Math.sin(t*.74+j*1.9)-.90)*10;tr.material.opacity=U.night.value*pulse*.15;tr.visible=tr.material.opacity>.002;});

 }
 for(let i=0;i<40;i++)solveSchool(0,1/90,[]);

 update(0);return {ray,fish,update,shadow,info:()=>({minimumFishClearance:minClearance,contactsResolved:contacts})};
}
